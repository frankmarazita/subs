import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "../services/client";
import { deserializeVideo } from "../services/api-client";

export const videosQueryKey = ["videos"] as const;

export const WATCH_LATER_PLAYLIST_ID = "watch_later";

export interface VideosFeedFilters {
  playlistId?: string;
  search?: string;
  channel?: string;
}

// The playlistId sits in its own key segment so callers can invalidate a whole
// playlist's feed (e.g. watch_later) by prefix, regardless of any active search.
export function videosFeedKey(filters: VideosFeedFilters = {}) {
  return [
    ...videosQueryKey,
    { playlistId: filters.playlistId ?? null },
    { search: filters.search ?? null, channel: filters.channel ?? null },
  ] as const;
}

const PAGE_SIZE = 50;

export function useVideosQuery(filters: VideosFeedFilters = {}) {
  return useInfiniteQuery({
    queryKey: videosFeedKey(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await apiClient.videos.getVideosFeed({
        query: {
          limit: PAGE_SIZE,
          cursor: pageParam,
          playlistId: filters.playlistId,
          search: filters.search,
          channel: filters.channel,
        },
      });
      if (result.status !== 200)
        throw new Error(`Failed to fetch videos: ${result.status}`);
      return {
        items: result.body.items
          .map(deserializeVideo)
          .filter((v) => v.videoId && v.title && v.channel && v.link),
        nextCursor: result.body.nextCursor,
      };
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
