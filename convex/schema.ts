import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostSessionId: v.string(),
    // M3: removed "starting" — it was never set anywhere; re-add when startGame is implemented
    status: v.union(v.literal("waiting"), v.literal("playing")),
    // L1: all settings required — create() always sets them, no need for double defaults
    settings: v.object({
      maxPlayers: v.number(),
      numberOfRounds: v.number(),
      turnTimeLimitSeconds: v.number(),
      enableBrokenToolPenalty: v.boolean(),
    }),
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    nickname: v.string(),
    avatarId: v.number(),
    isHost: v.boolean(),
    lastHeartbeat: v.number(),
    // Game state — optional because lobby players exist before a game starts.
    // startGame initializes these for every player in the room.
    role: v.optional(v.union(v.literal("miner"), v.literal("saboteur"))),
    brokenTools: v.optional(v.array(v.string())),
    goldNuggetCardIds: v.optional(v.array(v.id("gameCards"))),
    totalGold: v.optional(v.number()),
    peekedGoalIndexes: v.optional(v.array(v.number())),
  })
    .index("by_roomId", ["roomId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_roomId_and_sessionId", ["roomId", "sessionId"])
    .index("by_lastHeartbeat", ["lastHeartbeat"]),

  games: defineTable({
    roomId: v.id("rooms"),
    round: v.number(),
    // Stable seating order; currentPlayerIndex / lastPlayerIndex index into this.
    playerOrder: v.array(v.id("players")),
    currentPlayerIndex: v.number(),
    lastPlayerIndex: v.number(),
    // Increments every turn. Scheduled turn-timeout no-ops if the serial changed.
    turnSerial: v.number(),
    turnDeadline: v.number(),
    // Draw deck (tunnel + action cards), top of deck is the last element.
    deckCardIds: v.array(v.id("gameCards")),
    discardPileCardIds: v.array(v.id("gameCards")),
    // Undealt gold nugget cards — persists (shrinks) across rounds.
    goldDeckCardIds: v.array(v.id("gameCards")),
    // Start card + every placed path card. Goal cards live in goalCardIds.
    boardPlacements: v.array(
      v.object({
        cardId: v.id("gameCards"),
        x: v.number(),
        y: v.number(),
        flipped: v.boolean(),
      }),
    ),
    // Three goal cards in fixed positions (see gameLogic GOAL_POSITIONS).
    goalCardIds: v.array(v.id("gameCards")),
    status: v.union(v.literal("playing"), v.literal("round_end"), v.literal("finished")),
    // Populated when a round finishes.
    roundResult: v.optional(
      v.object({
        winningTeam: v.union(v.literal("miners"), v.literal("saboteurs")),
        reason: v.union(v.literal("gold_reached"), v.literal("blocked")),
      }),
    ),
  })
    .index("by_roomId", ["roomId"])
    .index("by_roomId_and_status", ["roomId", "status"]),

  gameCards: defineTable({
    gameId: v.id("games"),
    type: v.union(v.literal("tunnel"), v.literal("action"), v.literal("gold"), v.literal("role")),
    // Specific card identity, e.g. "path_cross", "broken_pickaxe", "goal_gold".
    subtype: v.string(),
    // Hand owner (tunnel/action), broken-tool target (inFront), or gold/role owner.
    assignedTo: v.union(v.id("players"), v.null()),
    revealed: v.boolean(),
    // Broken-tool card sitting face-up in front of assignedTo (not in their hand).
    inFront: v.optional(v.boolean()),
    // Gold value (1–3) for type === "gold".
    value: v.optional(v.number()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_and_assignedTo", ["gameId", "assignedTo"]),
});
