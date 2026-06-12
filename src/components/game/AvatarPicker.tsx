import { motion, AnimatePresence } from "framer-motion";
import { getAvatarUrl, AVATARS_COUNT } from "../../lib/avatar.js";

interface AvatarPickerProps {
  avatarId: number;
  onChange: (id: number) => void;
}

export function AvatarPicker({ avatarId, onChange }: AvatarPickerProps) {
  const prev = () => onChange(avatarId === 1 ? AVATARS_COUNT : avatarId - 1);
  const next = () => onChange(avatarId === AVATARS_COUNT ? 1 : avatarId + 1);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <motion.button
        whileHover={{ scale: 1.2, x: -2 }}
        whileTap={{ scale: 0.9 }}
        onClick={prev}
        aria-label="Previous avatar"
        className="text-[#5a360a] hover:text-[#22c55e] text-4xl sm:text-5xl transition-colors cursor-pointer select-none leading-none"
      >
        {"<"}
      </motion.button>

      <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-[#c69c6d] border-4 border-[#5a360a] rounded-lg shadow-[inset_0_4px_0_rgba(0,0,0,0.15)] shrink-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={avatarId}
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ opacity: 1, scale: 1.15, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            src={getAvatarUrl(avatarId)}
            alt={`Avatar ${avatarId}`}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.2, x: 2 }}
        whileTap={{ scale: 0.9 }}
        onClick={next}
        aria-label="Next avatar"
        className="text-[#5a360a] hover:text-[#22c55e] text-4xl sm:text-5xl transition-colors cursor-pointer select-none leading-none"
      >
        {">"}
      </motion.button>
    </div>
  );
}
