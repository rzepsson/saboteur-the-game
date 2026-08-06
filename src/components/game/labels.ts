import { useTranslation } from "../../lib/locale.js";
import type { Role, Team } from "./types.js";

// Centralised role/team label resolution so every in-game component renders the
// same wording (and stays subscribed to locale changes via useTranslation).
export function useGameLabels() {
  const m = useTranslation();
  const roleLabel = (r: Role) =>
    r === "miner" ? m.role_miner() : r === "saboteur" ? m.role_saboteur() : m.role_unknown();
  const teamLabel = (t: Team) => (t === "miners" ? m.team_miners() : m.team_saboteurs());
  return { roleLabel, teamLabel };
}
