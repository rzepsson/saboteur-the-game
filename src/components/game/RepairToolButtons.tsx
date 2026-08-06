import { toolsOf, TOOL_ICON, type Tool } from "../../lib/cards.js";

type Props = {
  cardSubtype: string;
  brokenTools: string[];
  onPick: (tool: Tool) => void;
};

// The tool picker shown after a repair card + target player are chosen. Only
// tools that the card can fix AND the target currently has broken are offered.
export function RepairToolButtons({ cardSubtype, brokenTools, onPick }: Props) {
  const fixable = toolsOf(cardSubtype).filter((t) => brokenTools.includes(t));
  if (fixable.length === 0) {
    return <span className="text-red-300 font-bold text-sm">—</span>;
  }
  return (
    <div className="flex gap-2">
      {fixable.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="px-3 py-1 bg-[#22c55e] text-white font-bold rounded-lg border-2 border-[#14532d] cursor-pointer"
        >
          {TOOL_ICON[t]} {t}
        </button>
      ))}
    </div>
  );
}
