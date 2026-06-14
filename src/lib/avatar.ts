// Explicit static imports so Vite can hash and bundle these assets correctly at build time.
// new URL('/src/assets/...', import.meta.url) does NOT work after bundling.
import avatar1 from "../assets/avatars/avatar1.png";
import avatar2 from "../assets/avatars/avatar2.png";
import avatar3 from "../assets/avatars/avatar3.png";
import avatar4 from "../assets/avatars/avatar4.png";
import avatar5 from "../assets/avatars/avatar5.png";
import avatar6 from "../assets/avatars/avatar6.png";
import avatar7 from "../assets/avatars/avatar7.png";
import avatar8 from "../assets/avatars/avatar8.png";

export const AVATARS_COUNT = 8;

const AVATAR_URLS: Record<number, string> = {
  1: avatar1,
  2: avatar2,
  3: avatar3,
  4: avatar4,
  5: avatar5,
  6: avatar6,
  7: avatar7,
  8: avatar8,
};

export function getAvatarUrl(id: number): string {
  const clamped = Math.min(AVATARS_COUNT, Math.max(1, Math.round(id)));
  return AVATAR_URLS[clamped] ?? avatar1;
}
