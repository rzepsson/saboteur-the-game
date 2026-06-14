import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../lib/locale.js";

interface RoomCodeBarProps {
  code: string;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export function RoomCodeBar({ code }: RoomCodeBarProps) {
  const m = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[#f0dfc0] font-bold text-lg sm:text-xl uppercase tracking-widest [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
        {m.lobby_code_label()}
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        <span
          className="font-bold tracking-[0.4em] text-[#1e0e04] bg-[#f8f0e0] border-4 border-[#5a360a] rounded-xl px-4 sm:px-6 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
          style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)" }}
        >
          {code}
        </span>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => void handleCopy()}
          className="px-3 sm:px-4 py-2 bg-[#5a360a] text-[#f0dfc0] font-bold text-lg sm:text-xl rounded-xl border-2 border-[#3e2406] cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:bg-[#704612] transition-colors"
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
      <p className="text-[#e0c4a4] text-base sm:text-lg [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
        {m.lobby_share_hint()}
      </p>
    </div>
  );
}
