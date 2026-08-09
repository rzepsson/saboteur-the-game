import { GameBackground } from "./GameBackground.js";

// Full-screen centered parchment card used for loading / starting states.
export function CenterCard({ text }: { text: string }) {
  return (
    <div className="relative h-svh flex items-center justify-center font-game overflow-hidden">
      <GameBackground />
      <div className="relative z-10 bg-[#ede0c0] border-4 border-[#5a360a] rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.6)] px-10 py-8 text-center">
        <p className="text-[#1e0e04] font-bold text-2xl sm:text-3xl tracking-widest">{text}</p>
      </div>
    </div>
  );
}
