import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  ACTION_CARDS,
  actionDef,
  GOAL_GOLD,
  GOAL_STONE,
  GOLD_CARDS,
  handSize,
  isBrokenTool,
  isPathCard,
  isRepairTool,
  PATH_CARDS,
  saboteurCount,
  saboteurGoldTarget,
} from "./gameData";
import {
  buildBoard,
  GOAL_POSITIONS,
  reachedGoalIndexes,
  START_POSITION,
  validatePlacement,
} from "./gameLogic";

const ROUND_END_DELAY_MS = 12_000;

type Team = "miners" | "saboteurs";

// ── helpers ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadPlayersInOrder(
  ctx: MutationCtx | QueryCtx,
  playerOrder: Id<"players">[],
): Promise<(Doc<"players"> | null)[]> {
  return await Promise.all(playerOrder.map((id) => ctx.db.get(id)));
}

async function handCount(
  ctx: MutationCtx,
  gameId: Id<"games">,
  playerId: Id<"players">,
): Promise<number> {
  const cards = await ctx.db
    .query("gameCards")
    .withIndex("by_gameId_and_assignedTo", (q) => q.eq("gameId", gameId).eq("assignedTo", playerId))
    .collect();
  return cards.filter((c) => (c.type === "tunnel" || c.type === "action") && c.inFront !== true)
    .length;
}

async function activeGame(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<"rooms">,
): Promise<Doc<"games"> | null> {
  return await ctx.db
    .query("games")
    .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
    .order("desc")
    .first();
}

// Create every card for a fresh round, deal hands, assign roles, lay the board.
async function dealRound(
  ctx: MutationCtx,
  gameId: Id<"games">,
  settings: Doc<"rooms">["settings"],
  players: Doc<"players">[],
  round: number,
  startingIndex: number,
  opts: { createGold: boolean; existingGoldDeck?: Id<"gameCards">[] },
): Promise<void> {
  const game = await ctx.db.get(gameId);
  if (!game) throw new Error("GAME_NOT_FOUND");
  const n = players.length;

  // Roles
  const sabs = saboteurCount(n);
  const roles = shuffle([
    ...Array<"saboteur">(sabs).fill("saboteur"),
    ...Array<"miner">(n - sabs).fill("miner"),
  ]);
  for (let i = 0; i < n; i++) {
    await ctx.db.insert("gameCards", {
      gameId,
      type: "role",
      subtype: roles[i],
      assignedTo: players[i]._id,
      revealed: false,
    });
    await ctx.db.patch(players[i]._id, {
      role: roles[i],
      brokenTools: [],
      peekedGoalIndexes: [],
      // gold (goldNuggetCardIds / totalGold) is preserved across rounds
    });
  }

  // Start card
  const startCardId = await ctx.db.insert("gameCards", {
    gameId,
    type: "tunnel",
    subtype: "start",
    assignedTo: null,
    revealed: true,
  });
  const boardPlacements = [
    { cardId: startCardId, x: START_POSITION.x, y: START_POSITION.y, flipped: false },
  ];

  // Goal cards: 1 gold + 2 stone, shuffled into the three fixed positions
  const goalSubtypes = shuffle([GOAL_GOLD, GOAL_STONE, GOAL_STONE]);
  const goalCardIds: Id<"gameCards">[] = [];
  for (const subtype of goalSubtypes) {
    const id = await ctx.db.insert("gameCards", {
      gameId,
      type: "tunnel",
      subtype,
      assignedTo: null,
      revealed: false,
    });
    goalCardIds.push(id);
  }

  // Draw deck: path cards + action cards
  const deckIds: Id<"gameCards">[] = [];
  for (const def of PATH_CARDS) {
    for (let i = 0; i < def.count; i++) {
      deckIds.push(
        await ctx.db.insert("gameCards", {
          gameId,
          type: "tunnel",
          subtype: def.subtype,
          assignedTo: null,
          revealed: false,
        }),
      );
    }
  }
  for (const def of ACTION_CARDS) {
    for (let i = 0; i < def.count; i++) {
      deckIds.push(
        await ctx.db.insert("gameCards", {
          gameId,
          type: "action",
          subtype: def.subtype,
          assignedTo: null,
          revealed: false,
        }),
      );
    }
  }
  const deck = shuffle(deckIds);

  // Deal hands (drawing from the top = end of the deck array)
  const hs = handSize(n);
  for (const player of players) {
    for (let i = 0; i < hs; i++) {
      const cardId = deck.pop();
      if (!cardId) break;
      await ctx.db.patch(cardId, { assignedTo: player._id });
    }
  }

  // Gold deck (created once, persists across rounds)
  let goldDeck: Id<"gameCards">[];
  if (opts.createGold) {
    const goldIds: Id<"gameCards">[] = [];
    for (const def of GOLD_CARDS) {
      for (let i = 0; i < def.count; i++) {
        goldIds.push(
          await ctx.db.insert("gameCards", {
            gameId,
            type: "gold",
            subtype: `gold_${def.value}`,
            assignedTo: null,
            revealed: false,
            value: def.value,
          }),
        );
      }
    }
    goldDeck = shuffle(goldIds);
  } else {
    goldDeck = opts.existingGoldDeck ?? [];
  }

  const newSerial = game.turnSerial + 1;
  const turnDeadline = Date.now() + settings.turnTimeLimitSeconds * 1000;

  await ctx.db.patch(gameId, {
    round,
    playerOrder: players.map((p) => p._id),
    currentPlayerIndex: startingIndex,
    lastPlayerIndex: startingIndex,
    turnSerial: newSerial,
    turnDeadline,
    deckCardIds: deck,
    discardPileCardIds: [],
    goldDeckCardIds: goldDeck,
    boardPlacements,
    goalCardIds,
    status: "playing",
    roundResult: undefined,
  });

  await ctx.scheduler.runAfter(settings.turnTimeLimitSeconds * 1000, internal.games.turnTimeout, {
    gameId,
    turnSerial: newSerial,
  });
}

