import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Dimmed modal backdrop + animated parchment panel shared by the round-end and
// game-over screens.
export function Overlay({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="bg-[#ede0c0] border-4 border-[#5a360a] rounded-2xl shadow-[8px_8px_0_rgba(0,0,0,0.6)] px-6 py-6 max-w-lg w-full flex flex-col items-center gap-3 text-center max-h-[90svh] overflow-y-auto custom-scroll"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
