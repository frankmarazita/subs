import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "../services/client";
import { deserializeVideo } from "../services/api-client";

export const videosQueryKey = ["videos"] as const;

export const WATCH_LATER_PLAYLIST_ID = "watch_later";

export function videosFeedKey(playlistId?: string) {
  return [...videosQueryKey, { playlistId: playlistId ?? null }] as const;
}

const PAGE_SIZE = 50;

export function useVideosQuery(playlistId?: string) {
  return useInfiniteQuery({
    queryKey: videosFeedKey(playlistId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await apiClient.videos.getVideosFeed({
        query: { limit: PAGE_SIZE, cursor: pageParam, playlistId },
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
