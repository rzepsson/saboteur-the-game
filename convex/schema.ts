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
  })
    .index("by_roomId", ["roomId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_roomId_and_sessionId", ["roomId", "sessionId"])
    .index("by_lastHeartbeat", ["lastHeartbeat"]),
});
