// Pure board geometry & rules logic for Saboteur. No Convex APIs — importable by
// mutations, queries and unit tests.

import { type Edges, GOAL_EDGES, GOAL_GOLD, GOAL_STONE, pathDef, START_CARD } from "./gameData";

export const START_POSITION = { x: 0, y: 0 };

// Three goal cards in fixed positions: top, middle, bottom (y grows downward).
export const GOAL_POSITIONS = [
  { x: 8, y: -2 },
  { x: 8, y: 0 },
  { x: 8, y: 2 },
];

// Bounded playing field (start column 0 .. goal column 8, five-ish rows).
export const BOARD_BOUNDS = { minX: 0, maxX: 8, minY: -4, maxY: 4 };

export function inBounds(x: number, y: number): boolean {
  return (
    x >= BOARD_BOUNDS.minX &&
    x <= BOARD_BOUNDS.maxX &&
    y >= BOARD_BOUNDS.minY &&
    y <= BOARD_BOUNDS.maxY
  );
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

type Dir = "top" | "right" | "bottom" | "left";

const DIRS: { dir: Dir; opp: Dir; dx: number; dy: number }[] = [
  { dir: "top", opp: "bottom", dx: 0, dy: -1 },
  { dir: "right", opp: "left", dx: 1, dy: 0 },
  { dir: "bottom", opp: "top", dx: 0, dy: 1 },
  { dir: "left", opp: "right", dx: -1, dy: 0 },
];

function flipEdges(edges: Edges): Edges {
  return {
    top: edges.bottom,
    right: edges.left,
    bottom: edges.top,
    left: edges.right,
  };
}

// Actual edges of a card as placed (accounts for 180° flip).
export function getEdges(subtype: string, flipped: boolean): Edges {
  let base: Edges;
  if (subtype === START_CARD.subtype) base = START_CARD.edges;
  else if (subtype === GOAL_GOLD || subtype === GOAL_STONE) base = GOAL_EDGES;
  else {
    const def = pathDef(subtype);
    if (!def) throw new Error(`UNKNOWN_TUNNEL:${subtype}`);
    base = def.edges;
  }
  return flipped ? flipEdges(base) : base;
}

function isConnected(subtype: string): boolean {
  if (subtype === START_CARD.subtype) return true;
  if (subtype === GOAL_GOLD || subtype === GOAL_STONE) return true;
  const def = pathDef(subtype);
  return def ? def.connected : false;
}

export type BoardCell = {
  subtype: string;
  flipped: boolean;
  edges: Edges;
  connected: boolean;
  isGoal: boolean;
};

export type Board = Map<string, BoardCell>;

export type PlacementInput = {
  cardId: string;
  subtype: string;
  x: number;
  y: number;
  flipped: boolean;
};

// Build a lookup board from start + placed path cards + goal cards.
export function buildBoard(
  placements: { subtype: string; x: number; y: number; flipped: boolean }[],
  goalSubtypes: string[],
): Board {
  const board: Board = new Map();
  for (const p of placements) {
    board.set(cellKey(p.x, p.y), {
      subtype: p.subtype,
      flipped: p.flipped,
      edges: getEdges(p.subtype, p.flipped),
      connected: isConnected(p.subtype),
      isGoal: false,
    });
  }
  goalSubtypes.forEach((subtype, i) => {
    const pos = GOAL_POSITIONS[i];
    board.set(cellKey(pos.x, pos.y), {
      subtype,
      flipped: false,
      edges: GOAL_EDGES,
      connected: true,
      isGoal: true,
    });
  });
  return board;
}

export type Reachability = {
  // Passable cells reachable from start (includes start, excludes goals).
  passable: Set<string>;
  // Goal cell keys reached by an unbroken passable path.
  reachedGoals: Set<string>;
};

// BFS from the start card over passable tunnels via aligned open edges.
export function computeReachability(board: Board): Reachability {
  const passable = new Set<string>();
  const reachedGoals = new Set<string>();
  const startKey = cellKey(START_POSITION.x, START_POSITION.y);
  const start = board.get(startKey);
  if (!start) return { passable, reachedGoals };

  const queue: string[] = [startKey];
  passable.add(startKey);

  while (queue.length > 0) {
    const key = queue.shift()!;
    const cell = board.get(key)!;
    const [cx, cy] = key.split(",").map(Number);
    for (const { dir, opp, dx, dy } of DIRS) {
      if (!cell.edges[dir]) continue;
      const nKey = cellKey(cx + dx, cy + dy);
      const nb = board.get(nKey);
      if (!nb || !nb.edges[opp]) continue; // no aligned opening
      if (nb.isGoal) {
        reachedGoals.add(nKey);
        continue; // goals are endpoints — never propagate through them
      }
      if (nb.connected && !passable.has(nKey)) {
        passable.add(nKey);
        queue.push(nKey);
      }
    }
  }
  return { passable, reachedGoals };
}

export type PlacementError =
  | "OUT_OF_BOUNDS"
  | "CELL_OCCUPIED"
  | "NO_ADJACENT_CARD"
  | "EDGE_MISMATCH"
  | "NOT_CONNECTED_TO_START";

// Validate placing `subtype` (with `flipped`) at (x,y) on the current board.
// Returns null if legal, otherwise a specific error code.
export function validatePlacement(
  board: Board,
  subtype: string,
  flipped: boolean,
  x: number,
  y: number,
): PlacementError | null {
  if (!inBounds(x, y)) return "OUT_OF_BOUNDS";
  const key = cellKey(x, y);
  if (board.has(key)) return "CELL_OCCUPIED";

  const edges = getEdges(subtype, flipped);
  const { passable } = computeReachability(board);

  let hasAdjacent = false;
  let connectsToNetwork = false;

  for (const { dir, opp, dx, dy } of DIRS) {
    const nKey = cellKey(x + dx, y + dy);
    const nb = board.get(nKey);
    if (!nb) continue;
    hasAdjacent = true;
    if (!nb.isGoal) {
      // Edge alignment is enforced only against revealed (non-goal) cards.
      if (edges[dir] !== nb.edges[opp]) return "EDGE_MISMATCH";
    }
    // Connection back to start requires an open↔open edge to a passable,
    // start-reachable cell. Goals are not part of that network.
    if (!nb.isGoal && edges[dir] && nb.edges[opp] && passable.has(nKey)) {
      connectsToNetwork = true;
    }
  }

  if (!hasAdjacent) return "NO_ADJACENT_CARD";
  if (!connectsToNetwork) return "NOT_CONNECTED_TO_START";
  return null;
}

// Index (0–2) of any goal reached on this board, or -1. Used to reveal goals.
export function reachedGoalIndexes(board: Board): number[] {
  const { reachedGoals } = computeReachability(board);
  const indexes: number[] = [];
  GOAL_POSITIONS.forEach((pos, i) => {
    if (reachedGoals.has(cellKey(pos.x, pos.y))) indexes.push(i);
  });
  return indexes;
}
