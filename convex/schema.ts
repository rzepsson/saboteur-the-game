import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostSessionId: v.string(),
    status: v.union(v.literal("waiting"), v.literal("starting"), v.literal("playing")),
    settings: v.object({
      maxPlayers: v.number(),
      numberOfRounds: v.optional(v.number()),
      turnTimeLimitSeconds: v.optional(v.union(v.null(), v.number())),
      enableBrokenToolPenalty: v.optional(v.boolean()),
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
