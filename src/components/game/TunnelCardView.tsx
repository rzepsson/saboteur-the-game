import { useId } from "react";
import { getEdges, isConnected } from "../../lib/cards.js";

type Props = {
  subtype: string;
  flipped?: boolean;
  size?: number;
  faceDown?: boolean;
  centerIcon?: string;
};

// Palette — warm dug-earth card with darker carved tunnels.
const DIRT_LIGHT = "#d8a866";
const DIRT_DARK = "#b07f3f";
const TUNNEL_DARK = "#241405";
const TUNNEL_LIGHT = "#3e2509";
const ROCK_LIGHT = "#9c8a72";
const ROCK_DARK = "#6c5b46";

const HALF = 15; // half corridor width
const C0 = 50 - HALF;
const W = HALF * 2;

// Renders a tunnel / start / goal card from its edge geometry as a small piece
// of carved mine. Connected cards meet at a central hub; dead-ends stop short of
// a rock plug.
export function TunnelCardView({
  subtype,
  flipped = false,
  size = 56,
  faceDown = false,
  centerIcon,
}: Props) {
  const uid = useId();

  if (faceDown) {
    return (
      <div
        className="flex items-center justify-center rounded-[6px] border-2 border-[#3e2406] font-bold text-[#f0dfc0]"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.5,
          background: "linear-gradient(150deg,#6a4112,#3e2406 70%)",
          boxShadow: "inset 0 2px 4px rgba(255,220,170,0.18), inset 0 -3px 6px rgba(0,0,0,0.45)",
        }}
      >
        ?
      </div>
    );
  }

  const edges = getEdges(subtype, flipped);
  const connected = isConnected(subtype);
  // Connected corridors run into the hub; dead-end corridors stop short.
  const reach = connected ? 50 : 40;
  const dirtId = `dirt-${uid}`;
  const tunId = `tun-${uid}`;

  // One corridor: a dark carved channel with a lighter floor for depth.
  const corridor = (key: string, x: number, y: number, w: number, h: number) => (
    <g key={key}>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={TUNNEL_DARK} />
      <rect
        x={x + 3}
        y={y + 3}
        width={w - 6}
        height={h - 6}
        rx={5}
        fill={`url(#${tunId})`}
        opacity={0.9}
      />
    </g>
  );

  return (
    <div
      className="relative rounded-[6px] overflow-hidden"
      style={{
        width: size,
        height: size,
        boxShadow:
          "inset 0 0 0 2px #3e2406, inset 0 3px 5px rgba(255,225,180,0.25), inset 0 -4px 7px rgba(0,0,0,0.4)",
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="block">
        <defs>
          <radialGradient id={dirtId} cx="42%" cy="35%" r="75%">
            <stop offset="0%" stopColor={DIRT_LIGHT} />
            <stop offset="100%" stopColor={DIRT_DARK} />
          </radialGradient>
          <linearGradient id={tunId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TUNNEL_LIGHT} />
            <stop offset="100%" stopColor={TUNNEL_DARK} />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={100} height={100} fill={`url(#${dirtId})`} />

        {edges.top && corridor("t", C0, 0, W, reach)}
        {edges.bottom && corridor("b", C0, 100 - reach, W, reach)}
        {edges.left && corridor("l", 0, C0, reach, W)}
        {edges.right && corridor("r", 100 - reach, C0, reach, W)}

        {connected ? (
          <>
            <rect x={C0} y={C0} width={W} height={W} rx={9} fill={TUNNEL_DARK} />
            <rect
              x={C0 + 3}
              y={C0 + 3}
              width={W - 6}
              height={W - 6}
              rx={7}
              fill={`url(#${tunId})`}
            />
          </>
        ) : (
          // Dead-end rock plug
          <g>
            <circle cx={50} cy={50} r={13} fill={ROCK_DARK} />
            <circle cx={45} cy={47} r={6} fill={ROCK_LIGHT} />
            <circle cx={55} cy={52} r={5} fill={ROCK_LIGHT} />
            <circle cx={50} cy={56} r={4} fill={ROCK_LIGHT} opacity={0.8} />
          </g>
        )}
      </svg>

      {centerIcon && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: size * 0.46, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}
        >
          {centerIcon}
        </div>
      )}
    </div>
  );
}
