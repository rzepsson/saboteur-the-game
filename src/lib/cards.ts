// Frontend mirror of the tunnel-card geometry and action-card metadata used for
// rendering. Kept in sync with convex/gameData.ts (the backend is authoritative
// for all rules; this is purely for drawing cards).

export type Edges = { top: boolean; right: boolean; bottom: boolean; left: boolean };

function e(top: boolean, right: boolean, bottom: boolean, left: boolean): Edges {
  return { top, right, bottom, left };
}

type TunnelInfo = { edges: Edges; connected: boolean };

const TUNNELS: Record<string, TunnelInfo> = {
  start: { edges: e(true, true, true, true), connected: true },
  goal_gold: { edges: e(true, true, true, true), connected: true },
  goal_stone: { edges: e(true, true, true, true), connected: true },
  path_cross: { edges: e(true, true, true, true), connected: true },
  path_vertical: { edges: e(true, false, true, false), connected: true },
  path_horizontal: { edges: e(false, true, false, true), connected: true },
  path_elbow_tr: { edges: e(true, true, false, false), connected: true },
  path_elbow_tl: { edges: e(true, false, false, true), connected: true },
  path_elbow_br: { edges: e(false, true, true, false), connected: true },
  path_elbow_bl: { edges: e(false, false, true, true), connected: true },
  path_tee_trb: { edges: e(true, true, true, false), connected: true },
  path_tee_trl: { edges: e(true, true, false, true), connected: true },
  path_tee_rbl: { edges: e(false, true, true, true), connected: true },
  path_tee_tbl: { edges: e(true, false, true, true), connected: true },
  dead_top: { edges: e(true, false, false, false), connected: false },
  dead_right: { edges: e(false, true, false, false), connected: false },
  dead_bottom: { edges: e(false, false, true, false), connected: false },
  dead_left: { edges: e(false, false, false, true), connected: false },
  dead_vertical: { edges: e(true, false, true, false), connected: false },
  dead_horizontal: { edges: e(false, true, false, true), connected: false },
  dead_elbow_tr: { edges: e(true, true, false, false), connected: false },
  dead_elbow_bl: { edges: e(false, false, true, true), connected: false },
};

function flipEdges(edges: Edges): Edges {
  return { top: edges.bottom, right: edges.left, bottom: edges.top, left: edges.right };
}

export function getEdges(subtype: string, flipped: boolean): Edges {
  const info = TUNNELS[subtype] ?? TUNNELS.path_cross;
  return flipped ? flipEdges(info.edges) : info.edges;
}

export function isConnected(subtype: string): boolean {
  return TUNNELS[subtype]?.connected ?? true;
}

export function isPathCard(subtype: string): boolean {
  return subtype.startsWith("path_") || subtype.startsWith("dead_");
}

export function isGoalCard(subtype: string): boolean {
  return subtype === "goal_gold" || subtype === "goal_stone";
}

export type Tool = "pickaxe" | "lantern" | "cart";

export type ActionKind = "broken" | "repair" | "map" | "rockfall";

export function actionKind(subtype: string): ActionKind | null {
  if (subtype.startsWith("broken_")) return "broken";
  if (subtype.startsWith("repair_")) return "repair";
  if (subtype === "map") return "map";
  if (subtype === "rockfall") return "rockfall";
  return null;
}

// Tools referenced by a broken_/repair_ subtype.
export function toolsOf(subtype: string): Tool[] {
  const all: Tool[] = ["pickaxe", "lantern", "cart"];
  return all.filter((t) => subtype.includes(t));
}

export const TOOL_ICON: Record<Tool, string> = {
  pickaxe: "⛏️",
  lantern: "🏮",
  cart: "🛒",
};