// Award gold when the miners win.
async function distributeMinerGold(
  ctx: MutationCtx,
  players: (Doc<"players"> | null)[],
  finderIndex: number,
  penaltyEnabled: boolean,
  goldDeck: Id<"gameCards">[],
): Promise<Id<"gameCards">[]> {
  const n = players.length;
  const numDraw = Math.min(n, goldDeck.length);

  const order: Doc<"players">[] = [];
  for (let step = 0; step < n; step++) {
    const p = players[(finderIndex + step) % n];
    if (!p || p.role !== "miner") continue;
    if (penaltyEnabled && (p.brokenTools ?? []).length > 0) continue;
    order.push(p);
  }
  if (order.length === 0 || numDraw === 0) return goldDeck;

  const drawn = goldDeck.slice(0, numDraw);
  const remaining = goldDeck.slice(numDraw);
  for (let i = 0; i < drawn.length; i++) {
    const cardId = drawn[i];
    const card = await ctx.db.get(cardId);
    const value = card?.value ?? 0;
    const miner = order[i % order.length];
    miner.goldNuggetCardIds = [...(miner.goldNuggetCardIds ?? []), cardId];
    miner.totalGold = (miner.totalGold ?? 0) + value;
    await ctx.db.patch(cardId, { assignedTo: miner._id });
    await ctx.db.patch(miner._id, {
      goldNuggetCardIds: miner.goldNuggetCardIds,
      totalGold: miner.totalGold,
    });
  }
  return remaining;
}

