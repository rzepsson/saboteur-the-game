// Single source of truth for the playing-field bounds on the client. Mirrors
// BOARD_BOUNDS / GOAL_POSITIONS in convex/gameLogic.ts (backend is authoritative).

export const BOARD_BOUNDS = { minX: 0, maxX: 8, minY: -4, maxY: 4 } as const;

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

const NEIGHBOUR_DELTAS: readonly [number, number][] = [
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
];

// Cells orthogonally adjacent to an occupied cell are candidate placements.
// The server still fully validates edges/connectivity — this is only a UI hint.
export function computePlaceableCells(occupied: Iterable<string>): Set<string> {
  const occupiedSet = occupied instanceof Set ? occupied : new Set(occupied);
  const placeable = new Set<string>();
  for (const key of occupiedSet) {
    const [ox, oy] = key.split(",").map(Number);
    for (const [dx, dy] of NEIGHBOUR_DELTAS) {
      const nx = ox + dx;
      const ny = oy + dy;
      if (!inBounds(nx, ny)) continue;
      const nk = cellKey(nx, ny);
      if (!occupiedSet.has(nk)) placeable.add(nk);
    }
  }
  return placeable;
}
