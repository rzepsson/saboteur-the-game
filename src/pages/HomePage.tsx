import { motion } from "framer-motion";
import AnimatedBackground from "../components/AnimatedBackground.js";
import GamePanel from "../components/GamePanel.js";
import HowToPlayPanel from "../components/HowToPlayPanel.js";
import Footer from "../components/Footer.js";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";

function SaboteurLogo() {
  return (
    <div className="flex flex-col items-center gap-3 font-game">
      <div className="flex items-center gap-5">
        <h1
          className="text-[#f0dfc0]"
          style={{
            fontSize: "clamp(3.5rem, 8vw, 6rem)",
            letterSpacing: "0.2em",
            lineHeight: 1,
            textShadow: "6px 6px 0px rgba(0,0,0,0.8), 0px 4px 0px rgba(0,0,0,0.8)",
            userSelect: "none",
          }}
        >
          {m.game_title()}
        </h1>
      </div>

      <svg
        viewBox="0 0 260 14"
        xmlns="http://www.w3.org/2000/svg"
        width={260}
        height={14}
        aria-hidden="true"
      >
        <rect x="0" y="6" width="108" height="4" fill="#5a360a" />
        <rect x="115" y="4" width="6" height="6" fill="#a67c52" />
        <rect x="127" y="2" width="10" height="10" fill="#dfc699" />
        <rect x="143" y="4" width="6" height="6" fill="#a67c52" />
        <rect x="155" y="6" width="105" height="4" fill="#5a360a" />
      </svg>
    </div>
  );
}

export default function HomePage() {
  useLocale();

  return (
    <div className="relative h-svh flex flex-col items-center justify-between px-4 pt-8 pb-6 gap-6 overflow-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0"
      >
        <SaboteurLogo />
      </motion.div>

      <div className="relative z-10 w-full max-w-4xl flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        <div className="flex-[1.4] min-h-0">
          <GamePanel />
        </div>
        <div className="flex-1 min-h-0">
          <HowToPlayPanel />
        </div>
      </div>

      <div className="relative z-10 shrink-0">
        <Footer />
      </div>
    </div>
  );
}