// Award gold when the saboteurs win.
async function distributeSaboteurGold(
  ctx: MutationCtx,
  players: (Doc<"players"> | null)[],
  goldDeck: Id<"gameCards">[],
): Promise<Id<"gameCards">[]> {
  const sabs = players.filter((p): p is Doc<"players"> => p?.role === "saboteur");
  if (sabs.length === 0) return goldDeck;
  const target = saboteurGoldTarget(sabs.length);

  const pool: { id: Id<"gameCards">; value: number }[] = [];
  for (const id of goldDeck) {
    const c = await ctx.db.get(id);
    if (c) pool.push({ id, value: c.value ?? 0 });
  }

  for (const sab of sabs) {
    let remaining = target;
    while (remaining > 0) {
      // pick the largest nugget that does not overshoot the target
      let bestIdx = -1;
      let bestVal = 0;
      for (let i = 0; i < pool.length; i++) {
        const val = pool[i].value;
        if (val <= remaining && val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      const picked = pool.splice(bestIdx, 1)[0];
      sab.goldNuggetCardIds = [...(sab.goldNuggetCardIds ?? []), picked.id];
      sab.totalGold = (sab.totalGold ?? 0) + picked.value;
      await ctx.db.patch(picked.id, { assignedTo: sab._id });
      await ctx.db.patch(sab._id, {
        goldNuggetCardIds: sab.goldNuggetCardIds,
        totalGold: sab.totalGold,
      });
      remaining -= picked.value;
    }
  }
  return pool.map((p) => p.id);
}

async function concludeRound(
  ctx: MutationCtx,
  gameId: Id<"games">,
  players: (Doc<"players"> | null)[],
  winningTeam: Team,
  finderIndex: number,
  penaltyEnabled: boolean,
  goldDeck: Id<"gameCards">[],
): Promise<Id<"gameCards">[]> {
  // Reveal all role cards.
  const roleCards = await ctx.db
    .query("gameCards")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
  for (const c of roleCards) {
    if (c.type === "role" && !c.revealed) await ctx.db.patch(c._id, { revealed: true });
  }

  if (winningTeam === "miners") {
    return await distributeMinerGold(ctx, players, finderIndex, penaltyEnabled, goldDeck);
  }
  return await distributeSaboteurGold(ctx, players, goldDeck);
}

// Shared tail for every move: draw a replacement, advance the turn, detect round
// end, persist the game, and schedule the next timeout.
async function finalizeMove(
  ctx: MutationCtx,
  gameId: Id<"games">,
  locals: {
    deck: Id<"gameCards">[];
    discard: Id<"gameCards">[];
    board: Doc<"games">["boardPlacements"];
    goldDeck: Id<"gameCards">[];
    goldWin: boolean;
  },
): Promise<void> {
  const game = await ctx.db.get(gameId);
  if (!game) throw new Error("GAME_NOT_FOUND");
  const room = await ctx.db.get(game.roomId);
  if (!room) throw new Error("ROOM_NOT_FOUND");
  const players = await loadPlayersInOrder(ctx, game.playerOrder);
  const n = game.playerOrder.length;
  const callerIndex = game.currentPlayerIndex;
  const callerId = game.playerOrder[callerIndex];

  const deck = locals.deck;
  let goldDeckFinal = locals.goldDeck;

  // Draw a replacement card for the player who just acted.
  if (deck.length > 0) {
    const id = deck.pop()!;
    await ctx.db.patch(id, { assignedTo: callerId, revealed: false });
  }

  let roundEnded = false;
  let winningTeam: Team | undefined;
  let reason: "gold_reached" | "blocked" | undefined;
  let newCurrent = callerIndex;

  if (locals.goldWin) {
    roundEnded = true;
    winningTeam = "miners";
    reason = "gold_reached";
    goldDeckFinal = await concludeRound(
      ctx,
      gameId,
      players,
      "miners",
      callerIndex,
      room.settings.enableBrokenToolPenalty,
      goldDeckFinal,
    );
  } else {
    const counts = await Promise.all(game.playerOrder.map((id) => handCount(ctx, gameId, id)));
    let next = -1;
    for (let step = 1; step <= n; step++) {
      const idx = (callerIndex + step) % n;
      if (counts[idx] > 0) {
        next = idx;
        break;
      }
    }
    if (next === -1) {
      // No player can act and the deck is exhausted — saboteurs win.
      roundEnded = true;
      winningTeam = "saboteurs";
      reason = "blocked";
      goldDeckFinal = await concludeRound(
        ctx,
        gameId,
        players,
        "saboteurs",
        callerIndex,
        room.settings.enableBrokenToolPenalty,
        goldDeckFinal,
      );
    } else {
      newCurrent = next;
    }
  }

  const newSerial = game.turnSerial + 1;
  const turnDeadline = Date.now() + room.settings.turnTimeLimitSeconds * 1000;

  await ctx.db.patch(gameId, {
    deckCardIds: deck,
    discardPileCardIds: locals.discard,
    boardPlacements: locals.board,
    goldDeckCardIds: goldDeckFinal,
    currentPlayerIndex: roundEnded ? callerIndex : newCurrent,
    lastPlayerIndex: callerIndex,
    turnSerial: newSerial,
    turnDeadline: roundEnded ? game.turnDeadline : turnDeadline,
    status: roundEnded ? "round_end" : "playing",
    roundResult: roundEnded && winningTeam && reason ? { winningTeam, reason } : undefined,
  });

  if (roundEnded) {
    await ctx.scheduler.runAfter(ROUND_END_DELAY_MS, internal.games.proceedAfterRoundEnd, {
      gameId,
      round: game.round,
    });
  } else {
    await ctx.scheduler.runAfter(
      room.settings.turnTimeLimitSeconds * 1000,
      internal.games.turnTimeout,
      { gameId, turnSerial: newSerial },
    );
  }
}

// ── mutations ────────────────────────────────────────────────────────────────

export const startGame = mutation({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostSessionId !== args.sessionId) throw new Error("NOT_HOST");
    if (room.status !== "waiting") throw new Error("ALREADY_STARTED");

    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .collect();
    if (players.length < 3) throw new Error("NOT_ENOUGH_PLAYERS");
    if (players.length > 10) throw new Error("TOO_MANY_PLAYERS");

    await ctx.db.patch(room._id, { status: "playing" });

    const gameId = await ctx.db.insert("games", {
      roomId: room._id,
      round: 1,
      playerOrder: players.map((p) => p._id),
      currentPlayerIndex: 0,
      lastPlayerIndex: 0,
      turnSerial: 0,
      turnDeadline: 0,
      deckCardIds: [],
      discardPileCardIds: [],
      goldDeckCardIds: [],
      boardPlacements: [],
      goalCardIds: [],
      status: "playing",
    });

    const startingIndex = Math.floor(Math.random() * players.length);
    await dealRound(ctx, gameId, room.settings, players, 1, startingIndex, {
      createGold: true,
    });

    return { gameId };
  },
});

