import type { Id } from "../../convex/_generated/dataModel.js";

export type Player = {
  _id: Id<"players">;
  nickname: string;
  avatarId: number;
  isHost: boolean;
};

// L1: all fields required — schema always writes them, no runtime defaults needed
export type RoomSettings = {
  maxPlayers: number;
  numberOfRounds: number;
  turnTimeLimitSeconds: number;
  enableBrokenToolPenalty: boolean;
};

export type Room = {
  _id: Id<"rooms">;
  code: string;
  // M3: "starting" removed — it was never set; re-add when startGame mutation exists
  status: "waiting" | "playing";
  settings: RoomSettings;
  players: Player[];
};
