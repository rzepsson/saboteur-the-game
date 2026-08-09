import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../lib/locale.js";
import { isPathCard, type Tool } from "../../lib/cards.js";
import type { Id } from "../../../convex/_generated/dataModel.js";
import { TunnelCardView } from "./TunnelCardView.js";
import { ActionCardView } from "./ActionCardView.js";
import { RepairToolButtons } from "./RepairToolButtons.js";
import type { HandCard, PublicPlayer, SelectedKind } from "./types.js";

type Props = {
  hand: HandCard[];
  selectedCardId: Id<"gameCards"> | null;
  selectedCard: HandCard | null;
  selectedKind: SelectedKind;
  flipped: boolean;
  isMyTurn: boolean;
  repairTarget: Id<"players"> | null;
  players: PublicPlayer[];
  currentPlayerName: string;
  onSelect: (cardId: Id<"gameCards">) => void;
  onFlip: () => void;
  onPass: () => void;
  onCancel: () => void;
  onPickRepairTool: (tool: Tool) => void;
};

// Bottom dock: contextual hint/controls for the selected card plus the player's
// scrollable hand.
export function HandBar({
  hand,
  selectedCardId,
  selectedCard,
  selectedKind,
  flipped,
  isMyTurn,
  repairTarget,
  players,
  currentPlayerName,
  onSelect,
  onFlip,
  onPass,
  onCancel,
  onPickRepairTool,
}: Props) {
  const m = useTranslation();
  const repairTargetTools = repairTarget
    ? (players.find((p) => p._id === repairTarget)?.brokenTools ?? [])
    : [];

  return (
    <div className="relative z-10 bg-[#3e2406] border-t-4 border-[#5a360a] px-3 py-2 shrink-0">
      {/* Contextual controls */}
      <div className="flex items-center justify-center gap-2 min-h-[36px] mb-2 flex-wrap">
        {!selectedCard && isMyTurn && (
          <span className="text-[#a67c52] font-bold text-sm">{m.game_hand_title()}</span>
        )}
        {!isMyTurn && (
          <span className="text-[#a67c52] font-bold text-sm">
            {m.game_waiting_turn({ name: currentPlayerName })}
          </span>
        )}
        {selectedCard && selectedKind === "place" && (
          <>
            <span className="text-[#f0dfc0] text-sm font-bold">{m.game_place_hint()}</span>
            <button
              type="button"
              onClick={onFlip}
              className="px-3 py-1 bg-[#a67c52] text-[#1e0e04] font-bold rounded-lg border-2 border-[#5a360a] cursor-pointer"
            >
              🔄 {m.game_flip()}
            </button>
          </>
        )}
        {selectedCard && selectedKind === "broken" && (
          <span className="text-[#f0dfc0] text-sm font-bold">{m.game_target_hint()}</span>
        )}
        {selectedCard && selectedKind === "repair" && !repairTarget && (
          <span className="text-[#f0dfc0] text-sm font-bold">{m.game_repair_hint()}</span>
        )}
        {selectedCard && selectedKind === "repair" && repairTarget && (
          <RepairToolButtons
            cardSubtype={selectedCard.subtype}
            brokenTools={repairTargetTools}
            onPick={onPickRepairTool}
          />
        )}
        {selectedCard && selectedKind === "map" && (
          <span className="text-[#f0dfc0] text-sm font-bold">{m.game_map_hint()}</span>
        )}
        {selectedCard && selectedKind === "rockfall" && (
          <span className="text-[#f0dfc0] text-sm font-bold">{m.game_rockfall_hint()}</span>
        )}
        {selectedCard && (
          <>
            <button
              type="button"
              onClick={onPass}
              className="px-3 py-1 bg-[#5a360a] text-[#f0dfc0] font-bold rounded-lg border-2 border-[#2b1604] cursor-pointer"
            >
              🗑 {m.game_pass()}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 bg-[#7a6a55] text-white font-bold rounded-lg border-2 border-[#3e2406] cursor-pointer"
            >
              {m.game_cancel()}
            </button>
          </>
        )}
      </div>

      {/* Hand */}
      <div className="flex gap-2 overflow-x-auto custom-scroll justify-center pb-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {hand.map((card) => {
            const selected = card._id === selectedCardId;
            return (
              <motion.button
                key={card._id}
                type="button"
                layout
                initial={{ opacity: 0, y: 28, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                onClick={() => onSelect(card._id)}
                disabled={!isMyTurn}
                className={[
                  "shrink-0 rounded-[8px] transition-transform p-1",
                  selected ? "-translate-y-2 ring-4 ring-amber-400 bg-amber-400/20" : "",
                  isMyTurn
                    ? "cursor-pointer hover:-translate-y-1"
                    : "opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                {isPathCard(card.subtype) ? (
                  <TunnelCardView
                    subtype={card.subtype}
                    flipped={selected ? flipped : false}
                    size={60}
                  />
                ) : (
                  <ActionCardView subtype={card.subtype} size={60} />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
        {hand.length === 0 && <span className="text-[#a67c52] font-bold py-6">—</span>}
      </div>
    </div>
  );
}
