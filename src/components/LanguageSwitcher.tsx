import { motion } from "framer-motion";
import { locales } from "../paraglide/runtime.js";
import { useLocale } from "../lib/locale.js";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 font-game">
      <div className="flex bg-[#3e2406] border-2 border-[#5a360a] rounded-lg shadow-[3px_3px_0_rgba(0,0,0,0.7)] overflow-hidden">
        {locales.map((lang, index) => (
          <motion.button
            key={lang}
            onClick={() => setLocale(lang)}
            whileTap={{ scale: 0.92 }}
            className={[
              "px-3 py-1.5 text-base font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer",
              locale === lang
                ? "bg-[#dfc699] text-[#5a360a]"
                : "text-[#a67c52] hover:bg-[#704612] hover:text-[#e0c4a4]",
              index !== locales.length - 1 ? "border-r-2 border-[#5a360a]" : "",
            ].join(" ")}
          >
            {lang}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
