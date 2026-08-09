import { describe, expect, test } from "vitest";
import {
  buildBoard,
  computeReachability,
  getEdges,
  reachedGoalIndexes,
  validatePlacement,
} from "./gameLogic";

type Placement = { subtype: string; x: number; y: number; flipped: boolean };

const START: Placement = { subtype: "start", x: 0, y: 0, flipped: false };

function horizontalRow(fromX: number, toX: number, y: number): Placement[] {
  const out: Placement[] = [];
  for (let x = fromX; x <= toX; x++) {
    out.push({ subtype: "path_horizontal", x, y, flipped: false });
  }
  return out;
}

describe("getEdges", () => {
  test("start card is open on all sides", () => {
    expect(getEdges("start", false)).toEqual({
      top: true,
      right: true,
      bottom: true,
      left: true,
    });
  });

  test("180° flip swaps top/bottom and left/right", () => {
    // path_elbow_tr opens top + right
    expect(getEdges("path_elbow_tr", false)).toEqual({
      top: true,
      right: true,
      bottom: false,
      left: false,
    });
    // flipped it opens bottom + left
    expect(getEdges("path_elbow_tr", true)).toEqual({
      top: false,
      right: false,
      bottom: true,
      left: true,
    });
  });
});

describe("validatePlacement", () => {
  const goals = ["goal_stone", "goal_gold", "goal_stone"];

  test("accepts a horizontal card next to the start card", () => {
    const board = buildBoard([START], goals);
    expect(validatePlacement(board, "path_horizontal", false, 1, 0)).toBeNull();
  });

  test("rejects placement out of bounds", () => {
    const board = buildBoard([START], goals);
    expect(validatePlacement(board, "path_cross", false, 9, 0)).toBe("OUT_OF_BOUNDS");
  });

  test("rejects placement on an occupied cell", () => {
    const board = buildBoard([START], goals);
    expect(validatePlacement(board, "path_cross", false, 0, 0)).toBe("CELL_OCCUPIED");
  });

  test("rejects a card with no neighbours", () => {
    const board = buildBoard([START], goals);
    expect(validatePlacement(board, "path_cross", false, 3, 0)).toBe("NO_ADJACENT_CARD");
  });

  test("rejects edges that do not align", () => {
    const board = buildBoard([START], goals);
    // vertical card walls its left edge against the start's open right edge
    expect(validatePlacement(board, "path_vertical", false, 1, 0)).toBe("EDGE_MISMATCH");
  });

  test("rejects a card connected only through a dead-end", () => {
    // dead_horizontal opens left+right but does not pass through
    const board = buildBoard(
      [START, { subtype: "dead_horizontal", x: 1, y: 0, flipped: false }],
      goals,
    );
    expect(validatePlacement(board, "path_horizontal", false, 2, 0)).toBe("NOT_CONNECTED_TO_START");
  });
});

describe("connectivity & goal detection", () => {
  const goldMiddle = ["goal_stone", "goal_gold", "goal_stone"];

  test("an unbroken horizontal tunnel reaches the central gold goal", () => {
    const board = buildBoard([START, ...horizontalRow(1, 7, 0)], goldMiddle);
    const { passable } = computeReachability(board);
    expect(passable.has("7,0")).toBe(true);
    expect(reachedGoalIndexes(board)).toEqual([1]);
  });

  test("a dead-end in the middle breaks the path to the goal", () => {
    const board = buildBoard(
      [
        START,
        ...horizontalRow(1, 3, 0),
        { subtype: "dead_horizontal", x: 4, y: 0, flipped: false },
        ...horizontalRow(5, 7, 0),
      ],
      goldMiddle,
    );
    const { passable } = computeReachability(board);
    expect(passable.has("3,0")).toBe(true);
    expect(passable.has("5,0")).toBe(false);
    expect(reachedGoalIndexes(board)).toEqual([]);
  });
});
