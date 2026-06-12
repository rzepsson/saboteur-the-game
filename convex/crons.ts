import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup inactive players",
  { seconds: 30 },
  internal.rooms.cleanupInactivePlayers,
  {},
);

export default crons;
