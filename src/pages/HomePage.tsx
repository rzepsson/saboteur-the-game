import { motion } from "framer-motion";
import GamePanel from "../components/GamePanel.js";
import HowToPlayPanel from "../components/HowToPlayPanel.js";
import Footer from "../components/Footer.js";
import { SaboteurLogo } from "../components/game/SaboteurLogo.js";
import { useLocale } from "../lib/locale.js";
export default function HomePage() {
  useLocale();

  return (
    <div className="relative min-h-svh lg:h-svh flex flex-col items-center justify-between px-3 sm:px-4 pt-6 sm:pt-8 pb-4 sm:pb-6 gap-4 sm:gap-6 lg:overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0"
      >
        <SaboteurLogo />
      </motion.div>

      {/*
       * Mobile: natural flex-col — panels stack and body scrolls.
       * Desktop (lg): flex-row side-by-side, bounded by flex-1 min-h-0.
       */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-4 sm:gap-6">
        <div className="lg:flex-[1.4] lg:min-h-0">
          <GamePanel />
        </div>
        <div className="lg:flex-1 lg:min-h-0">
          <HowToPlayPanel />
        </div>
      </div>

      <div className="relative z-10 shrink-0">
        <Footer />
      </div>
    </div>
  );
}
