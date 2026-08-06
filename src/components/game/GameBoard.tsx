import { motion } from "framer-motion";
import { BOARD_BOUNDS, cellKey } from "../../lib/board.js";
import { TunnelCardView } from "./TunnelCardView.js";
import type { BoardPlacement, GoalState } from "./types.js";

const { minX: MIN_X, maxX: MAX_X, minY: MIN_Y, maxY: MAX_Y } = BOARD_BOUNDS;
const CELL = 54;
const GAP = 4;

export type BoardMode = "idle" | "place" | "rockfall" | "map";

type Props = {
  placements: BoardPlacement[];
  goals: GoalState[];
  peekedMap: Record<number, string>;
  mode: BoardMode;
  placeable: Set<string>;
  onPlace: (x: number, y: number) => void;
  onRockfall: (x: number, y: number) => void;
  onMapPeek: (goalIndex: number) => void;
};

function goalIcon(subtype: string | null): string {
  if (subtype === "goal_gold") return "💰";
  if (subtype === "goal_stone") return "🪨";
  return "";
}

export function GameBoard({
  placements,
  goals,
  peekedMap,
  mode,
  placeable,
  onPlace,
  onRockfall,
  onMapPeek,
}: Props) {
  const placementMap = new Map(placements.map((p) => [cellKey(p.x, p.y), p]));
  const goalMap = new Map(goals.map((g) => [cellKey(g.x, g.y), g]));

  const cols = MAX_X - MIN_X + 1;
  const rows = MAX_Y - MIN_Y + 1;

  const cells = [];
  for (let y = MIN_Y; y <= MAX_Y; y++) {
    for (let x = MIN_X; x <= MAX_X; x++) {
      const key = cellKey(x, y);
      const placement = placementMap.get(key);
      const goal = goalMap.get(key);
      const col = x - MIN_X + 1;
      const row = y - MIN_Y + 1;
      const style = { gridColumn: col, gridRow: row, width: CELL, height: CELL };

      if (placement) {
        const removable = mode === "rockfall" && placement.subtype !== "start";
        cells.push(
          <motion.button
            key={key}
            type="button"
            disabled={!removable}
            onClick={() => removable && onRockfall(x, y)}
            style={style}
            initial={{ scale: 0.2, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className={
              removable
                ? "ring-2 ring-red-500 rounded-[6px] cursor-pointer hover:ring-4"
                : "cursor-default"
            }
          >
            <TunnelCardView
              subtype={placement.subtype}
              flipped={placement.flipped}
              size={CELL}
              centerIcon={placement.subtype === "start" ? "🪜" : undefined}
            />
          </motion.button>,
        );
        continue;
      }

      if (goal) {
        const peeked = peekedMap[goal.index];
        const known = goal.revealed ? goal.subtype : (peeked ?? null);
        const clickable = mode === "map";
        cells.push(
          <button
            key={key}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onMapPeek(goal.index)}
            style={style}
            className={`relative rounded-[6px] ${
              clickable
                ? "ring-2 ring-violet-400 cursor-pointer hover:ring-4 animate-pulse"
                : "cursor-default"
            }`}
          >
            {known ? (
              <TunnelCardView subtype="goal_stone" size={CELL} centerIcon={goalIcon(known)} />
            ) : (
              <TunnelCardView subtype="goal_stone" size={CELL} faceDown />
            )}
            {!goal.revealed && peeked && (
              <span className="absolute -top-1 -right-1 text-[11px]">👁️</span>
            )}
          </button>,
        );
        continue;
      }

      const canPlace = mode === "place" && placeable.has(key);
      cells.push(
        <button
          key={key}
          type="button"
          disabled={!canPlace}
          onClick={() => canPlace && onPlace(x, y)}
          style={style}
          className={
            canPlace
              ? "rounded-[6px] border-2 border-dashed border-[#22c55e] bg-[#22c55e]/25 hover:bg-[#22c55e]/45 cursor-pointer animate-pulse"
              : "rounded-[6px] border border-[#5a360a]/25 bg-black/10"
          }
        />,
      );
    }
  }

  return (
    <div className="overflow-auto custom-scroll max-w-full max-h-full p-3">
      <div
        className="relative grid mx-auto rounded-xl p-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
          gap: GAP,
          background: "rgba(20,11,3,0.35)",
          boxShadow: "inset 0 0 0 2px rgba(90,54,10,0.5), inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {cells}
      </div>
    </div>
  );
}
