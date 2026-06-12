import { useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api.js";
import AnimatedBackground from "../components/AnimatedBackground.js";
import { PlayerCard } from "../components/game/PlayerCard.js";
import { RoomCodeBar } from "../components/game/RoomCodeBar.js";
import { SettingsPanel } from "../components/game/SettingsPanel.js";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";
import { getSessionId } from "../lib/session.js";
import type { Room } from "../types/game.js";

const HEARTBEAT_INTERVAL_MS = 10_000;

export default function LobbyPage() {
  useLocale();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const sessionId = useRef(getSessionId()).current;

  const room = useQuery(api.rooms.get, { code: code ?? "" }) as Room | null | undefined;
  const leaveRoom = useMutation(api.rooms.leave);
  const sendHeartbeat = useMutation(api.rooms.heartbeat);

  const self = room?.players.find((p) => p.sessionId === sessionId) ?? null;
  const isHost = self?.isHost ?? false;
  const playerCount = room?.players.length ?? 0;
  const canStart = isHost && playerCount >= 3;
  const roomId = room?._id;

  /* Periodic keep-alive — cron removes players after 45 s of silence */
  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => {
      void sendHeartbeat({ sessionId, roomId });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roomId, sendHeartbeat, sessionId]);

  const handleLeave = async () => {
    if (room) {
      await leaveRoom({ sessionId, roomId: room._id });
    }
    void navigate("/");
  };

  /* ── Loading ── */
  if (room === undefined) {
    return (
      <div className="relative h-svh flex items-center justify-center font-game text-[#f0dfc0]">
        <AnimatedBackground variant="cave" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 text-3xl sm:text-4xl tracking-widest"
        >
          {m.lobby_loading()}
        </motion.p>
      </div>
    );
  }

  /* ── Room not found ── */
  if (room === null) {
    return (
      <div className="relative h-svh flex flex-col items-center justify-center gap-8 font-game text-[#f0dfc0] px-4">
        <AnimatedBackground variant="cave" />
        <div className="relative z-10 text-center flex flex-col items-center gap-6">
          <p className="text-4xl sm:text-5xl font-bold">{m.lobby_not_found_title()}</p>
          <Link
            to="/"
            className="px-8 py-4 bg-[#22c55e] text-white font-bold text-xl sm:text-2xl rounded-xl border-4 border-[#14532d] shadow-[0px_6px_0px_#166534] hover:shadow-[0px_4px_0px_#166534] hover:translate-y-0.5 transition-all uppercase tracking-widest"
          >
            {m.lobby_return_home()}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-svh flex flex-col items-center px-3 sm:px-4 pt-4 sm:pt-6 pb-4 sm:pb-5 gap-3 sm:gap-5 overflow-hidden font-game">
      <AnimatedBackground />

      {/* Room code */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0"
      >
        <RoomCodeBar code={room.code} />
      </motion.div>

      {/*
       * Mobile : single scrollable column (overflow-y-auto on this wrapper).
       *          Player list and settings expand to natural height, no inner scroll.
       * Desktop: two-column flex-row. Each column manages its own inner overflow.
       */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="relative z-10 w-full max-w-3xl flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-y-auto lg:overflow-hidden custom-scroll"
      >
        {/* Player list */}
        <div className="flex flex-col bg-[#ede0c0] border-4 border-[#5a360a] rounded-xl shadow-[6px_6px_0px_rgba(0,0,0,0.5)] overflow-hidden lg:flex-[1.3] lg:min-h-0 shrink-0 lg:shrink">
          <div className="bg-[#3e2406] px-4 sm:px-5 py-3 flex items-center justify-between shrink-0">
            <h2 className="text-[#f0dfc0] font-bold text-xl sm:text-2xl uppercase tracking-wider">
              {m.lobby_players_title()}
            </h2>
            <span className="text-[#a67c52] font-bold text-xl sm:text-2xl">
              {playerCount}/{room.settings.maxPlayers}
            </span>
          </div>

          {/* Mobile: natural height | Desktop: inner scroll */}
          <div className="p-3 sm:p-4 flex flex-col gap-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:custom-scroll">
            <AnimatePresence>
              {room.players.map((player) => (
                <PlayerCard
                  key={player._id}
                  player={player}
                  isSelf={player.sessionId === sessionId}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: settings + action buttons */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-1 lg:min-h-0">
          {/* Settings — on desktop inner-scrollable */}
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:custom-scroll">
            <SettingsPanel room={room} isHost={isHost} sessionId={sessionId} />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 shrink-0">
            {isHost ? (
              <>
                {!canStart && (
                  <p className="text-center text-[#a67c52] font-bold text-lg sm:text-xl">
                    {m.lobby_min_players_hint()}
                  </p>
                )}
                <motion.button
                  initial={{ y: 0, boxShadow: "0px 6px 0px #166534" }}
                  whileHover={
                    canStart ? { y: -2, boxShadow: "0px 8px 0px #166534", scale: 1.01 } : {}
                  }
                  whileTap={canStart ? { y: 6, boxShadow: "0px 0px 0px #166534", scale: 0.98 } : {}}
                  disabled={!canStart}
                  className="w-full py-4 sm:py-5 uppercase tracking-[0.15em] cursor-pointer text-white font-bold text-2xl sm:text-3xl rounded-xl bg-[#22c55e] border-4 border-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {m.lobby_start_button()}
                </motion.button>
              </>
            ) : (
              <div className="w-full py-4 sm:py-5 text-center text-[#a67c52] font-bold text-xl sm:text-2xl rounded-xl bg-[#ede0c0] border-4 border-[#c69c6d]">
                {m.lobby_waiting_label()}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleLeave()}
              className="w-full py-3 uppercase tracking-[0.15em] cursor-pointer text-[#5a360a] font-bold text-xl sm:text-2xl rounded-xl bg-transparent border-4 border-[#5a360a] hover:bg-[#5a360a] hover:text-[#f0dfc0] transition-colors"
            >
              {m.lobby_leave_button()}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
