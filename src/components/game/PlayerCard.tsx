import { useState } from "react";
import { motion } from "framer-motion";
import { m } from "../../paraglide/messages.js";
import { useLocale } from "../../lib/locale.js";
import { getAvatarUrl } from "../../lib/avatar.js";
import type { Player } from "../../types/game.js";
import bookmarkSrc from "../../assets/icons/Bookmark.svg";
import personCrossedSrc from "../../assets/icons/Person-Crossed.svg";

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
  onKick?: () => void;
  onTransferHost?: () => void;
}

export function PlayerCard({ player, isSelf, onKick, onTransferHost }: PlayerCardProps) {
  useLocale();
  const [kickPending, setKickPending] = useState(false);
  const [hostPending, setHostPending] = useState(false);
  const showActions = !isSelf && (onKick ?? onTransferHost);

  const handleKick = () => {
    if (kickPending || !onKick) return;
    setKickPending(true);
    onKick();
    // Safety reset — card unmounts on success, this fires only if mutation fails
    setTimeout(() => setKickPending(false), 3000);
  };

  const handleTransferHost = () => {
    if (hostPending || !onTransferHost) return;
    setHostPending(true);
    onTransferHost();
    setTimeout(() => setHostPending(false), 3000);
  };

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

      {showActions && (
        <div className="flex flex-col gap-2 shrink-0">
          {onTransferHost && (
            <motion.button
              whileHover={!hostPending ? { scale: 1.12, y: -1 } : {}}
              whileTap={!hostPending ? { scale: 0.88 } : {}}
              onClick={handleTransferHost}
              disabled={hostPending}
              title={m.lobby_make_host()}
              aria-label={m.lobby_make_host()}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 bg-[#b8860b] border-[#7c5d0a] shadow-[0px_3px_0px_#7c5d0a] hover:shadow-[0px_1px_0px_#7c5d0a] hover:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <img
                src={bookmarkSrc}
                alt=""
                aria-hidden="true"
                className="w-4 h-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.button>
          )}
          {onKick && (
            <motion.button
              whileHover={!kickPending ? { scale: 1.12, y: -1 } : {}}
              whileTap={!kickPending ? { scale: 0.88 } : {}}
              onClick={handleKick}
              disabled={kickPending}
              title={m.lobby_kick()}
              aria-label={m.lobby_kick()}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 bg-[#dc2626] border-[#991b1b] shadow-[0px_3px_0px_#991b1b] hover:shadow-[0px_1px_0px_#991b1b] hover:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <img
                src={personCrossedSrc}
                alt=""
                aria-hidden="true"
                className="w-4 h-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}
