import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../lib/locale.js";
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
  const m = useTranslation();

  // M5: click-to-confirm pattern — first click arms the action, second executes it.
  // M1: removed duplicate kickPending/hostPending state; LobbyPage already guards the callbacks.
  const [kickConfirm, setKickConfirm] = useState(false);
  const [hostConfirm, setHostConfirm] = useState(false);

  // Auto-cancel confirmation after 3 s if user doesn't follow through
  useEffect(() => {
    if (!kickConfirm) return;
    const id = setTimeout(() => setKickConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [kickConfirm]);

  useEffect(() => {
    if (!hostConfirm) return;
    const id = setTimeout(() => setHostConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [hostConfirm]);

  const handleKickClick = () => {
    if (!onKick) return;
    if (kickConfirm) {
      setKickConfirm(false);
      onKick();
    } else {
      setKickConfirm(true);
    }
  };

  const handleHostClick = () => {
    if (!onTransferHost) return;
    if (hostConfirm) {
      setHostConfirm(false);
      onTransferHost();
    } else {
      setHostConfirm(true);
    }
  };

  const showActions = !isSelf && (onKick ?? onTransferHost);

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
              whileHover={!hostConfirm ? { scale: 1.12, y: -1 } : { scale: 1.05 }}
              whileTap={{ scale: 0.88 }}
              onClick={handleHostClick}
              title={hostConfirm ? m.lobby_confirm_action() : m.lobby_make_host()}
              aria-label={hostConfirm ? m.lobby_confirm_action() : m.lobby_make_host()}
              className={[
                "w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer",
                hostConfirm
                  ? "bg-[#f59e0b] border-[#b45309] shadow-[0px_3px_0px_#b45309] hover:shadow-[0px_1px_0px_#b45309] hover:translate-y-0.5 animate-pulse"
                  : "bg-[#b8860b] border-[#7c5d0a] shadow-[0px_3px_0px_#7c5d0a] hover:shadow-[0px_1px_0px_#7c5d0a] hover:translate-y-0.5",
              ].join(" ")}
            >
              <AnimatePresence mode="wait">
                {hostConfirm ? (
                  <motion.span
                    key="confirm"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-white font-bold text-sm leading-none"
                  >
                    ?
                  </motion.span>
                ) : (
                  <motion.img
                    key="icon"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    src={bookmarkSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          )}
          {onKick && (
            <motion.button
              whileHover={!kickConfirm ? { scale: 1.12, y: -1 } : { scale: 1.05 }}
              whileTap={{ scale: 0.88 }}
              onClick={handleKickClick}
              title={kickConfirm ? m.lobby_confirm_action() : m.lobby_kick()}
              aria-label={kickConfirm ? m.lobby_confirm_action() : m.lobby_kick()}
              className={[
                "w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer",
                kickConfirm
                  ? "bg-[#f59e0b] border-[#b45309] shadow-[0px_3px_0px_#b45309] hover:shadow-[0px_1px_0px_#b45309] hover:translate-y-0.5 animate-pulse"
                  : "bg-[#dc2626] border-[#991b1b] shadow-[0px_3px_0px_#991b1b] hover:shadow-[0px_1px_0px_#991b1b] hover:translate-y-0.5",
              ].join(" ")}
            >
              <AnimatePresence mode="wait">
                {kickConfirm ? (
                  <motion.span
                    key="confirm"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-white font-bold text-sm leading-none"
                  >
                    ?
                  </motion.span>
                ) : (
                  <motion.img
                    key="icon"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    src={personCrossedSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}
