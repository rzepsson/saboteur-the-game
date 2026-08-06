import { actionKind, toolsOf, TOOL_ICON } from "../../lib/cards.js";
import { useTranslation } from "../../lib/locale.js";

type Props = {
  subtype: string;
  size?: number;
};

type Style = { icon: string; label: string; from: string; to: string; band: string };

// Renders an action card (broken/repair tool, map, rockfall) as an icon over a
// coloured tile with a label band. Tool cards show their tool emoji(s).
export function ActionCardView({ subtype, size = 56 }: Props) {
  const m = useTranslation();
  const kind = actionKind(subtype);
  const tools = toolsOf(subtype);

  let s: Style = { icon: "❓", label: "", from: "#efe3c6", to: "#d9c79c", band: "#7a6a55" };
  if (kind === "broken") {
    s = {
      icon: tools.map((t) => TOOL_ICON[t]).join(""),
      label: m.card_broken(),
      from: "#f0c7c7",
      to: "#d98a8a",
      band: "#9b2c2c",
    };
  } else if (kind === "repair") {
    s = {
      icon: tools.map((t) => TOOL_ICON[t]).join(""),
      label: m.card_repair(),
      from: "#c6eccd",
      to: "#86c997",
      band: "#15803d",
    };
  } else if (kind === "map") {
    s = { icon: "🗺️", label: m.card_map(), from: "#dcd6f2", to: "#b3a8e0", band: "#5b4bb0" };
  } else if (kind === "rockfall") {
    s = { icon: "🪨", label: m.card_rockfall(), from: "#e7d8c3", to: "#c2a987", band: "#7a4a1d" };
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-[6px]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${s.from}, ${s.to})`,
        boxShadow:
          "inset 0 0 0 2px #3e2406, inset 0 3px 5px rgba(255,255,255,0.4), inset 0 -4px 7px rgba(0,0,0,0.2)",
      }}
    >
      <span
        className="flex items-center justify-center rounded-full bg-white/55"
        style={{ width: size * 0.5, height: size * 0.5, fontSize: size * 0.28, lineHeight: 1 }}
      >
        {s.icon}
      </span>
      <span
        className="absolute bottom-0 inset-x-0 text-center font-bold uppercase tracking-wide text-white leading-none py-0.5"
        style={{ fontSize: Math.max(8, size * 0.15), background: s.band }}
      >
        {s.label}
      </span>
      {kind === "broken" && (
        <span
          className="absolute top-0.5 right-1 text-red-700 font-black"
          style={{ fontSize: size * 0.24, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}
        >
          ✕
        </span>
      )}
    </div>
  );
}
