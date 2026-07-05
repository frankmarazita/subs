import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  videosQueryKey,
  videosFeedKey,
  WATCH_LATER_PLAYLIST_ID,
} from './useVideosQuery';
import { historyQueryKey } from './useHistoryQuery';
import { watchLaterQueryKey } from './useWatchLater';
import { useConfigStore } from '../store/configStore';

const QUERY_KEYS: Record<string, readonly (readonly unknown[])[]> = {
  videos: [videosQueryKey],
  history: [historyQueryKey],
  watchLater: [
    watchLaterQueryKey,
    videosFeedKey({ playlistId: WATCH_LATER_PLAYLIST_ID }),
  ],
};

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;
      const baseUrl = useConfigStore.getState().getActiveHost().replace(/^http/, 'ws');
      const ws = new WebSocket(baseUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const keys = QUERY_KEYS[String(event.data)];
        if (keys)
          for (const key of keys)
            queryClient.invalidateQueries({ queryKey: key });
      };

      ws.onclose = () => {
        if (!unmountedRef.current) timerRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [queryClient]);
}
