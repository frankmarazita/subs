import { useState } from "react";
import { Check, X, Monitor, Sun, Moon } from "lucide-react";
import { useConfigStore, type Theme } from "../store/configStore";
import { reinitializeClients } from "../services/client";
import { queryClient } from "../queryClient";

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function Settings() {
  const {
    hosts,
    activeHostIndex,
    addHost,
    removeHost,
    setActiveHost,
    useInternalPlayer,
    setUseInternalPlayer,
    theme,
    setTheme,
  } = useConfigStore();
  const [newUrl, setNewUrl] = useState("");

  function handleSetActive(index: number) {
    if (index === activeHostIndex) return;
    setActiveHost(index);
    reinitializeClients();
    queryClient.clear();
  }

  function handleAdd() {
    const url = newUrl.trim();
    if (!url) return;
    addHost(url);
    setNewUrl("");
  }

  function handleRemove(index: number) {
    if (hosts.length === 1) return;
    removeHost(index);
    reinitializeClients();
    queryClient.clear();
  }

  return (
    <div className="p-4">
      <div className="text-[11px] font-semibold text-[#888] dark:text-[#aaa] uppercase tracking-[0.8px] mb-2.5">
        Hosts
      </div>
      <div className="flex flex-col gap-2 mb-4">
        {hosts.map((host, index) => {
          const isActive = index === activeHostIndex;
          return (
            <div
              key={index}
              className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer [-webkit-tap-highlight-color:transparent] active:bg-[#ebebeb] dark:active:bg-[#2a2a2a] ${isActive ? "bg-[#e3f2fd] dark:bg-[#1a2a3a]" : "bg-[#f5f5f5] dark:bg-[#1e1e1e]"}`}
              onClick={() => handleSetActive(index)}
            >
              <span
                className={`flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap ${isActive ? "text-[#2196f3] dark:text-[#64b5f6] font-medium" : "text-[#333] dark:text-[#eee]"}`}
              >
                {host}
              </span>
              {isActive && (
                <Check
                  size={16}
                  className="text-[#2196f3] dark:text-[#64b5f6] flex-shrink-0"
                  strokeWidth={2.5}
                />
              )}
              {hosts.length > 1 && (
                <button
                  className="border-none bg-transparent text-red-500 cursor-pointer p-1 flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] font-semibold text-[#888] dark:text-[#aaa] uppercase tracking-[0.8px] mb-2.5 mt-6">
        Playback
      </div>
      <div
        className="flex items-center justify-between p-3 rounded-lg bg-[#f5f5f5] dark:bg-[#1e1e1e] cursor-pointer [-webkit-tap-highlight-color:transparent]"
        onClick={() => setUseInternalPlayer(!useInternalPlayer)}
      >
        <span className="text-sm text-[#333] dark:text-[#eee]">Use internal player</span>
        <div
          className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${useInternalPlayer ? "bg-[#2196f3]" : "bg-[#ccc] dark:bg-[#444]"}`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${useInternalPlayer ? "translate-x-5" : "translate-x-0"}`}
          />
        </div>
      </div>

      <div className="text-[11px] font-semibold text-[#888] dark:text-[#aaa] uppercase tracking-[0.8px] mb-2.5 mt-6">
        Appearance
      </div>
      <div className="flex gap-1 p-1 rounded-lg bg-[#f5f5f5] dark:bg-[#1e1e1e]">
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border-none text-sm cursor-pointer [-webkit-tap-highlight-color:transparent] ${theme === value ? "bg-white text-[#2196f3] shadow dark:bg-[#333] dark:text-[#64b5f6]" : "bg-transparent text-[#555] dark:text-[#aaa]"}`}
            onClick={() => setTheme(value)}
            aria-pressed={theme === value}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="text-[11px] font-semibold text-[#888] dark:text-[#aaa] uppercase tracking-[0.8px] mb-2.5 mt-6">
        Add Host
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-[#ddd] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2196f3] dark:bg-[#1e1e1e] dark:border-[#333] dark:text-[#eee] dark:placeholder:text-[#777]"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="http://192.168.1.x:3000"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          className="bg-[#2196f3] text-white border-none rounded-lg px-[18px] text-[22px] cursor-pointer active:bg-[#1976d2] flex items-center justify-center"
          onClick={handleAdd}
        >
          <X size={20} className="rotate-45" />
        </button>
      </div>
    </div>
  );
}
