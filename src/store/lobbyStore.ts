import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LobbyStore {
  nickname: string;
  avatarId: number;
  setNickname: (nickname: string) => void;
  setAvatarId: (avatarId: number) => void;
}

export const useLobbyStore = create<LobbyStore>()(
  persist(
    (set) => ({
      nickname: "",
      avatarId: 1,
      setNickname: (nickname) => set({ nickname }),
      setAvatarId: (avatarId) => set({ avatarId }),
    }),
    { name: "saboteur-lobby-prefs" },
  ),
);
