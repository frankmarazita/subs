import { useMemo } from 'react';
import { useVideosQuery } from './useVideosQuery';
import { useHistoryQuery } from './useHistoryQuery';
import { useWatchLater } from './useWatchLater';
import { useVideoActions } from './useVideoActions';

export function useVideoScreen(playlistId?: string) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVideosQuery(playlistId);
  const { data: history } = useHistoryQuery();
  const { data: watchLater } = useWatchLater();
  const { markWatched, markUnwatched, addWatchLater, removeWatchLater } = useVideoActions();

  const videos = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );
  const watchedIds = useMemo(() => new Set(history?.ids ?? []), [history]);
  const watchLaterIds = useMemo(() => new Set(watchLater?.ids ?? []), [watchLater]);

  function toggleWatched(videoId: string) {
    if (watchedIds.has(videoId)) markUnwatched(videoId);
    else markWatched(videoId);
  }

  function toggleWatchLater(videoId: string) {
    if (watchLaterIds.has(videoId)) removeWatchLater(videoId);
    else addWatchLater(videoId);
  }

  return {
    videos,
    isLoading,
    error,
    watchedIds,
    watchLaterIds,
    toggleWatched,
    toggleWatchLater,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}