const moveValidator = v.union(
  v.object({
    kind: v.literal("place"),
    cardId: v.id("gameCards"),
    x: v.number(),
    y: v.number(),
    flipped: v.boolean(),
  }),
  v.object({
    kind: v.literal("broken"),
    cardId: v.id("gameCards"),
    targetPlayerId: v.id("players"),
  }),
  v.object({
    kind: v.literal("repair"),
    cardId: v.id("gameCards"),
    targetPlayerId: v.id("players"),
    tool: v.string(),
  }),
  v.object({
    kind: v.literal("rockfall"),
    cardId: v.id("gameCards"),
    x: v.number(),
    y: v.number(),
  }),
  v.object({ kind: v.literal("map"), cardId: v.id("gameCards"), goalIndex: v.number() }),
  v.object({ kind: v.literal("pass"), cardId: v.id("gameCards") }),
);

export const playCard = mutation({
  args: { sessionId: v.string(), code: v.string(), move: moveValidator },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) throw new Error("ROOM_NOT_FOUND");

    const game = await activeGame(ctx, room._id);
    if (!game || game.status !== "playing") throw new Error("GAME_NOT_PLAYING");

    const caller = await ctx.db
      .query("players")
      .withIndex("by_roomId_and_sessionId", (q) =>
        q.eq("roomId", room._id).eq("sessionId", args.sessionId),
      )
      .unique();
    if (!caller) throw new Error("NOT_IN_GAME");
    if (game.playerOrder[game.currentPlayerIndex] !== caller._id) {
      throw new Error("NOT_YOUR_TURN");
    }

    const card = await ctx.db.get(args.move.cardId);
    if (
      !card ||
      card.gameId !== game._id ||
      card.assignedTo !== caller._id ||
      card.inFront === true ||
      (card.type !== "tunnel" && card.type !== "action")
    ) {
      throw new Error("CARD_NOT_IN_HAND");
    }

    // Snapshot all cards for subtype lookups.
    const allCards = await ctx.db
      .query("gameCards")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();
    const cardMap = new Map(allCards.map((c) => [c._id, c]));

    const deck = [...game.deckCardIds];
    const discard = [...game.discardPileCardIds];
    const board = [...game.boardPlacements];
    const goldDeck = [...game.goldDeckCardIds];
    let goldWin = false;

    const move = args.move;
    switch (move.kind) {
      case "place": {
        if (!isPathCard(card.subtype)) throw new Error("INVALID_CARD_FOR_PLACE");
        if ((caller.brokenTools ?? []).length > 0) throw new Error("HAS_BROKEN_TOOL");

        const existing = game.boardPlacements.map((p) => ({
          subtype: cardMap.get(p.cardId)?.subtype ?? "start",
          x: p.x,
          y: p.y,
          flipped: p.flipped,
        }));
        const goalSubtypes = game.goalCardIds.map((id) => cardMap.get(id)?.subtype ?? GOAL_STONE);

        const err = validatePlacement(
          buildBoard(existing, goalSubtypes),
          card.subtype,
          move.flipped,
          move.x,
          move.y,
        );
        if (err) throw new Error(err);

        board.push({ cardId: card._id, x: move.x, y: move.y, flipped: move.flipped });
        await ctx.db.patch(card._id, { assignedTo: null });

        const newBoard = buildBoard(
          [...existing, { subtype: card.subtype, x: move.x, y: move.y, flipped: move.flipped }],
          goalSubtypes,
        );
        const reached = reachedGoalIndexes(newBoard);
        for (const gi of reached) {
          const gid = game.goalCardIds[gi];
          const gc = cardMap.get(gid);
          if (gc && !gc.revealed) await ctx.db.patch(gid, { revealed: true });
        }
        const goldIndex = goalSubtypes.findIndex((s) => s === GOAL_GOLD);
        goldWin = goldIndex !== -1 && reached.includes(goldIndex);
        break;
      }

      case "broken": {
        if (!isBrokenTool(card.subtype)) throw new Error("INVALID_CARD");
        const tool = actionDef(card.subtype)?.tools?.[0];
        if (!tool) throw new Error("INVALID_CARD");
        const target = await ctx.db.get(move.targetPlayerId);
        if (!target || target.roomId !== room._id) throw new Error("INVALID_TARGET");
        const tBroken = target.brokenTools ?? [];
        if (tBroken.includes(tool)) throw new Error("ALREADY_BROKEN");
        if (tBroken.length >= 3) throw new Error("MAX_BROKEN_TOOLS");
        await ctx.db.patch(target._id, { brokenTools: [...tBroken, tool] });
        await ctx.db.patch(card._id, { assignedTo: target._id, inFront: true, revealed: true });
        break;
      }

      case "repair": {
        if (!isRepairTool(card.subtype)) throw new Error("INVALID_CARD");
        const tools = actionDef(card.subtype)?.tools ?? [];
        if (!tools.includes(move.tool)) throw new Error("CANNOT_FIX_TOOL");
        const target = await ctx.db.get(move.targetPlayerId);
        if (!target || target.roomId !== room._id) throw new Error("INVALID_TARGET");
        const tBroken = target.brokenTools ?? [];
        if (!tBroken.includes(move.tool)) throw new Error("NOT_BROKEN");
        await ctx.db.patch(target._id, {
          brokenTools: tBroken.filter((t) => t !== move.tool),
        });
        const brokenSubtype = `broken_${move.tool}`;
        const front = await ctx.db
          .query("gameCards")
          .withIndex("by_gameId_and_assignedTo", (q) =>
            q.eq("gameId", game._id).eq("assignedTo", target._id),
          )
          .collect();
        const brokenCard = front.find((c) => c.inFront === true && c.subtype === brokenSubtype);
        if (brokenCard) {
          await ctx.db.patch(brokenCard._id, {
            assignedTo: null,
            inFront: false,
            revealed: true,
          });
          discard.push(brokenCard._id);
        }
        await ctx.db.patch(card._id, { assignedTo: null, revealed: true });
        discard.push(card._id);
        break;
      }

      case "rockfall": {
        if (card.subtype !== "rockfall") throw new Error("INVALID_CARD");
        const idx = board.findIndex((p) => p.x === move.x && p.y === move.y);
        if (idx === -1) throw new Error("NO_CARD_THERE");
        const targetPlacement = board[idx];
        const tc = cardMap.get(targetPlacement.cardId);
        if (tc?.subtype === "start") throw new Error("CANNOT_REMOVE_START");
        board.splice(idx, 1);
        await ctx.db.patch(targetPlacement.cardId, { assignedTo: null, revealed: false });
        discard.push(targetPlacement.cardId);
        await ctx.db.patch(card._id, { assignedTo: null, revealed: true });
        discard.push(card._id);
        break;
      }

      case "map": {
        if (card.subtype !== "map") throw new Error("INVALID_CARD");
        if (move.goalIndex < 0 || move.goalIndex > 2) throw new Error("BAD_GOAL_INDEX");
        const peeks = caller.peekedGoalIndexes ?? [];
        if (!peeks.includes(move.goalIndex)) {
          await ctx.db.patch(caller._id, { peekedGoalIndexes: [...peeks, move.goalIndex] });
        }
        await ctx.db.patch(card._id, { assignedTo: null, revealed: true });
        discard.push(card._id);
        break;
      }

      case "pass": {
        await ctx.db.patch(card._id, { assignedTo: null, revealed: false });
        discard.push(card._id);
        break;
      }
    }

    await finalizeMove(ctx, game._id, { deck, discard, board, goldDeck, goldWin });
    return null;
  },
});

