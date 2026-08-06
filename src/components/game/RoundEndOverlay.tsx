import { useTranslation } from "../../lib/locale.js";
import { Overlay } from "./Overlay.js";
import { RolesReveal } from "./RolesReveal.js";
import { useGameLabels } from "./labels.js";
import type { PublicPlayer, RoundResult } from "./types.js";

type Props = {
  roundResult: RoundResult;
  players: PublicPlayer[];
  isHost: boolean;
  onContinue: () => void;
};

// Shown between rounds: who won and why, every player's role, and (for the host)
// a button to skip the delay into the next round.
export function RoundEndOverlay({ roundResult, players, isHost, onContinue }: Props) {
  const m = useTranslation();
  const { teamLabel } = useGameLabels();

  return (
    <Overlay>
      <p className="text-3xl sm:text-4xl font-bold text-[#1e0e04]">
        {m.game_round_won({ team: teamLabel(roundResult.winningTeam) })}
      </p>
      <p className="text-xl text-[#5a360a] font-bold">
        {roundResult.reason === "gold_reached" ? m.game_reason_gold() : m.game_reason_blocked()}
      </p>
      <RolesReveal players={players} />
      {isHost ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-2 px-8 py-3 bg-[#22c55e] text-white font-bold text-xl rounded-xl border-4 border-[#14532d] cursor-pointer uppercase tracking-widest"
        >
          {m.game_continue()}
        </button>
      ) : (
        <p className="mt-2 text-[#5a360a] font-bold">{m.game_next_round_soon()}</p>
      )}
    </Overlay>
  );
}
