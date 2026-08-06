// Opaque, in-game backdrop. Rendered at z-0 inside the game screen so it covers
// the global parallax background (which belongs to the home/lobby aesthetic and
// looks out of place behind the board). Pure CSS — no image assets.
//
// The look is an underground mine: warm lantern glow in the centre fading to
// dark, damp rock at the edges, with a faint dirt speckle and a vignette to keep
// the board and cards readable.
export function GameBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Base earth gradient */}
      <div className="absolute inset-0 bg-[#1a0e03]" />
      {/* Central lantern glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 38%, rgba(120,78,28,0.55) 0%, rgba(58,34,9,0.65) 38%, rgba(20,11,3,0.92) 78%)",
        }}
      />
      {/* Faint dirt speckle texture */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,236,196,0.9) 1px, transparent 1.4px), radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1.4px)",
          backgroundSize: "22px 22px, 31px 31px",
          backgroundPosition: "0 0, 11px 7px",
        }}
      />
      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.75)",
        }}
      />
    </div>
  );
}
