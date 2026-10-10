import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_HOST: string =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ConfigState {
  hosts: string[];
  activeHostIndex: number;
  useInternalPlayer: boolean;
  addHost: (url: string) => void;
  removeHost: (index: number) => void;
  setActiveHost: (index: number) => void;
  getActiveHost: () => string;
  setUseInternalPlayer: (value: boolean) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      hosts: [DEFAULT_HOST],
      activeHostIndex: 0,
      useInternalPlayer: true,
      addHost: (url) => set((state) => ({ hosts: [...state.hosts, url] })),
      removeHost: (index) =>
        set((state) => {
          const hosts = state.hosts.filter((_, i) => i !== index);
          const activeHostIndex = Math.min(
            state.activeHostIndex,
            Math.max(0, hosts.length - 1)
          );
          return { hosts, activeHostIndex };
        }),
      setActiveHost: (index) => set({ activeHostIndex: index }),
      setUseInternalPlayer: (value) => set({ useInternalPlayer: value }),
      getActiveHost: () => {
        const { hosts, activeHostIndex } = get();
        return hosts[activeHostIndex] ?? DEFAULT_HOST;
      },
    }),
    { name: "subs-config" }
  )
);
