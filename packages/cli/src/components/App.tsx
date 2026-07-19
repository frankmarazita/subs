import { Box, Text, useStdout, useApp } from "ink";
import { exec } from "child_process";
import { VideoList } from "./VideoList";
import { LoadingScreen } from "./LoadingScreen";
import { useAppStore } from "../store/appStore";
import { useConfigStore } from "../store/configStore";
import { useWatchLater } from "../hooks/useWatchLater";
import {
  useVideosQuery,
  useRefreshVideosMutation,
} from "../hooks/useVideosQuery";
import { useHistoryQuery } from "../hooks/useHistoryQuery";
import type { VideoItem } from "../types";
import { getApiBaseUrl } from "../services/api-client";
import { buildViewerUrl } from "../utils/config";
import { useWebSocket } from "../hooks/useWebSocket";
import { useEffect, useState } from "react";

export function App() {
  const { stdout } = useStdout();
  const { exit } = useApp();

  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  useWebSocket();

  const configStore = useConfigStore();
  const { config } = configStore;
  const autoRefreshInterval = config.userPreferences.autoRefresh
    ? 5 * 60 * 1000
    : false;

  const {
    isPending,
    error,
    data: videosData,
    dataUpdatedAt,
  } = useVideosQuery(autoRefreshInterval);
  const refreshMutation = useRefreshVideosMutation();

  const { data: historyData } = useHistoryQuery();
  const { data: watchLaterData } = useWatchLater();

  const initializeApp = useAppStore((state) => state.initializeApp);
  const mutationError = useAppStore((state) => state.error);

  useEffect(() => {
    if (videosData) {
      useAppStore.getState().setVideos(videosData, dataUpdatedAt);
    }
  }, [videosData, dataUpdatedAt]);

  useEffect(() => {
    if (historyData) {
      useAppStore.setState({ watchedIds: new Set(historyData.ids) });
    }
  }, [historyData]);

  useEffect(() => {
    if (watchLaterData) {
      useAppStore.setState({ watchLaterIds: new Set(watchLaterData.ids) });
    }
  }, [watchLaterData]);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const unsubscribe = useConfigStore.subscribe((state) => {
      const currentAppState = useAppStore.getState();
      if (
        currentAppState.showPreview !==
        state.config.userPreferences.thumbnailPreview
      ) {
        useAppStore.setState({
          showPreview: state.config.userPreferences.thumbnailPreview,
        });
      }
    });
    return unsubscribe;
  }, []);

  const openUrl = (url: string) => {
    const command =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(`${command} "${url}"`, () => {});
  };

  const handleVideoSelect = (video: VideoItem) => {
    openUrl(video.link);
  };

  const handleVideoSelectInViewer = (video: VideoItem) => {
    const config = useConfigStore.getState().config;
    openUrl(buildViewerUrl(config, getApiBaseUrl(), video.videoId));
  };

  const handleExit = () => {
    configStore.stopWatching();
    exit();
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const queryError = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;
  const displayError = mutationError || queryError;

  if (displayError) {
    return (
      <Box
        height={dimensions.height}
        justifyContent="center"
        alignItems="center"
      >
        <Text color="red">❌ Error: {displayError}</Text>
      </Box>
    );
  }

  if (isPending) {
    return <LoadingScreen text="Loading your YouTube subscriptions..." />;
  }

  const lastUpdated = dataUpdatedAt > 0 ? new Date(dataUpdatedAt) : null;
  const cacheAge =
    dataUpdatedAt > 0 ? Math.floor((Date.now() - dataUpdatedAt) / 60000) : 0;

  return (
    <Box height={dimensions.height}>
      <VideoList
        onSelect={handleVideoSelect}
        onSelectInViewer={handleVideoSelectInViewer}
        onExit={handleExit}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        cacheAge={cacheAge}
        terminalWidth={dimensions.width}
        terminalHeight={dimensions.height}
      />
    </Box>
  );
}
