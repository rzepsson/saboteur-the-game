import { motion } from "framer-motion";
import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";
import { locales } from "../paraglide/runtime.js";

export default function Footer() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 font-game">
      <div className="flex bg-[#3e2406] border-4 border-[#5a360a] rounded-lg shadow-[4px_4px_0_rgba(0,0,0,0.6)] overflow-hidden">
        {locales.map((lang, index) => (
          <motion.button
            key={lang}
            onClick={() => setLocale(lang)}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2 text-xl font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer ${
              locale === lang
                ? "bg-[#dfc699] text-[#5a360a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.1)]"
                : "text-[#a67c52] hover:bg-[#704612] hover:text-[#e0c4a4]"
            } ${index !== locales.length - 1 ? "border-r-4 border-[#5a360a]" : ""}`}
          >
            {lang}
          </motion.button>
        ))}
      </div>

      <div className="bg-[#2b1604] border-4 border-[#5a360a] rounded-lg px-6 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.6)] flex items-center">
        <span className="text-[#a67c52] text-xl font-bold tracking-widest uppercase">
          © {new Date().getFullYear()} Saboteur ·{" "}
          <span className="text-[#dfc699]">{m.footer_rights()}</span>
        </span>
      </div>
    </div>
  );
}
