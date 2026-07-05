import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IdsResponse } from '@subs/contracts';
import { apiClient } from '../services/client';
import { historyQueryKey } from './useHistoryQuery';
import { watchLaterQueryKey } from './useWatchLater';
import { videosFeedKey, WATCH_LATER_PLAYLIST_ID } from './useVideosQuery';

function withId(data: IdsResponse | undefined, videoId: string): IdsResponse {
  const ids = data?.ids ?? [];
  return { ids: ids.includes(videoId) ? ids : [...ids, videoId] };
}

function withoutId(data: IdsResponse | undefined, videoId: string): IdsResponse {
  return { ids: (data?.ids ?? []).filter((id) => id !== videoId) };
}

export function useVideoActions() {
  const queryClient = useQueryClient();

  // Optimistically add or remove a single id in an ids-cache. Rollback is
  // surgical (undo only this id), so concurrent mutations on the same cache
  // don't clobber each other's optimistic writes on failure.
  function useIdsMutation(
    queryKey: readonly unknown[],
    mutationFn: (videoId: string) => Promise<unknown>,
    op: 'add' | 'remove',
    onSettledExtra?: () => void,
  ): (videoId: string) => void {
    const apply = op === 'add' ? withId : withoutId;
    const undo = op === 'add' ? withoutId : withId;
    // videoIds with this exact op currently in flight, so a duplicate tap of
    // the same action is ignored (the opposite toggle is a separate mutation
    // and stays allowed).
    const pending = useRef<Set<string>>(new Set());
    const mutation = useMutation({
      mutationFn,
      onMutate: async (videoId: string) => {
        await queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<IdsResponse>(queryKey, (old) =>
          apply(old, videoId),
        );
      },
      onError: (_err, videoId) => {
        queryClient.setQueryData<IdsResponse>(queryKey, (old) =>
          undo(old, videoId),
        );
      },
      onSettled: (_data, _err, videoId) => {
        pending.current.delete(videoId);
        queryClient.invalidateQueries({ queryKey });
        onSettledExtra?.();
      },
    });
    return (videoId: string) => {
      if (pending.current.has(videoId)) return;
      pending.current.add(videoId);
      mutation.mutate(videoId);
    };
  }

  const invalidateWatchLaterFeed = () =>
    queryClient.invalidateQueries({
      queryKey: videosFeedKey(WATCH_LATER_PLAYLIST_ID),
    });

  const markWatched = useIdsMutation(
    historyQueryKey,
    (videoId) => apiClient.history.markWatched({ params: { videoId } }),
    'add',
  );

  const markUnwatched = useIdsMutation(
    historyQueryKey,
    (videoId) => apiClient.history.markUnwatched({ params: { videoId } }),
    'remove',
  );

  const addWatchLater = useIdsMutation(
    watchLaterQueryKey,
    (videoId) => apiClient.watchLater.add({ params: { videoId } }),
    'add',
    invalidateWatchLaterFeed,
  );

  const removeWatchLater = useIdsMutation(
    watchLaterQueryKey,
    (videoId) => apiClient.watchLater.remove({ params: { videoId } }),
    'remove',
    invalidateWatchLaterFeed,
  );

  return { markWatched, markUnwatched, addWatchLater, removeWatchLater };
}
