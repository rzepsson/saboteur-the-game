import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api.js";
import type { Id } from "../../convex/_generated/dataModel.js";
import AnimatedBackground from "../components/AnimatedBackground.js";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";
import { getSessionId } from "../lib/session.js";

const AVATARS_COUNT = 8;
const HEARTBEAT_INTERVAL_MS = 10_000;

function getAvatarUrl(id: number): string {
  const clamped = Math.min(AVATARS_COUNT, Math.max(1, id));
  return new URL(`/src/assets/avatars/avatar${clamped}.png`, import.meta.url).href;
}

type Player = {
  _id: Id<"players">;
  sessionId: string;
  nickname: string;
  avatarId: number;
  isHost: boolean;
};

type RoomSettings = {
  maxPlayers: number;
  numberOfRounds?: number;
  turnTimeLimitSeconds?: number | null;
  enableBrokenToolPenalty?: boolean;
};

type Room = {
  _id: Id<"rooms">;
  code: string;
  hostSessionId: string;
  status: "waiting" | "starting" | "playing";
  settings: RoomSettings;
  players: Player[];
};

function resolveSettings(s: RoomSettings): Required<RoomSettings> {
  return {
    maxPlayers: s.maxPlayers,
    numberOfRounds: s.numberOfRounds ?? 3,
    turnTimeLimitSeconds: s.turnTimeLimitSeconds ?? 60,
    enableBrokenToolPenalty: s.enableBrokenToolPenalty ?? false,
  };
}

