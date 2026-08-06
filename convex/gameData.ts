// Pure card data definitions for Saboteur. No Convex functions live here so this
// module can be imported by mutations, queries, and tests alike.

export type Edges = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

export type TunnelDef = {
  subtype: string;
  edges: Edges;
  // Whether open edges connect through the card centre (passable tunnel).
  // Dead-end cards have openings but are not passable.
  connected: boolean;
  count: number;
};

function e(top: boolean, right: boolean, bottom: boolean, left: boolean): Edges {
  return { top, right, bottom, left };
}

// 40 path cards: 32 passable tunnels + 8 dead-ends. Counts are a balanced,
// fully-playable distribution (the original deck's exact shape counts vary by
// edition; only the 44/27/28/11 totals and mechanics are rule-critical).
export const PATH_CARDS: TunnelDef[] = [
  // Passable tunnels (connected = true)
  { subtype: "path_cross", edges: e(true, true, true, true), connected: true, count: 5 },
  { subtype: "path_vertical", edges: e(true, false, true, false), connected: true, count: 4 },
  { subtype: "path_horizontal", edges: e(false, true, false, true), connected: true, count: 4 },
  { subtype: "path_elbow_tr", edges: e(true, true, false, false), connected: true, count: 3 },
  { subtype: "path_elbow_tl", edges: e(true, false, false, true), connected: true, count: 3 },
  { subtype: "path_elbow_br", edges: e(false, true, true, false), connected: true, count: 3 },
  { subtype: "path_elbow_bl", edges: e(false, false, true, true), connected: true, count: 3 },
  { subtype: "path_tee_trb", edges: e(true, true, true, false), connected: true, count: 2 },
  { subtype: "path_tee_trl", edges: e(true, true, false, true), connected: true, count: 2 },
  { subtype: "path_tee_rbl", edges: e(false, true, true, true), connected: true, count: 1 },
  { subtype: "path_tee_tbl", edges: e(true, false, true, true), connected: true, count: 2 },
  // Dead-ends (connected = false): same openings, blocked centre
  { subtype: "dead_top", edges: e(true, false, false, false), connected: false, count: 1 },
  { subtype: "dead_right", edges: e(false, true, false, false), connected: false, count: 1 },
  { subtype: "dead_bottom", edges: e(false, false, true, false), connected: false, count: 1 },
  { subtype: "dead_left", edges: e(false, false, false, true), connected: false, count: 1 },
  { subtype: "dead_vertical", edges: e(true, false, true, false), connected: false, count: 1 },
  { subtype: "dead_horizontal", edges: e(false, true, false, true), connected: false, count: 1 },
  { subtype: "dead_elbow_tr", edges: e(true, true, false, false), connected: false, count: 1 },
  { subtype: "dead_elbow_bl", edges: e(false, false, true, true), connected: false, count: 1 },
];

// Start card: open on all sides, passable.
export const START_CARD: { subtype: string; edges: Edges; connected: boolean } = {
  subtype: "start",
  edges: e(true, true, true, true),
  connected: true,
};

// Goal cards are treated as open-on-all-sides and passable for reach detection.
// One gold, two stone — shuffled into fixed positions face-down.
export const GOAL_GOLD = "goal_gold";
export const GOAL_STONE = "goal_stone";
export const GOAL_EDGES: Edges = e(true, true, true, true);

export type ActionDef = {
  subtype: string;
  // For tools: which tool(s) this card affects.
  tools?: string[];
  count: number;
};

export const TOOLS = ["pickaxe", "lantern", "cart"] as const;
export type Tool = (typeof TOOLS)[number];

// 27 action cards: 9 broken tools + 9 repair tools + 6 map + 3 rockfall.
export const ACTION_CARDS: ActionDef[] = [
  { subtype: "broken_pickaxe", tools: ["pickaxe"], count: 3 },
  { subtype: "broken_lantern", tools: ["lantern"], count: 3 },
  { subtype: "broken_cart", tools: ["cart"], count: 3 },
  { subtype: "repair_pickaxe", tools: ["pickaxe"], count: 2 },
  { subtype: "repair_lantern", tools: ["lantern"], count: 2 },
  { subtype: "repair_cart", tools: ["cart"], count: 2 },
  { subtype: "repair_pickaxe_lantern", tools: ["pickaxe", "lantern"], count: 1 },
  { subtype: "repair_pickaxe_cart", tools: ["pickaxe", "cart"], count: 1 },
  { subtype: "repair_lantern_cart", tools: ["lantern", "cart"], count: 1 },
  { subtype: "map", count: 6 },
  { subtype: "rockfall", count: 3 },
];

// 28 gold nugget cards.
export const GOLD_CARDS: { value: number; count: number }[] = [
  { value: 1, count: 16 },
  { value: 2, count: 8 },
  { value: 3, count: 4 },
];

// 11 role cards: 7 miners + 4 saboteurs.
export const TOTAL_MINER_ROLES = 7;
export const TOTAL_SABOTEUR_ROLES = 4;

// Players -> saboteur count (miners = players - saboteurs). Matches the rulebook.
export function saboteurCount(numPlayers: number): number {
  if (numPlayers <= 3) return 1;
  if (numPlayers <= 5) return 2;
  if (numPlayers <= 7) return 3;
  if (numPlayers <= 9) return 3;
  return 4; // 10
}

export function handSize(numPlayers: number): number {
  if (numPlayers <= 5) return 6;
  if (numPlayers <= 7) return 5;
  return 4; // 8–10
}

// Gold each saboteur receives when saboteurs win.
export function saboteurGoldTarget(numSaboteurs: number): number {
  if (numSaboteurs <= 1) return 4;
  if (numSaboteurs <= 3) return 3;
  return 2;
}

export function isBrokenTool(subtype: string): boolean {
  return subtype.startsWith("broken_");
}

export function isRepairTool(subtype: string): boolean {
  return subtype.startsWith("repair_");
}

export function isPathCard(subtype: string): boolean {
  return subtype.startsWith("path_") || subtype.startsWith("dead_");
}

const TUNNEL_BY_SUBTYPE = new Map<string, TunnelDef>(PATH_CARDS.map((c) => [c.subtype, c]));

export function pathDef(subtype: string): TunnelDef | undefined {
  return TUNNEL_BY_SUBTYPE.get(subtype);
}

const ACTION_BY_SUBTYPE = new Map<string, ActionDef>(ACTION_CARDS.map((c) => [c.subtype, c]));

export function actionDef(subtype: string): ActionDef | undefined {
  return ACTION_BY_SUBTYPE.get(subtype);
}
