// Plays a whole 4-player game and captures the screenshots used in the README.
//
// Only one real browser is opened: the player we photograph, who clicks through
// the actual UI so the recording shows a person playing. The other three sit on
// top of the Convex HTTP client and talk to the backend directly, which beats
// juggling four windows.
//
// Nobody here reimplements the rules. The script loads `convex/gameLogic.ts` -
// the same module the mutations validate with - so every move it picks is one
// the server will accept.
//
// Prerequisites: `npx convex dev` and `vp dev` both running.
// Usage: node scripts/screenshots.mjs

import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import path from "node:path";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// The convex/ sources import each other without file extensions, which Node's
// TypeScript support doesn't resolve on its own.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !path.extname(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { BOARD_BOUNDS, buildBoard, validatePlacement } = await import("../convex/gameLogic.ts");

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const SHOT_DIR = "docs/screenshots";
const VIDEO_DIR = "docs/video";
const VIEWPORT = { width: 1280, height: 800 };

const HUMAN = "Kuba";
const BOT_NAMES = ["Ola", "Bartek", "Zofia"];

const HEARTBEAT_MS = 10_000;
const MAX_TURNS = 200;
// Consecutive polls with the same player and board before we call it wedged.
const STALL_LIMIT = 6;
// Enough tunnel on the board that a screenshot shows an actual game.
const BOARD_SHOT_AFTER = 9;
// How often a bot with a broken-tool card in hand uses it.
const SABOTAGE_CHANCE = 0.3;
// What getGameState puts in place of a player who is no longer in the room.
const PLACEHOLDER_NAME = "—";

const isPath = (s) => s.startsWith("path_") || s.startsWith("dead_");
const isDeadEnd = (s) => s.startsWith("dead_");
const isBrokenTool = (s) => s.startsWith("broken_");
const isRepairTool = (s) => s.startsWith("repair_");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Text selectors are deliberate: a fresh browser profile has no locale cookie,
// so Paraglide falls back to the base locale and the UI comes up in English.
const SEL = {
  nickname: 'input[maxlength="20"]',
  handCards: 'div[class*="border-t-4"] div[class*="overflow-x-auto"] > button',
  boardCells: 'div[class*="grid"][class*="mx-auto"] > button',
  placeableCell: 'button[class*="border-dashed"]',
  overlay: 'div[class*="z-40"]',
};

// Why the server said no to the last move, kept around for the stall report.
let lastRejection = null;

/** Send a move; `false` means the server turned it down. */
async function play(client, code, sessionId, move) {
  try {
    await client.mutation(api.games.playCard, { sessionId, code, move });
    return true;
  } catch (err) {
    // Convex wraps the thrown error code in a multi-line server trace.
    const reason = /Uncaught Error:\s*([A-Z_]+)/.exec(err.message)?.[1] ?? "unknown";
    lastRejection = `${move.kind} -> ${reason}`;
    return false;
  }
}

/** Manhattan distance to the nearest goal card. */
function goalDistance(state, x, y) {
  return Math.min(...state.goals.map((g) => Math.abs(g.x - x) + Math.abs(g.y - y)));
}

/**
 * Best legal tunnel placement for this hand, or null. Every candidate is run
 * through the server's own validator, so a returned move always sticks.
 */
function findPlacement(state, hand) {
  const board = buildBoard(
    state.board.map((p) => ({ subtype: p.subtype, x: p.x, y: p.y, flipped: p.flipped })),
    // Face-down or not, both goal faces have identical edges.
    state.goals.map((g) => g.subtype ?? "goal_stone"),
  );

  const options = [];
  for (const card of hand.filter((c) => isPath(c.subtype))) {
    for (const flipped of [false, true]) {
      for (let x = BOARD_BOUNDS.minX; x <= BOARD_BOUNDS.maxX; x++) {
        for (let y = BOARD_BOUNDS.minY; y <= BOARD_BOUNDS.maxY; y++) {
          if (validatePlacement(board, card.subtype, flipped, x, y) === null) {
            options.push({ card, flipped, x, y });
          }
        }
      }
    }
  }
  if (options.length === 0) return null;

  // Real tunnels before dead ends, then whatever digs closest to the gold.
  options.sort(
    (a, b) =>
      Number(isDeadEnd(a.card.subtype)) - Number(isDeadEnd(b.card.subtype)) ||
      goalDistance(state, a.x, a.y) - goalDistance(state, b.x, b.y),
  );
  return options[0];
}

/**
 * One bot turn: fix yourself, break somebody, dig, or bin a card, in that order.
 * Tools only ever get broken on other bots, so the player being photographed can
 * always keep playing.
 */