// Auto-pass the current player when their turn timer runs out.
export const turnTimeout = internalMutation({
  args: { gameId: v.id("games"), turnSerial: v.number() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "playing" || game.turnSerial !== args.turnSerial) return;

    const callerId = game.playerOrder[game.currentPlayerIndex];
    const discard = [...game.discardPileCardIds];

    const cards = await ctx.db
      .query("gameCards")
      .withIndex("by_gameId_and_assignedTo", (q) =>
        q.eq("gameId", game._id).eq("assignedTo", callerId),
      )
      .collect();
    const hand = cards.filter(
      (c) => (c.type === "tunnel" || c.type === "action") && c.inFront !== true,
    );
    if (hand.length > 0) {
      await ctx.db.patch(hand[0]._id, { assignedTo: null, revealed: false });
      discard.push(hand[0]._id);
    }

    await finalizeMove(ctx, game._id, {
      deck: [...game.deckCardIds],
      discard,
      board: [...game.boardPlacements],
      goldDeck: [...game.goldDeckCardIds],
      goldWin: false,
    });
  },
});

// Move from round_end into the next round (or finish the game).
async function proceedRound(ctx: MutationCtx, gameId: Id<"games">): Promise<void> {
  const game = await ctx.db.get(gameId);
  if (!game || game.status !== "round_end") return;
  const room = await ctx.db.get(game.roomId);
  if (!room) return;

  if (game.round >= room.settings.numberOfRounds) {
    await ctx.db.patch(gameId, { status: "finished" });
    return;
  }

  // Delete this round's tunnel/action/role cards; keep gold cards & winnings.
  const cards = await ctx.db
    .query("gameCards")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
  for (const c of cards) {
    if (c.type === "tunnel" || c.type === "action" || c.type === "role") {
      await ctx.db.delete(c._id);
    }
  }

  const players = (await loadPlayersInOrder(ctx, game.playerOrder)).filter(
    (p): p is Doc<"players"> => p !== null,
  );
  if (players.length < 3) {
    // Not enough players remain to continue — end the game.
    await ctx.db.patch(gameId, { status: "finished" });
    return;
  }
  const startingIndex = (game.lastPlayerIndex + 1) % players.length;
  await dealRound(ctx, gameId, room.settings, players, game.round + 1, startingIndex, {
    createGold: false,
    existingGoldDeck: game.goldDeckCardIds,
  });
}

