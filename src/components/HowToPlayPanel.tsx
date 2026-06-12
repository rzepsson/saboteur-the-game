import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";

type TipDef = {
  titleFn: () => string;
  descFn: () => string;
  step: number;
};

const TIPS: TipDef[] = [
  { titleFn: () => m.tip_1_title(), descFn: () => m.tip_1_desc(), step: 1 },
  { titleFn: () => m.tip_2_title(), descFn: () => m.tip_2_desc(), step: 2 },
  { titleFn: () => m.tip_3_title(), descFn: () => m.tip_3_desc(), step: 3 },
];

const PixelChevronLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16 4h-2v2h-2v2h-2v2H8v4h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-4h2V8h2V6h2z" />
  </svg>
);

const PixelChevronRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M8 4h2v2h2v2h2v2h2v4h-2v2h-2v2h-2v2H8v-2h2v-2h2v-2h2v-4h-2V8h-2V6H8z" />
  </svg>
);

export default function HowToPlayPanel() {
  useLocale();
  const [current, setCurrent] = useState(0);
  const tip = TIPS[current];

  // Efekt zależący od 'current' - zresetuje timer, jeśli gracz sam kliknie strzałkę
  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % TIPS.length), 5000);
    return () => clearInterval(id);
  }, [current]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="h-full bg-[#ede0c0] border-4 border-[#5a360a] flex flex-col overflow-hidden rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.6)] font-game"
    >
      <div className="flex bg-[#3e2406] px-8 py-5 border-b-4 border-[#5a360a] items-center gap-4">
        <div className="w-4 h-4 bg-[#a67c52]" />
        <p className="text-[#e0c4a4] uppercase tracking-[0.15em] text-2xl font-bold">
          {m.how_to_play_title()}
        </p>
      </div>

      <div className="flex-1 min-h-0 p-8 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col">
              <p className="text-[#a67c52] uppercase tracking-[0.15em] mb-3 font-bold text-xl">
                {m.tip_step_prefix()} {tip.step}
              </p>
              <h3 className="text-[#1e0e04] font-bold text-3xl mb-4 leading-tight">
                {tip.titleFn()}
              </h3>
              <p className="text-[#5a360a] font-bold text-2xl leading-relaxed">{tip.descFn()}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pt-0 flex items-center gap-5 mt-auto">
        <motion.button
          initial={{ y: 0, boxShadow: "0px 4px 0px #5a360a" }}
          whileHover={current > 0 ? { y: -2, boxShadow: "0px 6px 0px #5a360a" } : {}}
          whileTap={current > 0 ? { y: 4, boxShadow: "0px 0px 0px #5a360a" } : {}}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="w-14 h-14 flex items-center justify-center bg-[#f8f0e0] border-4 border-[#5a360a] rounded-lg text-[#5a360a] disabled:opacity-40 hover:text-[#22c55e] hover:border-[#22c55e] transition-colors cursor-pointer disabled:pointer-events-none"
        >
          <PixelChevronLeft className="w-8 h-8" />
        </motion.button>

        <div className="flex-1 flex items-center justify-center gap-3">
          {TIPS.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setCurrent(i)}
              initial={{ y: 0, boxShadow: "0px 3px 0px #5a360a" }}
              whileHover={{ y: -1, boxShadow: "0px 4px 0px #5a360a" }}
              whileTap={{ y: 3, boxShadow: "0px 0px 0px #5a360a" }}
              animate={{ width: i === current ? 48 : 24 }}
              transition={{ duration: 0.2 }}
              className={`h-6 border-4 border-[#5a360a] rounded-sm cursor-pointer ${
                i === current ? "bg-[#22c55e]" : "bg-[#dfc699]"
              }`}
            />
          ))}
        </div>

        <motion.button
          initial={{ y: 0, boxShadow: "0px 4px 0px #5a360a" }}
          whileHover={current < TIPS.length - 1 ? { y: -2, boxShadow: "0px 6px 0px #5a360a" } : {}}
          whileTap={current < TIPS.length - 1 ? { y: 4, boxShadow: "0px 0px 0px #5a360a" } : {}}
          onClick={() => setCurrent((c) => Math.min(TIPS.length - 1, c + 1))}
          disabled={current === TIPS.length - 1}
          className="w-14 h-14 flex items-center justify-center bg-[#f8f0e0] border-4 border-[#5a360a] rounded-lg text-[#5a360a] disabled:opacity-40 hover:text-[#22c55e] hover:border-[#22c55e] transition-colors cursor-pointer disabled:pointer-events-none"
        >
          <PixelChevronRight className="w-8 h-8" />
        </motion.button>
      </div>
    </motion.div>
  );
}
