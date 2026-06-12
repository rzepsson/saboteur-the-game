import { motion } from "framer-motion";

interface StepperRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}

export function StepperRow({ label, value, min, max, disabled, onChange }: StepperRowProps) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[#5a360a] font-bold text-xl">{label}</span>
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={canDecrement ? { scale: 1.15 } : {}}
          whileTap={canDecrement ? { scale: 0.9 } : {}}
          onClick={() => canDecrement && onChange(value - 1)}
          disabled={disabled || value <= min}
          className="w-10 h-10 flex items-center justify-center bg-[#5a360a] text-[#f0dfc0] font-bold text-2xl rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          −
        </motion.button>
        <span className="text-[#1e0e04] font-bold text-4xl w-8 text-center tabular-nums">
          {value}
        </span>
        <motion.button
          whileHover={canIncrement ? { scale: 1.15 } : {}}
          whileTap={canIncrement ? { scale: 0.9 } : {}}
          onClick={() => canIncrement && onChange(value + 1)}
          disabled={disabled || value >= max}
          className="w-10 h-10 flex items-center justify-center bg-[#5a360a] text-[#f0dfc0] font-bold text-2xl rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          +
        </motion.button>
      </div>
    </div>
  );
}