export const proceedAfterRoundEnd = internalMutation({
  args: { gameId: v.id("games"), round: v.number() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.round !== args.round || game.status !== "round_end") return;
    await proceedRound(ctx, args.gameId);
  },
});

// Host may skip the round-end delay.
export const continueGame = mutation({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostSessionId !== args.sessionId) throw new Error("NOT_HOST");
    const game = await activeGame(ctx, room._id);
    if (!game) throw new Error("NO_GAME");
    await proceedRound(ctx, game._id);
    return null;
  },
});

// Host returns a finished game back to the lobby for a rematch.
export const returnToLobby = mutation({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostSessionId !== args.sessionId) throw new Error("NOT_HOST");

    const game = await activeGame(ctx, room._id);
    if (game) {
      const cards = await ctx.db
        .query("gameCards")
        .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
        .collect();
      for (const c of cards) await ctx.db.delete(c._id);
      await ctx.db.delete(game._id);
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .collect();
    for (const p of players) {
      await ctx.db.patch(p._id, {
        role: undefined,
        brokenTools: undefined,
        goldNuggetCardIds: undefined,
        totalGold: undefined,
        peekedGoalIndexes: undefined,
      });
    }

    await ctx.db.patch(room._id, { status: "waiting" });
    return null;
  },
});

// ── queries ────────────────────────────────────────────────────────────────

