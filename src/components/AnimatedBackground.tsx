import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

const lobbyModules = import.meta.glob<string>("../assets/backgrounds/lobby/*.png", {
  eager: true,
  import: "default",
});
const caveModules = import.meta.glob<string>("../assets/backgrounds/cave/*.png", {
  eager: true,
  import: "default",
});

function toSortedUrls(modules: Record<string, string>, descending: boolean): readonly string[] {
  return Object.entries(modules)
    .sort(([a], [b]) => {
      const n = (p: string) => parseInt(p.match(/(\d+)\.png$/)?.[1] ?? "0", 10);
      return descending ? n(b) - n(a) : n(a) - n(b);
    })
    .map(([, url]) => url);
}

// cave: 0 = background (lowest z), 7 = foreground (highest z)
const LAYER_URLS = {
  lobby: toSortedUrls(lobbyModules, true),
  cave: toSortedUrls(caveModules, false),
} as const;

const DURATION_SLOW = 100;
const DURATION_FAST = 16;

/**
 * Measures the rendered pixel width of an image when scaled to 100% container height.
 * Returns null until the image reports its natural dimensions.
 */
function useTileWidth(src: string): number | null {
  const [tileWidth, setTileWidth] = useState<number | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      const renderedHeight = window.innerHeight;
      setTileWidth(Math.ceil((img.naturalWidth / img.naturalHeight) * renderedHeight));
    };
    img.src = src;
  }, [src]);

  return tileWidth;
}

interface ScrollLayerProps {
  src: string;
  duration: number;
}

/**
 * A single parallax layer using CSS background-repeat:repeat-x, driven by a MotionValue.
 * Background-repeat tiles are rendered by the browser's own rasteriser — no sub-pixel seams.
 * The tile width is measured from the image's natural dimensions so the loop is pixel-perfect.
 */
function ScrollLayer({ src, duration }: ScrollLayerProps) {
  const tileWidth = useTileWidth(src);

  const posX = useMotionValue(0);
  const backgroundPositionX = useTransform(posX, (v) => `${v}px`);

  useEffect(() => {
    if (tileWidth === null) return;

    const ctrl = animate(posX, [0, tileWidth], {
      duration,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });

    return () => ctrl.stop();
  }, [posX, tileWidth, duration]);

  if (tileWidth === null) return null;

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none select-none"
      style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: "repeat-x",
        backgroundSize: `${tileWidth}px 100%`,
        backgroundPositionX,
        backgroundPositionY: "center",
      }}
    />
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
        const t = n > 1 ? i / (n - 1) : 0;
        const duration = DURATION_SLOW - t * (DURATION_SLOW - DURATION_FAST);
        return <ScrollLayer key={src} src={src} duration={duration} />;
      })}
    </div>
  );
}
