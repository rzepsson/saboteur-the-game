import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api.js";
import type { Id } from "../../convex/_generated/dataModel.js";
import { PlayerCard } from "../components/game/PlayerCard.js";
import { RoomCodeBar } from "../components/game/RoomCodeBar.js";
import { SettingsPanel } from "../components/game/SettingsPanel.js";
import { useTranslation } from "../lib/locale.js";
import { getSessionId } from "../lib/session.js";
import playSrc from "../assets/icons/Play.svg";
import exitSrc from "../assets/icons/Exit.svg";

const HEARTBEAT_INTERVAL_MS = 10_000;

export default function LobbyPage() {
  const m = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const sessionId = useRef(getSessionId()).current;

  // M2: no cast — Convex infers the return type directly from the query definition
  const room = useQuery(api.rooms.get, { code: code ?? "" });
  // C1 fix: getMyPlayer returns only our own identity — sessionId stays on the client,
  // never broadcast to other subscribers via the get query
  const myPlayer = useQuery(api.rooms.getMyPlayer, { code: code ?? "", sessionId });

  const leaveRoom = useMutation(api.rooms.leave);
  const sendHeartbeat = useMutation(api.rooms.heartbeat);
  const kickPlayer = useMutation(api.rooms.kickPlayer);
  const transferHost = useMutation(api.rooms.transferHost);
  const startGame = useMutation(api.games.startGame);

  const [kickingPlayer, setKickingPlayer] = useState<Id<"players"> | null>(null);
  const [transferringTo, setTransferringTo] = useState<Id<"players"> | null>(null);
  const [starting, setStarting] = useState(false);

  const isHost = myPlayer?.isHost ?? false;
  const playerCount = room?.players.length ?? 0;
  const canStart = isHost && playerCount >= 3;
  const roomId = room?._id;

  /* Track if the user was ever in this room (to distinguish link visits from kicks) */
  const wasEverInRoom = useRef(false);
  useEffect(() => {
    if (myPlayer !== undefined && myPlayer !== null) {
      wasEverInRoom.current = true;
    }
  }, [myPlayer]);

  /* Redirect when player is absent from the room:
   * - never was here (direct link visit) → send to join form with pre-filled code
   * - was here but disappeared (kicked / host cleanup) → send to home */
  useEffect(() => {
    if (room === undefined || room === null) return;
    if (myPlayer === undefined) return; // still loading identity
    if (myPlayer !== null) return; // still in room
    if (wasEverInRoom.current) {
      void navigate("/", { replace: true });
    } else {
      void navigate(`/?code=${room.code}`, { replace: true });
    }
  }, [room, myPlayer, navigate]);

  /* Periodic keep-alive — cron removes players after 45 s of silence */
  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => {
      void sendHeartbeat({ sessionId, roomId });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [roomId, sendHeartbeat, sessionId]);

  /* When the host starts the game, every client moves to the game page */
  useEffect(() => {
    if (room && room.status === "playing") {
      void navigate(`/game/${room.code}`, { replace: true });
    }
  }, [room, navigate]);

  const handleStart = () => {
    if (!canStart || starting) return;
    setStarting(true);
    startGame({ sessionId, code: room?.code ?? "" })
      .catch(console.error)
      .finally(() => setStarting(false));
  };

  const handleLeave = async () => {
    if (room) {
      await leaveRoom({ sessionId, roomId: room._id });
    }
    void navigate("/");
  };

  // C1 fix: target identified by document _id, not sessionId
  const handleKick = (targetPlayerId: Id<"players">) => {
    if (!room || kickingPlayer) return;
    setKickingPlayer(targetPlayerId);
    kickPlayer({ sessionId, roomId: room._id, targetPlayerId })
      .catch(console.error)
      .finally(() => setKickingPlayer(null));
  };

  const handleTransferHost = (targetPlayerId: Id<"players">) => {
    if (!room || transferringTo) return;
    setTransferringTo(targetPlayerId);
    transferHost({ sessionId, roomId: room._id, targetPlayerId })
      .catch(console.error)
      .finally(() => setTransferringTo(null));
  };

  /* ── Loading ── */
  if (room === undefined) {
    return (
      <div className="relative h-svh flex items-center justify-center font-game">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 bg-[#ede0c0] border-4 border-[#5a360a] rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.6)] px-10 py-8 text-center"
        >
          <p className="text-[#1e0e04] font-bold text-3xl sm:text-4xl tracking-widest">
            {m.lobby_loading()}
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── Room not found ── */
  if (room === null) {
    return (
      <div className="relative h-svh flex flex-col items-center justify-center gap-8 font-game px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 text-center flex flex-col items-center gap-6 bg-[#ede0c0] border-4 border-[#5a360a] rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.6)] px-10 py-10"
        >
          <p className="text-4xl sm:text-5xl font-game font-bold text-[#1e0e04]">
            {m.lobby_not_found_title()}
          </p>
          <Link
            to="/"
            className="px-8 py-4 bg-[#22c55e] text-white font-bold text-xl sm:text-2xl rounded-xl border-4 border-[#14532d] shadow-[0px_6px_0px_#166534] hover:shadow-[0px_4px_0px_#166534] hover:translate-y-0.5 transition-all uppercase tracking-widest"
          >
            {m.lobby_return_home()}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-svh flex flex-col items-center px-3 sm:px-4 pt-4 sm:pt-6 pb-4 sm:pb-5 gap-3 sm:gap-5 overflow-hidden font-game">
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
              {room.players.map((player) => {
                const isSelf = player._id === myPlayer?._id;
                const isBeingKicked = kickingPlayer === player._id;
                const isReceivingHost = transferringTo === player._id;
                return (
                  <PlayerCard
                    key={player._id}
                    player={player}
                    isSelf={isSelf}
                    onKick={
                      isHost && !isSelf && !isBeingKicked ? () => handleKick(player._id) : undefined
                    }
                    onTransferHost={
                      isHost && !isSelf && !isReceivingHost
                        ? () => handleTransferHost(player._id)
                        : undefined
                    }
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: settings + action buttons */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-1 lg:min-h-0">
          {/* Settings — on desktop inner-scrollable (scroll is inside the card itself) */}
          <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
            <SettingsPanel room={room} isHost={isHost} sessionId={sessionId} />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 shrink-0">
            {isHost ? (
              <>
                {!canStart && (
                  <p className="text-center text-[#f0dfc0] font-bold text-lg sm:text-xl [text-shadow:0_2px_6px_rgba(0,0,0,1),0_1px_3px_rgba(0,0,0,0.9)]">
                    {m.lobby_min_players_hint()}
                  </p>
                )}
                <motion.button
                  initial={{ y: 0, boxShadow: "0px 6px 0px #166534" }}
                  whileHover={
                    canStart ? { y: -2, boxShadow: "0px 8px 0px #166534", scale: 1.01 } : {}
                  }
                  whileTap={canStart ? { y: 6, boxShadow: "0px 0px 0px #166534", scale: 0.98 } : {}}
                  disabled={!canStart || starting}
                  onClick={handleStart}
                  className="w-full py-4 sm:py-5 uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-3 text-white font-bold text-2xl sm:text-3xl rounded-xl bg-[#22c55e] border-4 border-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {starting ? m.game_starting() : m.lobby_start_button()}
                  <img
                    src={playSrc}
                    alt=""
                    aria-hidden="true"
                    className="h-5 sm:h-6 w-auto shrink-0"
                    style={{ imageRendering: "pixelated" }}
                  />
                </motion.button>
              </>
            ) : (
              <div className="w-full py-4 sm:py-5 text-center text-[#a67c52] font-bold text-xl sm:text-2xl rounded-xl bg-[#ede0c0] border-4 border-[#c69c6d]">
                {m.lobby_waiting_label()}
              </div>
            )}

            <motion.button
              initial={{ y: 0, boxShadow: "0px 4px 0px #3e2406" }}
              whileHover={{ y: -1, boxShadow: "0px 5px 0px #3e2406", scale: 1.01 }}
              whileTap={{ y: 4, boxShadow: "0px 0px 0px #3e2406", scale: 0.98 }}
              onClick={() => void handleLeave()}
              className="w-full py-3 uppercase tracking-[0.15em] cursor-pointer flex items-center justify-center gap-3 text-[#f0dfc0] font-bold text-xl sm:text-2xl rounded-xl bg-[#5a360a] border-4 border-[#3e2406] transition-opacity"
            >
              <img
                src={exitSrc}
                alt=""
                aria-hidden="true"
                className="h-5 sm:h-6 w-auto shrink-0"
                style={{ imageRendering: "pixelated" }}
              />
              {m.lobby_leave_button()}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