// Public, sanitized game state — never leaks roles (during play), hidden goal
// faces, hand contents, gold values, or sessionId.
export const getGameState = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) return null;

    const game = await activeGame(ctx, room._id);
    if (!game) return null;

    const allCards = await ctx.db
      .query("gameCards")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();
    const cardMap = new Map(allCards.map((c) => [c._id, c]));

    const players = await loadPlayersInOrder(ctx, game.playerOrder);
    const rolesRevealed = game.status !== "playing";
    const goldRevealed = game.status === "finished";

    const playersPublic = players.map((p, index) => {
      if (!p) {
        return {
          _id: game.playerOrder[index],
          nickname: "—",
          avatarId: 1,
          isHost: false,
          handCount: 0,
          brokenTools: [] as string[],
          role: null as "miner" | "saboteur" | null,
          totalGold: null as number | null,
        };
      }
      const handCount = allCards.filter(
        (c) =>
          c.assignedTo === p._id &&
          (c.type === "tunnel" || c.type === "action") &&
          c.inFront !== true,
      ).length;
      return {
        _id: p._id,
        nickname: p.nickname,
        avatarId: p.avatarId,
        isHost: p.isHost,
        handCount,
        brokenTools: p.brokenTools ?? [],
        role: rolesRevealed ? (p.role ?? null) : null,
        totalGold: goldRevealed ? (p.totalGold ?? 0) : null,
      };
    });

    const board = game.boardPlacements.map((pl) => ({
      x: pl.x,
      y: pl.y,
      flipped: pl.flipped,
      subtype: cardMap.get(pl.cardId)?.subtype ?? "start",
    }));

    const goals = game.goalCardIds.map((id, i) => {
      const c = cardMap.get(id);
      const revealed = c?.revealed ?? false;
      return {
        index: i,
        x: GOAL_POSITIONS[i].x,
        y: GOAL_POSITIONS[i].y,
        revealed,
        subtype: revealed ? (c?.subtype ?? null) : null,
      };
    });

    const lastDiscardId = game.discardPileCardIds[game.discardPileCardIds.length - 1];
    const lastDiscard = lastDiscardId ? (cardMap.get(lastDiscardId)?.subtype ?? null) : null;

    return {
      gameId: game._id,
      round: game.round,
      numberOfRounds: room.settings.numberOfRounds,
      status: game.status,
      currentPlayerIndex: game.currentPlayerIndex,
      currentPlayerId: game.playerOrder[game.currentPlayerIndex] ?? null,
      turnDeadline: game.turnDeadline,
      deckCount: game.deckCardIds.length,
      discardCount: game.discardPileCardIds.length,
      lastDiscard,
      board,
      goals,
      players: playersPublic,
      roundResult: game.roundResult ?? null,
    };
  },
});

// Private — only the caller's hand. sessionId never echoed back.
export const getMyHand = query({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) return null;
    const game = await activeGame(ctx, room._id);
    if (!game) return null;
    const me = await ctx.db
      .query("players")
      .withIndex("by_roomId_and_sessionId", (q) =>
        q.eq("roomId", room._id).eq("sessionId", args.sessionId),
      )
      .unique();
    if (!me) return null;

    const cards = await ctx.db
      .query("gameCards")
      .withIndex("by_gameId_and_assignedTo", (q) =>
        q.eq("gameId", game._id).eq("assignedTo", me._id),
      )
      .collect();
    const hand = cards
      .filter((c) => (c.type === "tunnel" || c.type === "action") && c.inFront !== true)
      .map((c) => ({ _id: c._id, type: c.type, subtype: c.subtype }));

    return {
      myPlayerId: me._id,
      isMyTurn: game.playerOrder[game.currentPlayerIndex] === me._id,
      hand,
    };
  },
});

// Private — only the caller's secret knowledge: role, map peeks, own gold.
export const getMyRole = query({
  args: { code: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!room) return null;
    const game = await activeGame(ctx, room._id);
    if (!game) return null;
    const me = await ctx.db
      .query("players")
      .withIndex("by_roomId_and_sessionId", (q) =>
        q.eq("roomId", room._id).eq("sessionId", args.sessionId),
      )
      .unique();
    if (!me) return null;

    // Reveal only the goal faces this player peeked with a map card.
    const peeks = me.peekedGoalIndexes ?? [];
    const peekedGoals: { index: number; subtype: string }[] = [];
    for (const i of peeks) {
      const gid = game.goalCardIds[i];
      if (!gid) continue;
      const gc = await ctx.db.get(gid);
      if (gc) peekedGoals.push({ index: i, subtype: gc.subtype });
    }

    return {
      myPlayerId: me._id,
      role: me.role ?? null,
      totalGold: me.totalGold ?? 0,
      peekedGoals,
    };
  },
});
