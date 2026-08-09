import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "../lib/locale.js";

export default function NotFoundPage() {
  const m = useTranslation();
  return (
    <div className="relative h-svh flex flex-col items-center justify-center gap-8 font-game px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 text-center flex flex-col items-center gap-6 bg-[#ede0c0] border-4 border-[#5a360a] rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.6)] px-10 py-10"
      >
        <p className="text-8xl font-bold text-[#5a360a] leading-none">404</p>
        <p className="text-4xl sm:text-5xl font-bold text-[#1e0e04]">{m.not_found_title()}</p>
        <Link
          to="/"
          className="px-8 py-4 bg-[#22c55e] text-white font-bold text-xl sm:text-2xl rounded-xl border-4 border-[#14532d] shadow-[0px_6px_0px_#166534] hover:shadow-[0px_4px_0px_#166534] hover:translate-y-0.5 transition-all uppercase tracking-widest"
        >
          {m.not_found_back()}
        </Link>
      </motion.div>
    </div>
  );
}
