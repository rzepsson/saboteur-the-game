import { m } from "../../paraglide/messages.js";
import { useLocale } from "../../lib/locale.js";

export function SaboteurLogo() {
  useLocale();
  return (
    <div className="flex flex-col items-center gap-3 font-game">
      <h1
        className="text-[#f0dfc0]"
        style={{
          fontSize: "clamp(2.75rem, 8vw, 6rem)",
          letterSpacing: "0.2em",
          lineHeight: 1,
          textShadow: "6px 6px 0px rgba(0,0,0,0.8), 0px 4px 0px rgba(0,0,0,0.8)",
          userSelect: "none",
        }}
      >
        {m.game_title()}
      </h1>

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
