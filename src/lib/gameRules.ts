// L2: single source of truth for game constants used by frontend components.
// Note: Convex backend (convex/rooms.ts) keeps its own matching constants
// since it cannot import from src/.
export const GAME_RULES = {
  minPlayers: 3,
  maxPlayers: 10,
  minRounds: 1,
  maxRounds: 3,
  validTurnTimes: [30, 60, 90, 120] as const,
} as const;
