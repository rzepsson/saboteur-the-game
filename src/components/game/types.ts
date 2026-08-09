// Shared view-model types for the in-game UI, derived from the Convex query
// return shapes so the components stay in sync with the backend automatically.

import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api.js";

export type GameState = NonNullable<FunctionReturnType<typeof api.games.getGameState>>;
export type PublicPlayer = GameState["players"][number];
export type BoardPlacement = GameState["board"][number];
export type GoalState = GameState["goals"][number];
export type RoundResult = NonNullable<GameState["roundResult"]>;

export type MyHand = NonNullable<FunctionReturnType<typeof api.games.getMyHand>>;
export type HandCard = MyHand["hand"][number];

// What a selected card lets you do this turn; drives both the action controls
// and the board's interaction mode.
export type SelectedKind = "place" | "broken" | "repair" | "map" | "rockfall" | null;

export type Role = "miner" | "saboteur" | null;
export type Team = "miners" | "saboteurs";
