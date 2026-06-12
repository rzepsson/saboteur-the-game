import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";

type Tab = "create" | "join";

const AVATARS_COUNT = 8;

export default function GamePanel() {
  useLocale();
  const [tab, setTab] = useState<Tab>("create");
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");

  const getAvatarUrl = (id: number) => {
    return new URL(`/src/assets/avatars/avatar${id}.png`, import.meta.url).href;
  };

  const handlePrevAvatar = () => {
    setSelectedAvatar((prev) => (prev === 1 ? AVATARS_COUNT : prev - 1));
  };

  const handleNextAvatar = () => {
    setSelectedAvatar((prev) => (prev === AVATARS_COUNT ? 1 : prev + 1));
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
            onClick={() => setTab(t)}
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
                  key={selectedAvatar}
                  initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1.15, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  src={getAvatarUrl(selectedAvatar)}
                  alt={`Avatar ${selectedAvatar}`}
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
            onChange={(e) => setNickname(e.target.value)}
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
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={m.panel_room_code_placeholder()}
                maxLength={6}
                className="w-full mt-2 px-4 py-5 bg-[#2b1604] border-4 border-[#5a360a] text-[#fff2d4] placeholder-[#5a360a] tracking-[0.4em] text-center uppercase font-bold focus:outline-none focus:border-[#22c55e] transition-colors rounded-lg text-4xl shadow-[inset_0_4px_0_rgba(0,0,0,0.5)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ y: 0, boxShadow: "0px 6px 0px #166534" }}
          whileHover={{ y: -2, boxShadow: "0px 8px 0px #166534", scale: 1.01 }}
          whileTap={{ y: 6, boxShadow: "0px 0px 0px #166534", scale: 0.98 }}
          className="w-full mt-auto py-6 uppercase tracking-[0.15em] cursor-pointer text-white font-bold text-3xl rounded-xl bg-[#22c55e] border-4 border-[#14532d]"
        >
          {tab === "create" ? m.panel_create_button() : m.panel_join_button()}
        </motion.button>
      </div>
    </motion.div>
  );
}
