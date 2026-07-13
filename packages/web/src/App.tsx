import { useState, useRef, useEffect, useCallback } from "react";
import {
  QueryClientProvider,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Play,
  Bookmark,
  Settings as SettingsIcon,
  RefreshCw,
  Loader2,
  Search,
  X,
  History,
} from "lucide-react";
import { queryClient } from "./queryClient";
import { apiClient } from "./services/client";
import { useConfigStore } from "./store/configStore";
import { useWebSocket } from "./hooks/useWebSocket";
import { useVideoScreen } from "./hooks/useVideoScreen";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import type { VideoItem } from "./types";
import { VideoCard } from "./components/VideoCard";
import { Settings } from "./components/Settings";
import { WatchScreen } from "./components/WatchScreen";
import { videosQueryKey, WATCH_LATER_PLAYLIST_ID } from "./hooks/useVideosQuery";

const watchParams =
  window.location.pathname === "/watch"
    ? new URLSearchParams(window.location.search)
    : null;
const watchVideoId = watchParams?.get("v") ?? null;
const watchIsShort = watchParams?.get("short") === "true";

type Tab = "videos" | "watchLater" | "settings";

function WebSocketProvider() {
  useWebSocket();
  return null;
}

function RefreshButton() {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: () => apiClient.videos.refreshVideos({ query: {} }),
    onSuccess: (result) => {
      if (result.status === 200) {
        qc.invalidateQueries({ queryKey: videosQueryKey });
      }
    },
  });

  return (
    <button
      className="p-2 rounded-lg text-[#888] disabled:opacity-40 [-webkit-tap-highlight-color:transparent] active:bg-[#f0f0f0]"
      onClick={() => mutate()}
      disabled={isPending}
      title="Refresh videos"
    >
      <RefreshCw size={18} className={isPending ? "animate-spin" : ""} />
    </button>
  );
}

