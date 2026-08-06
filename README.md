# Saboteur

_[Polski](README.pl.md)_

The card game Saboteur, playable in the browser. 3-10 players, one room code, no accounts. Dwarves lay tunnel cards toward the gold, and a couple of them secretly don't want it found.

I've played the paper version a lot and wanted an excuse to build something real-time.

**Stack:** React 19 · Convex · Vite+ · Tailwind v4 · Framer Motion · Paraglide (en/pl)

## Screenshots

Mid-round, with a tunnel card picked up and every cell it could go into lit up. The mine has to reach one of the three face-down cards on the right, and only one of them is the gold.

![The board](docs/screenshots/board.png)

The lobby. The host sets the player cap, the number of rounds and the turn timer, and everyone else watches the settings change live.

![Lobby](docs/screenshots/lobby.png)

End of a round, when the roles finally flip face-up. Nobody dug through this time, so the two saboteurs get paid instead.

![Round end](docs/screenshots/round-end.png)

<details>
<summary>Home screen</summary>

![Home](docs/screenshots/home.png)

</details>

There's a recording of a full round in [docs/video/gameplay.webm](docs/video/gameplay.webm). All of it, screenshots included, comes out of `npm run shots`, which drives one real browser and three bots through a game.

## Running it

```bash
vp install
npx convex dev    # first run creates a deployment and writes .env.local
vp dev
```

No keys, no seed data, no sign-up. Open two tabs, create a room in one, paste the code in the other.

## What's in it

- **Rooms** - six-character code, a random session id in localStorage, that's the whole identity system. The host can kick people and hand the crown over; if they leave, someone else gets it automatically.
- **Placement rules** - a BFS from the start card decides what's reachable. A new card has to line up on every shared edge _and_ touch the passable network, so you can't grow a tunnel off a dead end. Dead-end cards are the fun case: they have openings but a blocked centre, so they look connected and aren't.
- **Hidden information** - the public game state, your hand, and your role are three separate queries. The client is never sent anything it shouldn't have, so there's nothing to find in the network tab. Roles unlock when the round ends, gold totals when the game does.
- **Turn timer** - every turn schedules a timeout carrying a serial number. Move in time and the serial changes, so the timeout wakes up, sees it's stale and does nothing. Nothing to cancel.
- **Disconnects** - clients heartbeat every 10s and a cron sweeps anyone quiet for 45. Empty rooms delete themselves.
- **Rounds and gold** - up to three rounds, nuggets dealt from a deck that shrinks across the whole game, and the saboteurs' payout scales with how many of them there were.
- **Two languages** - en/pl through Paraglide, which compiles each message into a function, so unused translations get tree-shaken instead of shipped.

## A couple of decisions

**The rules don't know Convex exists.** `gameLogic.ts` and `gameData.ts` import nothing from the backend - just geometry, reachability and card counts. That leaves the interesting half of the game testable with plain Vitest, and the mutation around it is mostly persistence.

**The client decides nothing.** Every move goes through one `playCard` mutation that rebuilds the board from the database and validates from scratch. The green cells in the screenshot are only the app being helpful: it highlights every empty neighbour, not every legal move, and the server still throws out anything whose edges don't line up.

**Every move ends the same way.** `finalizeMove` draws a replacement card, advances the turn, checks whether the round ended and reschedules the timer. Adding a new action card means writing what it does, not re-remembering the six things that happen afterwards.

## Tests

```bash
vp test
```

Board geometry and placement rules. The Convex functions aren't covered yet.

## Status

Playable start to finish. The art is my own placeholder work and it looks like it - that's the next thing, along with actually deploying it somewhere.
