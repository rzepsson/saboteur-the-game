import { motion } from "framer-motion";
import { m } from "../../paraglide/messages.js";
import { useLocale } from "../../lib/locale.js";
import { getAvatarUrl } from "../../lib/avatar.js";
import type { Player } from "../../types/game.js";

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
}

export function PlayerCard({ player, isSelf }: PlayerCardProps) {
  useLocale();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -12 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="flex items-center gap-4 bg-[#f8f0e0] border-2 border-[#c69c6d] rounded-xl px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,0.15)]"
    >
      <div className="relative shrink-0">
        <div
          className={`w-14 h-14 ${player.isHost ? "bg-[#ffd700] border-[#b8860b]" : "bg-[#c69c6d]"} border-2 border-[#5a360a] rounded-lg overflow-hidden`}
        >
          <img
            src={getAvatarUrl(player.avatarId)}
            alt={player.nickname}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[#1e0e04] font-bold text-2xl truncate leading-tight">
          {player.nickname}
        </p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {player.isHost && (
            <span className="text-xs font-bold bg-[#5a360a] text-[#f0dfc0] px-2 py-0.5 rounded uppercase tracking-wider">
              {m.lobby_host_badge()}
            </span>
          )}
          {isSelf && (
            <span className="text-xs font-bold bg-[#22c55e] text-white px-2 py-0.5 rounded uppercase tracking-wider">
              {m.lobby_you_badge()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
