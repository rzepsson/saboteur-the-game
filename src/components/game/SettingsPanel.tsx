import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api.js";
import { StepperRow } from "../ui/StepperRow.js";
import { m } from "../../paraglide/messages.js";
import { useLocale } from "../../lib/locale.js";
import { resolveSettings } from "../../types/game.js";
import type { Room, RoomSettings } from "../../types/game.js";

const TURN_TIME_OPTIONS: Array<number | null> = [null, 30, 60, 90, 120];

interface SettingsPanelProps {
  room: Room;
  isHost: boolean;
  sessionId: string;
}

export function SettingsPanel({ room, isHost, sessionId }: SettingsPanelProps) {
  useLocale();
  const updateSettings = useMutation(api.rooms.updateSettings);
  const resolved = resolveSettings(room.settings);
  const { maxPlayers, numberOfRounds, turnTimeLimitSeconds, enableBrokenToolPenalty } = resolved;
  const playerCount = room.players.length;

  const update = (partial: Partial<Required<RoomSettings>>) => {
    void updateSettings({
      sessionId,
      roomId: room._id,
      settings: { ...resolved, ...partial },
    });
  };

  return (
    <div className="bg-[#f8f0e0] border-2 border-[#c69c6d] rounded-xl p-4 sm:p-5 shadow-[3px_3px_0px_rgba(0,0,0,0.15)]">
      <h3 className="text-[#5a360a] font-bold text-xl sm:text-2xl uppercase tracking-wider mb-4 border-b-2 border-[#c69c6d] pb-2">
        {m.lobby_settings_title()}
      </h3>

      <div className="flex flex-col gap-4 sm:gap-5">
        <StepperRow
          label={m.lobby_max_players_label()}
          value={maxPlayers}
          min={Math.max(3, playerCount)}
          max={10}
          disabled={!isHost}
          onChange={(next) => update({ maxPlayers: next })}
        />

        <StepperRow
          label={m.lobby_rounds_label()}
          value={numberOfRounds}
          min={1}
          max={3}
          disabled={!isHost}
          onChange={(next) => update({ numberOfRounds: next })}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[#5a360a] font-bold text-xl">{m.lobby_turn_time_label()}</span>
          <div className="flex flex-wrap gap-2">
            {TURN_TIME_OPTIONS.map((val) => {
              const active = turnTimeLimitSeconds === val;
              return (
                <motion.button
                  key={val ?? "inf"}
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
                  {val === null ? m.lobby_turn_time_unlimited() : `${val}s`}
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