function VideoList({
  filterWatchLater,
  search,
  channel,
  onWatch,
  registerJumpToLastWatched,
}: {
  filterWatchLater?: boolean;
  search?: string;
  channel?: string;
  onWatch: (video: VideoItem) => void;
  registerJumpToLastWatched?: (fn: (() => void | Promise<void>) | null) => void;
}) {
  const {
    videos: filtered,
    isLoading,
    error,
    watchedIds,
    watchLaterIds,
    toggleWatched,
    toggleWatchLater,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVideoScreen({
    playlistId: filterWatchLater ? WATCH_LATER_PLAYLIST_ID : undefined,
    search,
    channel,
  });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const videosRef = useRef(filtered);
  const watchedRef = useRef(watchedIds);
  const hasNextRef = useRef(hasNextPage);
  videosRef.current = filtered;
  watchedRef.current = watchedIds;
  hasNextRef.current = hasNextPage;

  // The feed is published-desc, so the first watched video from the top is the
  // most-recently-released one watched. Page forward until it loads, then
  // scroll it to the bottom of the viewport.
  useEffect(() => {
    if (!registerJumpToLastWatched) return;

    async function jump() {
      const findIn = (videos: { videoId: string }[]) =>
        videos.find((v) => watchedRef.current.has(v.videoId));

      let target = findIn(videosRef.current);
      let canPage = hasNextRef.current;
      while (!target && canPage) {
        const res = await fetchNextPage();
        target = findIn((res.data?.pages ?? []).flatMap((p) => p.items));
        canPage = res.hasNextPage ?? false;
      }
      if (!target) return;
      const targetId = target.videoId;

      requestAnimationFrame(() => {
        cardRefs.current
          .get(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }

    registerJumpToLastWatched(jump);
    return () => registerJumpToLastWatched(null);
  }, [registerJumpToLastWatched, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading)
    return (
      <div className="py-10 flex justify-center text-[#888]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <div className="py-10 px-4 text-center text-sm text-red-700">{msg}</div>
    );
  }

  if (!filtered.length && !hasNextPage)
    return (
      <div className="py-10 px-4 text-center text-sm text-gray-400">
        No videos
      </div>
    );

  return (
    <div className="flex flex-col">
      {filtered.map((video) => (
        <VideoCard
          key={video.videoId}
          ref={(el) => {
            if (el) cardRefs.current.set(video.videoId, el);
            else cardRefs.current.delete(video.videoId);
          }}
          video={video}
          isWatched={watchedIds.has(video.videoId)}
          isWatchLater={watchLaterIds.has(video.videoId)}
          onToggleWatched={() => toggleWatched(video.videoId)}
          onToggleWatchLater={() => toggleWatchLater(video.videoId)}
          onWatch={onWatch}
        />
      ))}
      {hasNextPage && (
        <div ref={sentinelRef} className="py-6 flex justify-center text-[#888]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [tab, setTab] = useState<Tab>("videos");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const useInternalPlayer = useConfigStore((s) => s.useInternalPlayer);
  const jumpRef = useRef<(() => void | Promise<void>) | null>(null);
  const [isJumping, setIsJumping] = useState(false);

  const handleJump = useCallback(async () => {
    if (!jumpRef.current) return;
    setIsJumping(true);
    try {
      await jumpRef.current();
    } finally {
      setIsJumping(false);
    }
  }, []);

  const registerJump = useCallback((fn: (() => void | Promise<void>) | null) => {
    jumpRef.current = fn;
  }, []);

  // "@channel" searches by channel; anything else searches by title.
  const isChannelSearch = debouncedSearch.startsWith("@");
  const searchTerm = isChannelSearch
    ? debouncedSearch.slice(1)
    : debouncedSearch;
  const searchFilters = searchTerm
    ? isChannelSearch
      ? { channel: searchTerm }
      : { search: searchTerm }
    : {};

  const handleWatch = useCallback(
    (video: VideoItem) => {
      if (useInternalPlayer) {
        const params = new URLSearchParams({ v: video.videoId });
        if (video.isShort) params.set("short", "true");
        window.open(`${window.location.origin}/watch?${params}`, "_blank");
      } else {
        window.open(video.link, "_blank");
      }
    },
    [useInternalPlayer]
  );

  const tabClass = (t: Tab) =>
    `flex-1 flex flex-col items-center gap-[3px] py-2.5 border-0 bg-transparent cursor-pointer text-[11px] [-webkit-tap-highlight-color:transparent] ${tab === t ? "text-[#2196f3]" : "text-[#888]"}`;

  return (
    <div className="flex flex-col h-[100dvh] max-w-[600px] mx-auto bg-white">
      {tab === "videos" && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e0e0e0]">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search titles, or @channel"
              className="w-full pl-8 pr-8 py-1.5 text-sm bg-[#f0f0f0] rounded-md border-none outline-none text-[#333] placeholder:text-[#999]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999] border-none bg-transparent cursor-pointer p-0.5 flex items-center"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            className="p-2 rounded-lg text-[#888] disabled:opacity-40 [-webkit-tap-highlight-color:transparent] active:bg-[#f0f0f0]"
            onClick={handleJump}
            disabled={isJumping}
            title="Jump to last watched"
          >
            <History size={18} className={isJumping ? "animate-pulse" : ""} />
          </button>
          <RefreshButton />
        </div>
      )}
      <div className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
        {tab === "videos" && (
          <VideoList
            {...searchFilters}
            onWatch={handleWatch}
            registerJumpToLastWatched={registerJump}
          />
        )}
        {tab === "watchLater" && (
          <VideoList filterWatchLater onWatch={handleWatch} />
        )}
        {tab === "settings" && <Settings />}
      </div>
      <nav className="flex border-t border-[#e0e0e0] bg-white pb-[env(safe-area-inset-bottom)]">
        <button className={tabClass("videos")} onClick={() => setTab("videos")}>
          <Play size={20} /> Videos
        </button>
        <button
          className={tabClass("watchLater")}
          onClick={() => setTab("watchLater")}
        >
          <Bookmark size={20} /> Watch Later
        </button>
        <button
          className={tabClass("settings")}
          onClick={() => setTab("settings")}
        >
          <SettingsIcon size={20} /> Settings
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  if (watchVideoId) {
    return <WatchScreen videoId={watchVideoId} isShort={watchIsShort} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider />
      <AppContent />
    </QueryClientProvider>
  );
}
