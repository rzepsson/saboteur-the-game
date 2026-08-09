import { useGameLabels } from "./labels.js";
import type { PublicPlayer } from "./types.js";

// Lists every player with their revealed role — shown on the round-end screen.
export function RolesReveal({ players }: { players: PublicPlayer[] }) {
  const { roleLabel } = useGameLabels();
  return (
    <div className="flex flex-col gap-1 w-full my-2">
      {players.map((p) => (
        <div
          key={p._id}
          className="flex items-center justify-between bg-[#f8f0e0] border-2 border-[#c69c6d] rounded-lg px-3 py-1.5"
        >
          <span className="font-bold text-[#1e0e04] truncate">{p.nickname}</span>
          <span
            className={`font-bold text-sm px-2 rounded ${
              p.role === "saboteur" ? "text-red-700" : "text-[#15803d]"
            }`}
          >
            {roleLabel(p.role)}
          </span>
        </div>
      ))}
    </div>
  );
}
