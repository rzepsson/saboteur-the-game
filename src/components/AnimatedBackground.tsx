import { motion } from "framer-motion";

const lobbyModules = import.meta.glob<string>("../assets/backgrounds/lobby/*.png", {
  eager: true,
  import: "default",
});
const caveModules = import.meta.glob<string>("../assets/backgrounds/cave/*.png", {
  eager: true,
  import: "default",
});

/**
 * Returns urls sorted by filename number.
 * descending=true → [8,7,6…0] so higher-numbered layers render first (behind lower ones).
 */
function toSortedUrls(modules: Record<string, string>, descending: boolean): readonly string[] {
  return Object.entries(modules)
    .sort(([a], [b]) => {
      const n = (p: string) => parseInt(p.match(/(\d+)\.png$/)?.[1] ?? "0", 10);
      return descending ? n(b) - n(a) : n(a) - n(b);
    })
    .map(([, url]) => url);
}

// lobby: 8.png = background (first rendered, lowest z), 0.png = foreground (last rendered)
// cave:  0.png = background (first rendered, lowest z), 7.png = foreground (last rendered)
const LAYER_URLS = {
  lobby: toSortedUrls(lobbyModules, true),
  cave: toSortedUrls(caveModules, false),
} as const;

/** Scroll cycle duration for the slowest (background) layer, in seconds. */
const DURATION_SLOW = 100;
/** Scroll cycle duration for the fastest (foreground) layer, in seconds. */
const DURATION_FAST = 16;

interface ScrollLayerProps {
  src: string;
  /** Full-cycle duration in seconds. Shorter = faster scroll. */
  duration: number;
}

/**
 * A single parallax layer that scrolls continuously from left to right.
 * Two copies of the image are placed side-by-side so the loop is seamless:
 *   [Image A | Image B]
 * Animating translateX from 0 → +50% (of the 200%-wide container = one image width)
 * advances the visible window one full image to the right, then loops instantly.
 */
function ScrollLayer({ src, duration }: ScrollLayerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{ width: "200%" }}
        animate={{ x: ["-50%", "0%"] }}
        transition={{
          duration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        <img
          src={src}
          alt=""
          className="absolute inset-y-0 left-0 w-1/2 h-full object-cover"
          draggable={false}
        />
        <img
          src={src}
          alt=""
          className="absolute inset-y-0 right-0 w-1/2 h-full object-cover"
          draggable={false}
        />
      </motion.div>
    </div>
  );
}

export type BackgroundVariant = keyof typeof LAYER_URLS;

export interface AnimatedBackgroundProps {
  variant?: BackgroundVariant;
}

export default function AnimatedBackground({ variant = "lobby" }: AnimatedBackgroundProps) {
  const layers = LAYER_URLS[variant];
  const n = layers.length;

  return (
    <div className="fixed inset-0" aria-hidden="true">
      {layers.map((src, i) => {
        // i=0 → background (slow), i=n-1 → foreground (fast)
        const t = n > 1 ? i / (n - 1) : 0;
        const duration = DURATION_SLOW - t * (DURATION_SLOW - DURATION_FAST);
        return <ScrollLayer key={src} src={src} duration={duration} />;
      })}
    </div>
  );
}
