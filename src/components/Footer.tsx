import { m } from "../paraglide/messages.js";
import { useLocale } from "../lib/locale.js";

export default function Footer() {
  useLocale();

  return (
    <div className="flex items-center justify-center font-game">
      <div className="bg-[#2b1604] border-4 border-[#5a360a] rounded-lg px-6 py-2 shadow-[4px_4px_0_rgba(0,0,0,0.6)] flex items-center">
        <span className="text-[#a67c52] text-xl font-bold tracking-widest uppercase">
          © {new Date().getFullYear()} Saboteur BETA ·{" "}
          <span className="text-[#dfc699]">{m.footer_rights()}</span>
        </span>
      </div>
    </div>
  );
}
