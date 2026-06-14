import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api.js";
import { StepperRow } from "../ui/StepperRow.js";
import { useTranslation } from "../../lib/locale.js";
import { GAME_RULES } from "../../lib/gameRules.js";
import type { Room, RoomSettings } from "../../types/game.js";

interface SettingsPanelProps {
  room: Room;
  isHost: boolean;
  sessionId: string;
}

export function SettingsPanel({ room, isHost, sessionId }: SettingsPanelProps) {
  const m = useTranslation();
  const updateSettings = useMutation(api.rooms.updateSettings);

  // L1: settings are always fully defined (schema is non-optional), no resolveSettings needed
  const { maxPlayers, numberOfRounds, turnTimeLimitSeconds, enableBrokenToolPenalty } =
    room.settings;
  const playerCount = room.players.length;

  const update = (partial: Partial<RoomSettings>) => {
    void updateSettings({
      sessionId,
      roomId: room._id,
      settings: { ...room.settings, ...partial },
    });
  };

  return (
    <div className="bg-[#f8f0e0] border-2 border-[#c69c6d] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.15)] lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 shrink-0">
        <h3 className="text-[#5a360a] font-bold text-xl sm:text-2xl uppercase tracking-wider border-b-2 border-[#c69c6d] pb-2">
          {m.lobby_settings_title()}
        </h3>
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-4 flex flex-col gap-4 sm:gap-5 lg:overflow-y-auto lg:custom-scroll">
        <StepperRow
          label={m.lobby_max_players_label()}
          value={maxPlayers}
          min={Math.max(GAME_RULES.minPlayers, playerCount)}
          max={GAME_RULES.maxPlayers}
          disabled={!isHost}
          onChange={(next) => update({ maxPlayers: next })}
        />

        <StepperRow
          label={m.lobby_rounds_label()}
          value={numberOfRounds}
          min={GAME_RULES.minRounds}
          max={GAME_RULES.maxRounds}
          disabled={!isHost}
          onChange={(next) => update({ numberOfRounds: next })}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[#5a360a] font-bold text-xl">{m.lobby_turn_time_label()}</span>
          <div className="flex flex-wrap gap-2">
            {GAME_RULES.validTurnTimes.map((val) => {
              const active = turnTimeLimitSeconds === val;
              return (
                <motion.button
                  key={val}
                  whileHover={isHost && !active ? { scale: 1.08 } : {}}
                  whileTap={isHost && !active ? { scale: 0.93 } : {}}
                  onClick={() => isHost && update({ turnTimeLimitSeconds: val })}
                  disabled={!isHost}
                  className={[
                    "px-3 py-1.5 rounded-lg font-bold text-xl border-2 transition-colors",
                    "disabled:cursor-not-allowed",
                    active
                      ? "bg-[#5a360a] text-[#f0dfc0] border-[#3e2406]"
                      : "bg-transparent text-[#5a360a] border-[#c69c6d] cursor-pointer hover:border-[#5a360a]",
                  ].join(" ")}
                >
                  {`${val}s`}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[#5a360a] font-bold text-xl">
            {m.lobby_broken_tool_penalty_label()}
          </span>
          <p className="text-[#a67c52] text-base leading-snug">
            {m.lobby_broken_tool_penalty_desc()}
          </p>
          <motion.button
            whileHover={isHost ? { scale: 1.04 } : {}}
            whileTap={isHost ? { scale: 0.96 } : {}}
            onClick={() => isHost && update({ enableBrokenToolPenalty: !enableBrokenToolPenalty })}
            disabled={!isHost}
            className={[
              "self-start px-5 py-2 rounded-lg font-bold text-xl border-2 transition-colors",
              "disabled:cursor-not-allowed",
              enableBrokenToolPenalty
                ? "bg-[#22c55e] text-white border-[#14532d] cursor-pointer"
                : "bg-[#f8f0e0] text-[#5a360a] border-[#c69c6d] cursor-pointer",
            ].join(" ")}
          >
            {enableBrokenToolPenalty ? m.lobby_setting_on() : m.lobby_setting_off()}
          </motion.button>
        </div>

        {!isHost && (
          <p className="text-[#a67c52] text-base sm:text-lg italic">{m.lobby_host_only_hint()}</p>
        )}
      </div>
    </div>
  );
}
