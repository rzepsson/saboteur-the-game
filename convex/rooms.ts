import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const HEARTBEAT_TIMEOUT_MS = 45_000;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function cleanRoomIfEmpty(ctx: MutationCtx, roomId: Id<"rooms">) {
  const remaining = await ctx.db
    .query("players")
    .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
    .take(1);
  if (remaining.length === 0) {
    await ctx.db.delete(roomId);
  }
}

export const create = mutation({
  args: {
    sessionId: v.string(),
    nickname: v.string(),
    avatarId: v.number(),
  },
  handler: async (ctx, args) => {
    // Leave any existing room before creating a new one
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existingPlayer) {
      const oldRoomId = existingPlayer.roomId;
      await ctx.db.delete(existingPlayer._id);
      await cleanRoomIfEmpty(ctx, oldRoomId);
    }

    // Ensure code is unique
    let code = generateCode();
    while (
      (await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()) !== null
    ) {
      code = generateCode();
    }

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostSessionId: args.sessionId,
      status: "waiting",
      settings: {
        maxPlayers: 10,
        numberOfRounds: 3,
        turnTimeLimitSeconds: 60,
        enableBrokenToolPenalty: false,
      },
    });

    await ctx.db.insert("players", {
      roomId,
      sessionId: args.sessionId,
      nickname: args.nickname.trim() || "Górnik",
      avatarId: args.avatarId,
      isHost: true,
      lastHeartbeat: Date.now(),
    });

    return { code };
  },
});

export const join = mutation({
  args: {
    sessionId: v.string(),
    nickname: v.string(),
    avatarId: v.number(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase();

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .unique();

    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "waiting") throw new Error("GAME_ALREADY_STARTED");

    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .take(11);

    // Already in this room — refresh info
    const alreadyIn = players.find((p) => p.sessionId === args.sessionId);
    if (alreadyIn) {
      await ctx.db.patch(alreadyIn._id, {
        nickname: args.nickname.trim() || alreadyIn.nickname,
        avatarId: args.avatarId,
        lastHeartbeat: Date.now(),
      });
      return { code: room.code };
    }

    if (players.length >= room.settings.maxPlayers) throw new Error("ROOM_FULL");

    // Leave any other room first
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existingPlayer) {
      const oldRoomId = existingPlayer.roomId;
      await ctx.db.delete(existingPlayer._id);
      await cleanRoomIfEmpty(ctx, oldRoomId);
    }

    await ctx.db.insert("players", {
      roomId: room._id,
      sessionId: args.sessionId,
      nickname: args.nickname.trim() || "Górnik",
      avatarId: args.avatarId,
      isHost: false,
      lastHeartbeat: Date.now(),
    });

    return { code: room.code };
  },
});

export const leave = mutation({
  args: {
    sessionId: v.string(),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_roomId_and_sessionId", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", args.sessionId),
      )
      .unique();

    if (!player) return;

    const wasHost = player.isHost;
    await ctx.db.delete(player._id);

    const remaining = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .take(10);

    if (remaining.length === 0) {
      await ctx.db.delete(args.roomId);
      return;
    }

    if (wasHost) {
      const newHost = remaining[0];
      await ctx.db.patch(newHost._id, { isHost: true });
      await ctx.db.patch(args.roomId, { hostSessionId: newHost.sessionId });
    }
  },
});

export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_roomId_and_sessionId", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", args.sessionId),
      )
      .unique();

    if (player) {
      await ctx.db.patch(player._id, { lastHeartbeat: Date.now() });
    }
  },
});

const VALID_TURN_TIMES = new Set([30, 60, 90, 120]);

export const updateSettings = mutation({
  args: {
    sessionId: v.string(),
    roomId: v.id("rooms"),
    settings: v.object({
      maxPlayers: v.number(),
      numberOfRounds: v.number(),
      turnTimeLimitSeconds: v.number(),
      enableBrokenToolPenalty: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.hostSessionId !== args.sessionId) throw new Error("NOT_HOST");

    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .take(11);

    const s = args.settings;
    await ctx.db.patch(args.roomId, {
      settings: {
        maxPlayers: Math.min(10, Math.max(Math.max(3, players.length), Math.round(s.maxPlayers))),
        numberOfRounds: Math.min(3, Math.max(1, Math.round(s.numberOfRounds))),
        turnTimeLimitSeconds: VALID_TURN_TIMES.has(s.turnTimeLimitSeconds)
          ? s.turnTimeLimitSeconds
          : 60,
        enableBrokenToolPenalty: s.enableBrokenToolPenalty,
      },
    });
  },
});

export const get = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!room) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .take(10);

    return { ...room, players };
  },
});

export const cleanupInactivePlayers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;

    const stalePlayers = await ctx.db
      .query("players")
      .withIndex("by_lastHeartbeat", (q) => q.lt("lastHeartbeat", cutoff))
      .take(50);

    const affectedRooms = new Set<Id<"rooms">>();
    for (const player of stalePlayers) {
      affectedRooms.add(player.roomId);
      await ctx.db.delete(player._id);
    }

    for (const roomId of affectedRooms) {
      const remaining = await ctx.db
        .query("players")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .take(1);

      if (remaining.length === 0) {
        const room = await ctx.db.get(roomId);
        if (room) await ctx.db.delete(roomId);
      } else {
        // Ensure a host is assigned after stale player removal
        const hasHost = remaining.some((p) => p.isHost);
        if (!hasHost) {
          await ctx.db.patch(remaining[0]._id, { isHost: true });
          await ctx.db.patch(roomId, {
            hostSessionId: remaining[0].sessionId,
          });
        }
      }
    }
  },
});