function PlayerCard({ player, isSelf }: { player: Player; isSelf: boolean }) {
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
        <div className="w-14 h-14 bg-[#c69c6d] border-2 border-[#5a360a] rounded-lg overflow-hidden">
          <img
            src={getAvatarUrl(player.avatarId)}
            alt={player.nickname}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        {player.isHost && (
          <span className="absolute -top-2 -right-2 text-base leading-none">👑</span>
        )}
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

const TURN_TIME_OPTIONS: Array<number | null> = [null, 30, 60, 90, 120];

function StepperRow({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[#5a360a] font-bold text-xl">{label}</span>
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={!disabled && value > min ? { scale: 1.15 } : {}}
          whileTap={!disabled && value > min ? { scale: 0.9 } : {}}
          onClick={() => !disabled && onChange(value - 1)}
          disabled={disabled || value <= min}
          className="w-10 h-10 flex items-center justify-center bg-[#5a360a] text-[#f0dfc0] font-bold text-2xl rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          −
        </motion.button>
        <span className="text-[#1e0e04] font-bold text-4xl w-8 text-center tabular-nums">
          {value}
        </span>
        <motion.button
          whileHover={!disabled && value < max ? { scale: 1.15 } : {}}
          whileTap={!disabled && value < max ? { scale: 0.9 } : {}}
          onClick={() => !disabled && onChange(value + 1)}
          disabled={disabled || value >= max}
          className="w-10 h-10 flex items-center justify-center bg-[#5a360a] text-[#f0dfc0] font-bold text-2xl rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          +
        </motion.button>
      </div>
    </div>
  );
}

function SettingsPanel({
  room,
  isHost,
  sessionId,
}: {
  room: Room;
  isHost: boolean;
  sessionId: string;
}) {
  useLocale();
  const updateSettings = useMutation(api.rooms.updateSettings);
  const resolved = resolveSettings(room.settings);
  const { maxPlayers, numberOfRounds, turnTimeLimitSeconds, enableBrokenToolPenalty } = resolved;
  const playerCount = room.players.length;

  const update = (partial: Partial<Required<RoomSettings>>) => {
    void updateSettings({
      sessionId,
      roomId: room._id,
      settings: { ...resolved, ...partial },
    });
  };

  return (
    <div className="bg-[#f8f0e0] border-2 border-[#c69c6d] rounded-xl p-5 shadow-[3px_3px_0px_rgba(0,0,0,0.15)]">
      <h3 className="text-[#5a360a] font-bold text-2xl uppercase tracking-wider mb-4 border-b-2 border-[#c69c6d] pb-2">
        {m.lobby_settings_title()}
      </h3>

      <div className="flex flex-col gap-5">
        {/* Max players */}
        <StepperRow
          label={m.lobby_max_players_label()}
          value={maxPlayers}
          min={Math.max(3, playerCount)}
          max={10}
          disabled={!isHost}
          onChange={(next) => update({ maxPlayers: next })}
        />

        {/* Number of rounds */}
        <StepperRow
          label={m.lobby_rounds_label()}
          value={numberOfRounds}
          min={1}
          max={3}
          disabled={!isHost}
          onChange={(next) => update({ numberOfRounds: next })}
        />

        {/* Turn time limit */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[#5a360a] font-bold text-xl">{m.lobby_turn_time_label()}</span>
          <div className="flex flex-wrap gap-2">
            {TURN_TIME_OPTIONS.map((val) => {
              const active = turnTimeLimitSeconds === val;
              return (
                <motion.button
                  key={val ?? "inf"}
                  whileHover={isHost && !active ? { scale: 1.08 } : {}}
                  whileTap={isHost && !active ? { scale: 0.93 } : {}}
                  onClick={() => isHost && update({ turnTimeLimitSeconds: val })}
                  disabled={!isHost}
                  className={[
                    "px-3 py-1.5 rounded-lg font-bold text-xl border-2 transition-colors",
                    "disabled:cursor-not-allowed",
                    active
                      ? "bg-[#5a360a] text-[#f0dfc0] border-[#3e2406]"
                      : "bg-transparent text-[#5a360a] border-[#c69c6d] cursor-pointer hover:border-[#5a360a]",
                  ].join(" ")}
                >
                  {val === null ? m.lobby_turn_time_unlimited() : `${val}s`}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Broken tool penalty */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[#5a360a] font-bold text-xl">
            {m.lobby_broken_tool_penalty_label()}
          </span>
          <p className="text-[#a67c52] text-base leading-snug">
            {m.lobby_broken_tool_penalty_desc()}
          </p>
          <motion.button
            whileHover={isHost ? { scale: 1.04 } : {}}
            whileTap={isHost ? { scale: 0.96 } : {}}
            onClick={() => isHost && update({ enableBrokenToolPenalty: !enableBrokenToolPenalty })}
            disabled={!isHost}
            className={[
              "self-start px-5 py-2 rounded-lg font-bold text-xl border-2 transition-colors",
              "disabled:cursor-not-allowed",
              enableBrokenToolPenalty
                ? "bg-[#22c55e] text-white border-[#14532d] cursor-pointer"
                : "bg-[#f8f0e0] text-[#5a360a] border-[#c69c6d] cursor-pointer",
            ].join(" ")}
          >
            {enableBrokenToolPenalty ? m.lobby_setting_on() : m.lobby_setting_off()}
          </motion.button>
        </div>

        {!isHost && <p className="text-[#a67c52] text-lg italic">{m.lobby_host_only_hint()}</p>}
      </div>
    </div>
  );
}

function RoomCodeBar({ code, onCopy }: { code: string; onCopy: () => void }) {
  useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[#a67c52] font-bold text-xl uppercase tracking-widest">
        {m.lobby_code_label()}
      </p>
      <div className="flex items-center gap-3">
        <span
          className="font-bold tracking-[0.4em] text-[#1e0e04] bg-[#f8f0e0] border-4 border-[#5a360a] rounded-xl px-6 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
          style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
        >
          {code}
        </span>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => void handleCopy()}
          className="px-4 py-2 bg-[#5a360a] text-[#f0dfc0] font-bold text-xl rounded-xl border-2 border-[#3e2406] cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:bg-[#704612] transition-colors"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={copied ? "copied" : "copy"}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="block"
            >
              {copied ? m.lobby_copied() : m.lobby_copy()}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      <p className="text-[#a67c52] text-lg">{m.lobby_share_hint()}</p>
    </div>
  );
}

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

  // Periodic heartbeat — stops when component unmounts, cron cleans up stale players
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

  // — Loading —
  if (room === undefined) {
    return (
      <div className="relative h-svh flex items-center justify-center font-game text-[#f0dfc0]">
        <AnimatedBackground />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 text-4xl tracking-widest"
        >
          {m.lobby_loading()}
        </motion.p>
      </div>
    );
  }

  // — Room not found —
  if (room === null) {
    return (
      <div className="relative h-svh flex flex-col items-center justify-center gap-8 font-game text-[#f0dfc0] px-4">
        <AnimatedBackground />
        <div className="relative z-10 text-center flex flex-col items-center gap-6">
          <p className="text-5xl font-bold">{m.lobby_not_found_title()}</p>
          <Link
            to="/"
            className="px-8 py-4 bg-[#22c55e] text-white font-bold text-2xl rounded-xl border-4 border-[#14532d] shadow-[0px_6px_0px_#166534] hover:shadow-[0px_4px_0px_#166534] hover:translate-y-0.5 transition-all uppercase tracking-widest"
          >
            {m.lobby_return_home()}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-svh flex flex-col items-center px-4 pt-6 pb-5 gap-5 overflow-hidden font-game">
      <AnimatedBackground />

      {/* Room code */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0"
      >
        <RoomCodeBar code={room.code} onCopy={() => {}} />
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="relative z-10 w-full max-w-3xl flex-1 min-h-0 flex flex-col lg:flex-row gap-4"
      >
        {/* Player list */}
        <div className="flex-[1.3] min-h-0 flex flex-col bg-[#ede0c0] border-4 border-[#5a360a] rounded-xl shadow-[6px_6px_0px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="bg-[#3e2406] px-5 py-3 flex items-center justify-between shrink-0">
            <h2 className="text-[#f0dfc0] font-bold text-2xl uppercase tracking-wider">
              {m.lobby_players_title()}
            </h2>
            <span className="text-[#a67c52] font-bold text-2xl">
              {playerCount}/{room.settings.maxPlayers}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
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
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SettingsPanel room={room} isHost={isHost} sessionId={sessionId} />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 shrink-0">
            {isHost ? (
              <>
                {!canStart && (
                  <p className="text-center text-[#a67c52] font-bold text-xl">
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
                  className="w-full py-5 uppercase tracking-[0.15em] cursor-pointer text-white font-bold text-3xl rounded-xl bg-[#22c55e] border-4 border-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {m.lobby_start_button()}
                </motion.button>
              </>
            ) : (
              <div className="w-full py-5 text-center text-[#a67c52] font-bold text-2xl rounded-xl bg-[#ede0c0] border-4 border-[#c69c6d]">
                {m.lobby_waiting_label()}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void handleLeave()}
              className="w-full py-3 uppercase tracking-[0.15em] cursor-pointer text-[#5a360a] font-bold text-2xl rounded-xl bg-transparent border-4 border-[#5a360a] hover:bg-[#5a360a] hover:text-[#f0dfc0] transition-colors"
            >
              {m.lobby_leave_button()}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