async function botTurn(client, code, bot, state) {
  const mine = await client.query(api.games.getMyHand, { code, sessionId: bot.sessionId });
  if (!mine || mine.hand.length === 0) return;
  const hand = mine.hand;
  const send = (move) => play(client, code, bot.sessionId, move);

  const me = state.players.find((p) => p._id === mine.myPlayerId);
  const myBroken = me?.brokenTools ?? [];

  // A broken tool blocks every tunnel card, so repairing is the only useful move.
  if (myBroken.length > 0) {
    const fix = hand.find(
      (c) => isRepairTool(c.subtype) && myBroken.some((t) => c.subtype.includes(t)),
    );
    if (fix) {
      const tool = myBroken.find((t) => fix.subtype.includes(t));
      if (await send({ kind: "repair", cardId: fix._id, targetPlayerId: mine.myPlayerId, tool })) {
        return;
      }
    }
    await send({ kind: "pass", cardId: hand[0]._id });
    return;
  }

  // Sabotage now and then, mostly so the players strip has something to show.
  const breaker = hand.find((c) => isBrokenTool(c.subtype));
  const victim = state.players.find(
    (p) => p._id !== mine.myPlayerId && p.nickname !== HUMAN && (p.brokenTools ?? []).length === 0,
  );
  if (breaker && victim && Math.random() < SABOTAGE_CHANCE) {
    if (await send({ kind: "broken", cardId: breaker._id, targetPlayerId: victim._id })) return;
  }

  const spot = findPlacement(state, hand);
  if (spot) {
    const move = {
      kind: "place",
      cardId: spot.card._id,
      x: spot.x,
      y: spot.y,
      flipped: spot.flipped,
    };
    if (await send(move)) return;
  }

  // Nothing playable: discard whatever is least useful.
  const junk = hand.find((c) => !isPath(c.subtype)) ?? hand[0];
  await send({ kind: "pass", cardId: junk._id });
}

/** Grid children run left to right, top to bottom, across the whole board. */
function boardCellIndex(x, y) {
  const cols = BOARD_BOUNDS.maxX - BOARD_BOUNDS.minX + 1;
  return (y - BOARD_BOUNDS.minY) * cols + (x - BOARD_BOUNDS.minX);
}

/**
 * Play a validated placement by clicking it, the way a player would: pick the
 * card up, flip it if it needs flipping, drop it on the cell. Returns false if
 * the DOM won't cooperate and the caller should fall back to the HTTP path.
 */
async function placeInUi(page, handIndex, spot, onHighlight) {
  try {
    await page.locator(SEL.handCards).nth(handIndex).click({ timeout: 4000 });
    await page.locator(SEL.placeableCell).first().waitFor({ timeout: 3000 });
    if (onHighlight) await onHighlight();
    if (spot.flipped) {
      await page.getByRole("button", { name: /flip/i }).click({ timeout: 3000 });
    }
    await page.locator(SEL.boardCells).nth(boardCellIndex(spot.x, spot.y)).click({ timeout: 4000 });
    return true;
  } catch (err) {
    console.warn(`  UI move failed: ${err.message.split("\n")[0]}`);
    await page
      .getByRole("button", { name: /^cancel$/i })
      .click({ timeout: 2000 })
      .catch(() => {});
    return false;
  }
}

