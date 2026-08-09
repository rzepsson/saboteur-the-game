import { useTranslation } from "../../lib/locale.js";
import { getAvatarUrl } from "../../lib/avatar.js";
import { TOOL_ICON, type Tool } from "../../lib/cards.js";
import type { Id } from "../../../convex/_generated/dataModel.js";
import { useGameLabels } from "./labels.js";
import type { PublicPlayer, Role } from "./types.js";

type Props = {
  players: PublicPlayer[];
  currentPlayerId: Id<"players"> | null;
  myPlayerId: Id<"players">;
  myRole: Role;
  rolesRevealed: boolean;
  targetMode: boolean;
  isMyTurn: boolean;
  repairTarget: Id<"players"> | null;
  onTargetPlayer: (id: Id<"players">) => void;
};

// Horizontal strip of player tokens. Doubles as a target picker for broken/repair
// cards (each token becomes clickable when `targetMode` is active on your turn).
export function PlayersStrip({
  players,
  currentPlayerId,
  myPlayerId,
  myRole,
  rolesRevealed,
  targetMode,
  isMyTurn,
  repairTarget,
  onTargetPlayer,
}: Props) {
  const m = useTranslation();
  const { roleLabel } = useGameLabels();

  return (
    <div className="relative z-10 flex gap-2 px-3 py-2 overflow-x-auto custom-scroll bg-[#2b1604] shrink-0">
      {players.map((p) => {
        const isCurrent = p._id === currentPlayerId;
        const isMe = p._id === myPlayerId;
        const clickable = targetMode && isMyTurn;
        const shownRole: Role = isMe ? myRole : rolesRevealed ? p.role : null;
        return (
          <button
            key={p._id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onTargetPlayer(p._id)}
            className={[
              "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border-2 shrink-0 min-w-[72px]",
              isCurrent ? "border-[#22c55e] bg-[#22c55e]/15" : "border-[#5a360a] bg-[#3e2406]",
              clickable ? "cursor-pointer ring-2 ring-amber-400" : "cursor-default",
              repairTarget === p._id ? "ring-2 ring-green-400" : "",
            ].join(" ")}
          >
            <div className="w-10 h-10 rounded-md overflow-hidden border-2 border-[#5a360a]">
              <img
                src={getAvatarUrl(p.avatarId)}
                alt={p.nickname}
                className="w-full h-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <span className="text-[#f0dfc0] text-xs font-bold max-w-[68px] truncate">
              {p.nickname}
            </span>
            <span className="text-[#a67c52] text-[10px] font-bold leading-none">
              {m.game_cards_left({ count: p.handCount })}
            </span>
            <div className="flex gap-0.5 min-h-[16px]">
              {p.brokenTools.map((t) => (
                <span key={t} className="text-xs" title={t}>
                  {TOOL_ICON[t as Tool]}
                </span>
              ))}
            </div>
            {shownRole && (
              <span
                className={`text-[9px] font-bold uppercase px-1 rounded ${
                  shownRole === "saboteur" ? "bg-red-700 text-white" : "bg-[#22c55e] text-white"
                }`}
              >
                {roleLabel(shownRole)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
