export const AVATARS_COUNT = 8;

export function getAvatarUrl(id: number): string {
  const clamped = Math.min(AVATARS_COUNT, Math.max(1, id));
  return new URL(`/src/assets/avatars/avatar${clamped}.png`, import.meta.url).href;
}
