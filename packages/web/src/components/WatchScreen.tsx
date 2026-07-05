import { useEffect, useRef } from "react";

interface Props {
  videoId: string;
  isShort?: boolean;
}

// Minimal typings for the YouTube IFrame Player API surface we use.
interface YTPlayer {
  getVideoData: () => { title?: string };
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

// YT.PlayerState.PLAYING
const YT_PLAYING = 1;

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YT {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: (e: YTPlayerEvent) => void };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

// Load the IFrame API script once, resolving when window.YT is ready.
function loadYouTubeApi(): Promise<YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = IFRAME_API_SRC;
      document.head.appendChild(script);
    }
  });
}

export function WatchScreen({ videoId, isShort }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    let player: YTPlayer | null = null;
    let cancelled = false;

    // Cross-origin iframe focus doesn't reliably route keys into the YouTube
    // player, so drive play/pause ourselves from a document-level Space handler.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !player) return;
      e.preventDefault();
      if (player.getPlayerState() === YT_PLAYING) player.pauseVideo();
      else player.playVideo();
    };

    loadYouTubeApi().then((yt) => {
      if (cancelled || !hostRef.current) return;
      player = new yt.Player(hostRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        events: {
          onReady: (e) => {
            if (cancelled) return;
            const title = e.target.getVideoData().title;
            if (title) document.title = title;
          },
        },
      });
      window.addEventListener("keydown", onKeyDown);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      player?.destroy();
      document.title = previousTitle;
    };
  }, [videoId]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className={isShort ? "h-full aspect-[9/16]" : "w-full h-full"}>
        <div ref={hostRef} className="w-full h-full" />
      </div>
    </div>
  );
}
