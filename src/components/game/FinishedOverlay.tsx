import { useTranslation } from "../../lib/locale.js";
import { Overlay } from "./Overlay.js";
import { useGameLabels } from "./labels.js";
import type { PublicPlayer } from "./types.js";

type Props = {
  players: PublicPlayer[];
  isHost: boolean;
  onReturn: () => void;
};

// Final game-over screen: winner(s) by gold, full standings, and (host only) a
// button back to the lobby.
export function FinishedOverlay({ players, isHost, onReturn }: Props) {
  const m = useTranslation();
  const { roleLabel } = useGameLabels();

  const sorted = [...players].sort((a, b) => (b.totalGold ?? 0) - (a.totalGold ?? 0));
  const topGold = sorted[0]?.totalGold ?? 0;
  const winners = sorted.filter((p) => (p.totalGold ?? 0) === topGold);

  return (
    <Overlay>
      <p className="text-3xl sm:text-4xl font-bold text-[#1e0e04]">{m.game_finished_title()}</p>
      <p className="text-xl text-[#15803d] font-bold">
        {winners.length === 1
          ? m.game_winner({ name: winners[0].nickname, gold: topGold })
          : m.game_tie({ gold: topGold })}
      </p>
      <p className="text-[#5a360a] font-bold mt-1">{m.game_standings()}</p>
      <div className="flex flex-col gap-1 w-full">
        {sorted.map((p, i) => (
          <div
            key={p._id}
            className="flex items-center justify-between bg-[#f8f0e0] border-2 border-[#c69c6d] rounded-lg px-3 py-1.5"
          >
            <span className="font-bold text-[#1e0e04] truncate">
              {i + 1}. {p.nickname}{" "}
              <span className="text-xs text-[#a67c52]">({roleLabel(p.role)})</span>
            </span>
            <span className="font-bold text-[#b8860b]">
              💰 {m.game_gold_amount({ gold: p.totalGold ?? 0 })}
            </span>
          </div>
        ))}
      </div>
      {isHost && (
        <button
          type="button"
          onClick={onReturn}
          className="mt-2 px-8 py-3 bg-[#22c55e] text-white font-bold text-xl rounded-xl border-4 border-[#14532d] cursor-pointer uppercase tracking-widest"
        >
          {m.game_return_lobby()}
        </button>
      )}
    </Overlay>
  );
}
