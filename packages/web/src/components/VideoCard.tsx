import { forwardRef } from "react";
import { Eye, EyeOff, Check, Bookmark, BookmarkPlus } from "lucide-react";
import type { VideoItem } from "../types";

interface Props {
  video: VideoItem;
  isWatched: boolean;
  isWatchLater: boolean;
  onToggleWatched: () => void;
  onToggleWatchLater: () => void;
  onWatch: (video: VideoItem) => void;
}

export const VideoCard = forwardRef<HTMLDivElement, Props>(function VideoCard(
  {
    video,
    isWatched,
    isWatchLater,
    onToggleWatched,
    onToggleWatchLater,
    onWatch,
  },
  ref,
) {
  function openVideo() {
    if (!isWatched) onToggleWatched();
    onWatch(video);
  }

  return (
    <div ref={ref} className={`flex items-start gap-3 p-3 cursor-pointer select-none [-webkit-tap-highlight-color:transparent] active:bg-[#f5f5f5] dark:active:bg-[#1e1e1e] border-b border-[#e0e0e0] dark:border-[#2a2a2a] ${isWatched ? "bg-[#fafafa] dark:bg-[#181818]" : "bg-white dark:bg-[#121212]"}`} onClick={openVideo}>
      <div className="relative flex-shrink-0 w-[120px] h-[68px] rounded overflow-hidden bg-[#e0e0e0] dark:bg-[#2a2a2a]">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#d0d0d0] dark:bg-[#333]" />
        )}
        {isWatched && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white">
            <Check size={22} strokeWidth={3} />
          </div>
        )}
        {isWatchLater && (
          <div className="absolute top-1 right-1 text-white drop-shadow">
            <Bookmark size={14} fill="currentColor" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          className={`text-sm font-semibold leading-[1.4] line-clamp-2 ${isWatched ? "text-[#999] dark:text-[#777]" : "text-[#111] dark:text-[#eee]"}`}
        >
          {video.title}
        </div>
        <div className="text-xs text-[#555] dark:text-[#aaa] truncate">{video.channel}</div>
        <div className="text-[11px] text-[#999] dark:text-[#777]">
          {video.publishedFormatted}
        </div>
      </div>
      <div
        className="flex flex-col gap-1.5 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={`w-8 h-8 border-none rounded-md cursor-pointer flex items-center justify-center [-webkit-tap-highlight-color:transparent] active:bg-[#e0e0e0] dark:active:bg-[#333] ${isWatched ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-[#f0f0f0] text-[#555] dark:bg-[#2a2a2a] dark:text-[#aaa]"}`}
          onClick={onToggleWatched}
          title={isWatched ? "Mark unwatched" : "Mark watched"}
        >
          {isWatched ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          className={`w-8 h-8 border-none rounded-md cursor-pointer flex items-center justify-center [-webkit-tap-highlight-color:transparent] active:bg-[#e0e0e0] dark:active:bg-[#333] ${isWatchLater ? "bg-blue-100 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400" : "bg-[#f0f0f0] text-[#555] dark:bg-[#2a2a2a] dark:text-[#aaa]"}`}
          onClick={onToggleWatchLater}
          title={isWatchLater ? "Remove from watch later" : "Add to watch later"}
        >
          {isWatchLater ? (
            <Bookmark size={15} fill="currentColor" />
          ) : (
            <BookmarkPlus size={15} />
          )}
        </button>
      </div>
    </div>
  );
});
