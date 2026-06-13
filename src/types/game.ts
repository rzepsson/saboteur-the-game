import type { Id } from "../../convex/_generated/dataModel.js";

export type Player = {
  _id: Id<"players">;
  sessionId: string;
  nickname: string;
  avatarId: number;
  isHost: boolean;
};

export type RoomSettings = {
  maxPlayers: number;
  numberOfRounds?: number;
  turnTimeLimitSeconds?: number;
  enableBrokenToolPenalty?: boolean;
};

export type Room = {
  _id: Id<"rooms">;
  code: string;
  hostSessionId: string;
  status: "waiting" | "starting" | "playing";
  settings: RoomSettings;
  players: Player[];
};

export function resolveSettings(s: RoomSettings): Required<RoomSettings> {
  return {
    maxPlayers: s.maxPlayers,
    numberOfRounds: s.numberOfRounds ?? 3,
    turnTimeLimitSeconds: s.turnTimeLimitSeconds ?? 60,
    enableBrokenToolPenalty: s.enableBrokenToolPenalty ?? false,
  };
}
