import { useTranslation } from "../../lib/locale.js";
import { useGameLabels } from "./labels.js";
import type { GameState, Role } from "./types.js";

type Props = {
  round: number;
  numberOfRounds: number;
  deckCount: number;
  status: GameState["status"];
  isMyTurn: boolean;
  currentPlayerName: string;
  remaining: number;
  myRole: Role;
};

// Header strip: round/deck (left), turn indicator + timer (centre), own role (right).
export function GameTopBar({
  round,
  numberOfRounds,
  deckCount,
  status,
  isMyTurn,
  currentPlayerName,
  remaining,
  myRole,
}: Props) {
  const m = useTranslation();
  const { roleLabel } = useGameLabels();

  return (
    <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 bg-[#3e2406] border-b-4 border-[#5a360a] shrink-0">
      <div className="flex flex-col">
        <span className="text-[#f0dfc0] font-bold text-lg sm:text-xl leading-none">
          {m.game_round_of({ current: round, total: numberOfRounds })}
        </span>
        <span className="text-[#a67c52] font-bold text-sm leading-none mt-0.5">
          {m.game_deck_count({ count: deckCount })}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[#f0dfc0] font-bold text-base sm:text-lg leading-none">
          {isMyTurn ? m.game_your_turn() : m.game_waiting_turn({ name: currentPlayerName })}
        </span>
        {status === "playing" && (
          <span
            className={`font-bold text-sm leading-none mt-0.5 ${
              remaining <= 10 ? "text-red-400" : "text-[#a67c52]"
            }`}
          >
            ⏱ {remaining}s
          </span>
        )}
      </div>

      <div className="flex flex-col items-end">
        <span className="text-[#f0dfc0] font-bold text-sm leading-none">{m.game_you_are()}</span>
        <span
          className={`font-bold text-base leading-none mt-0.5 ${
            myRole === "saboteur" ? "text-red-400" : "text-[#22c55e]"
          }`}
        >
          {roleLabel(myRole)}
        </span>
      </div>
    </div>
  );
}
