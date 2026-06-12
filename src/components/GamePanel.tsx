import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";
import { useLobbyStore } from "../store/lobbyStore.js";
import { getSessionId } from "../lib/session.js";

type Tab = "create" | "join";

const AVATARS_COUNT = 8;

function getAvatarUrl(id: number): string {
  return new URL(`/src/assets/avatars/avatar${id}.png`, import.meta.url).href;
}

function errorToMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("ROOM_NOT_FOUND")) return m.panel_error_not_found();
    if (msg.includes("ROOM_FULL")) return m.panel_error_full();
    if (msg.includes("GAME_ALREADY_STARTED")) return m.panel_error_started();
  }
  return "An unexpected error occurred.";
}

export default function GamePanel() {
  useLocale();
  const navigate = useNavigate();

  const { nickname, avatarId, setNickname, setAvatarId } = useLobbyStore();
  const [tab, setTab] = useState<Tab>("create");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  const handlePrevAvatar = () => {
    setAvatarId(avatarId === 1 ? AVATARS_COUNT : avatarId - 1);
  };

  const handleNextAvatar = () => {
    setAvatarId(avatarId === AVATARS_COUNT ? 1 : avatarId + 1);
  };

  const handleAction = async () => {
    setError(null);

    if (!nickname.trim()) {
      setError(m.panel_nickname_required());
      return;
    }

    if (tab === "join" && !code.trim()) {
      setError(m.panel_code_required());
      return;
    }

    setLoading(true);
    try {
      const sessionId = getSessionId();

      if (tab === "create") {
        const result = await createRoom({ sessionId, nickname: nickname.trim(), avatarId });
        void navigate(`/lobby/${result.code}`);
      } else {
        const result = await joinRoom({ sessionId, nickname: nickname.trim(), avatarId, code });
        void navigate(`/lobby/${result.code}`);
      }
    } catch (err) {
      setError(errorToMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="h-full bg-[#ede0c0] border-4 border-[#5a360a] flex flex-col overflow-hidden rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.6)] font-game"
    >
      <div className="flex bg-[#3e2406]">
        {(["create", "join"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={`flex-1 py-5 uppercase tracking-[0.15em] transition-all cursor-pointer relative text-2xl font-bold border-t-4 ${
              tab === t
                ? "text-[#5a360a] bg-[#ede0c0] border-[#ede0c0]"
                : "text-[#a67c52] bg-[#5a360a] border-transparent hover:bg-[#704612] hover:text-[#e0c4a4]"
            }`}
          >
            {t === "create" ? m.panel_create_tab() : m.panel_join_tab()}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 p-8 flex-1 min-h-0">
        <div className="flex flex-row gap-5 items-stretch mt-2">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.2, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevAvatar}
              className="text-[#5a360a] hover:text-[#22c55e] text-5xl transition-colors cursor-pointer select-none"
            >
              {"<"}
            </motion.button>
            <div className="w-24 h-24 flex items-center justify-center bg-[#c69c6d] border-4 border-[#5a360a] rounded-lg shadow-[inset_0_4px_0_rgba(0,0,0,0.15)] shrink-0 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={avatarId}
                  initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1.15, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  src={getAvatarUrl(avatarId)}
                  alt={`Avatar ${avatarId}`}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
              </AnimatePresence>
            </div>
            <motion.button
              whileHover={{ scale: 1.2, x: 2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextAvatar}
              className="text-[#5a360a] hover:text-[#22c55e] text-5xl transition-colors cursor-pointer select-none"
            >
              {">"}
            </motion.button>
          </div>

          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAction();
            }}
            placeholder={m.panel_nickname_placeholder()}
            maxLength={20}
            className="flex-1 px-6 py-4 bg-[#f8f0e0] border-4 border-[#5a360a] text-[#1e0e04] placeholder-[#a67c52] font-bold focus:outline-none focus:border-[#22c55e] transition-colors rounded-lg text-3xl shadow-[inset_0_4px_0_rgba(0,0,0,0.05)] w-full"
          />
        </div>

        <AnimatePresence>
          {tab === "join" && (
            <motion.div
              key="code-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAction();
                }}
                placeholder={m.panel_room_code_placeholder()}
                maxLength={6}
                className="w-full mt-2 px-4 py-5 bg-[#2b1604] border-4 border-[#5a360a] text-[#fff2d4] placeholder-[#5a360a] tracking-[0.4em] text-center uppercase font-bold focus:outline-none focus:border-[#22c55e] transition-colors rounded-lg text-4xl shadow-[inset_0_4px_0_rgba(0,0,0,0.5)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center text-red-700 text-2xl font-bold bg-red-100 border-2 border-red-400 rounded-lg px-4 py-2"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ y: 0, boxShadow: "0px 6px 0px #166534" }}
          whileHover={loading ? {} : { y: -2, boxShadow: "0px 8px 0px #166534", scale: 1.01 }}
          whileTap={loading ? {} : { y: 6, boxShadow: "0px 0px 0px #166534", scale: 0.98 }}
          onClick={() => void handleAction()}
          disabled={loading}
          className="w-full mt-auto py-6 uppercase tracking-[0.15em] cursor-pointer text-white font-bold text-3xl rounded-xl bg-[#22c55e] border-4 border-[#14532d] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {tab === "create" ? m.panel_create_button() : m.panel_join_button()}
        </motion.button>
      </div>
    </motion.div>
  );
}