async function main() {
  process.loadEnvFile(".env.local");
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) throw new Error("VITE_CONVEX_URL missing - run `npx convex dev` first");

  await rm(VIDEO_DIR, { recursive: true, force: true });
  await mkdir(SHOT_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  const client = new ConvexHttpClient(convexUrl);
  const humanSession = crypto.randomUUID();
  const bots = BOT_NAMES.map((name, i) => ({
    name,
    sessionId: crypto.randomUUID(),
    avatarId: i + 2,
  }));

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "en-US",
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  // Skip the "who are you" dance: the app treats this id as the player's identity.
  await context.addInitScript(
    ([k, id]) => window.localStorage.setItem(k, id),
    ["saboteur_session_id", humanSession],
  );

  const page = await context.newPage();
  const shot = async (name) => {
    await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
    console.log(`  saved ${name}.png`);
  };

  let code = null;
  let heartbeat = null;

  try {
    console.log("home screen");
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await sleep(1200); // let the background animation settle
    await shot("home");

    console.log("creating a room");
    await page.fill(SEL.nickname, HUMAN);
    await page.getByRole("button", { name: /open the mine/i }).click();
    await page.waitForURL(/\/lobby\//, { timeout: 15000 });
    code = new URL(page.url()).pathname.split("/").pop();
    console.log(`  room ${code}`);

    for (const bot of bots) {
      await client.mutation(api.rooms.join, {
        sessionId: bot.sessionId,
        nickname: bot.name,
        avatarId: bot.avatarId,
        code,
      });
    }

    // The browser makes up its own session id if the init script missed, and
    // then nothing else in this run would line up.
    const self = await client.query(api.rooms.getMyPlayer, { code, sessionId: humanSession });
    if (!self) throw new Error("session id was not injected into the browser");

    // Bots have no page to run a keep-alive timer, and the cron drops anyone
    // quiet for 45s - including the host, the oldest record in the room.
    const room = await client.query(api.rooms.get, { code });
    const sessions = [humanSession, ...bots.map((b) => b.sessionId)];
    heartbeat = setInterval(() => {
      for (const sessionId of sessions) {
        void client.mutation(api.rooms.heartbeat, { sessionId, roomId: room._id }).catch(() => {});
      }
    }, HEARTBEAT_MS);

    // The lobby is a live query, so the browser catches up on its own.
    await sleep(1500);
    await shot("lobby");

    console.log("starting the game");
    await page.getByRole("button", { name: /start game/i }).click();
    await page.waitForURL(/\/game\//, { timeout: 15000 });
    await sleep(1500);

    let boardShotTaken = false;
    let stuckOn = null;
    let stuckFor = 0;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const state = await client.query(api.games.getGameState, { code });
      if (!state) throw new Error("game vanished");

      if (state.status !== "playing") {
        const { winningTeam, reason } = state.roundResult ?? {};
        console.log(`round over: ${winningTeam} (${reason})`);
        await page.locator(SEL.overlay).waitFor({ timeout: 10000 });
        await sleep(1400); // overlay spring animation
        await shot("round-end");
        break;
      }

      const current = state.players.find((p) => p._id === state.currentPlayerId);
      if (!current) throw new Error("current player is not in the player list");
      if (current.nickname === PLACEHOLDER_NAME) {
        throw new Error("a player was reaped mid-game - is the keep-alive running?");
      }

      // A turn that never resolves would otherwise spin here until MAX_TURNS.
      const fingerprint = `${state.currentPlayerId}:${state.board.length}`;
      stuckFor = fingerprint === stuckOn ? stuckFor + 1 : 0;
      stuckOn = fingerprint;
      if (stuckFor > STALL_LIMIT) {
        const hand = await client.query(api.games.getMyHand, { code, sessionId: humanSession });
        throw new Error(
          `${current.nickname} cannot move. last rejection: ${lastRejection}; ` +
            `broken tools: ${JSON.stringify(current.brokenTools)}; ` +
            `own hand: ${hand ? hand.hand.map((c) => c.subtype).join(", ") || "(empty)" : "null"}`,
        );
      }

      console.log(`turn ${turn}: ${current.nickname} (board ${state.board.length})`);

      if (current.nickname !== HUMAN) {
        const bot = bots.find((b) => b.name === current.nickname);
        if (bot) await botTurn(client, code, bot, state);
        await sleep(250); // let the browser render the move before the next one
        continue;
      }

      // The photographed player's turn. Give the browser a moment first: its
      // copy of the hand can lag the one we just fetched, and the click below
      // goes by position.
      await sleep(700);
      const mine = await client.query(api.games.getMyHand, { code, sessionId: humanSession });
      if (!mine || mine.hand.length === 0) continue;

      const spot = findPlacement(state, mine.hand);
      if (spot) {
        const handIndex = mine.hand.findIndex((c) => c._id === spot.card._id);
        const onHighlight =
          !boardShotTaken && state.board.length >= BOARD_SHOT_AFTER
            ? async () => {
                // The money shot: a tunnel card picked up, legal cells glowing.
                await sleep(600);
                await shot("board");
                boardShotTaken = true;
              }
            : null;

        if (await placeInUi(page, handIndex, spot, onHighlight)) {
          await sleep(400);
          continue;
        }
        const move = {
          kind: "place",
          cardId: spot.card._id,
          x: spot.x,
          y: spot.y,
          flipped: spot.flipped,
        };
        if (await play(client, code, humanSession, move)) continue;
      }

      const junk = mine.hand.find((c) => !isPath(c.subtype)) ?? mine.hand[0];
      await play(client, code, humanSession, { kind: "pass", cardId: junk._id });
    }

    if (!boardShotTaken) console.warn("! never got a good moment for board.png");
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await context.close(); // flushes the video file
    await browser.close();

    const files = await readdir(VIDEO_DIR);
    const webm = files.find((f) => f.endsWith(".webm"));
    if (webm) {
      await rename(path.join(VIDEO_DIR, webm), path.join(VIDEO_DIR, "gameplay.webm"));
      console.log("saved docs/video/gameplay.webm");
    }

    // Don't leave the room loitering in the dev deployment.
    if (code) {
      const room = await client.query(api.rooms.get, { code }).catch(() => null);
      if (room) {
        for (const sessionId of [humanSession, ...bots.map((b) => b.sessionId)]) {
          await client.mutation(api.rooms.leave, { sessionId, roomId: room._id }).catch(() => {});
        }
      }
    }
  }
}

await main();
