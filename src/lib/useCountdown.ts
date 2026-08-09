import { useEffect, useState } from "react";

// Ticks once a second and returns the whole seconds left until `deadline`
// (epoch ms), clamped at zero. `active` pauses the ticker (e.g. between rounds).
export function useCountdown(deadline: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
