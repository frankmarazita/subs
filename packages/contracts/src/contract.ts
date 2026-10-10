import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  VideoSchema,
  SubscriptionSchema,
  IdsResponseSchema,
  SubtitlesSchema,
} from "./schemas.js";

const c = initContract();

export const contract = c.router({
  health: {
    method: "GET",
    path: "/health",
    responses: {
      200: z.object({ status: z.literal("ok") }),
      503: z.object({ status: z.literal("error") }),
    },
  },
  videos: c.router({
    getVideos: {
      method: "GET",
      path: "/videos",
      query: z.object({
        includeShorts: z.coerce.boolean().optional(),
      }),
      responses: {
        200: z.array(VideoSchema),
      },
    },
    getVideosFeed: {
      method: "GET",
      path: "/videos/feed",
      query: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        includeShorts: z.coerce.boolean().optional(),
        playlistId: z.string().optional(),
        search: z.string().optional(),
        channel: z.string().optional(),
      }),
      responses: {
        200: z.object({
          items: z.array(VideoSchema),
          nextCursor: z.string().nullable(),
        }),
        400: z.object({ message: z.string() }),
      },
    },
    refreshVideos: {
      method: "POST",
      path: "/videos/refresh",
      query: z.object({
        includeShorts: z.coerce.boolean().optional(),
      }),
      body: null,
      responses: {
        200: z.array(VideoSchema),
        409: z.object({ message: z.string() }),
      },
    },
  }),
  subtitles: c.router({
    get: {
      method: "GET",
      path: "/videos/:videoId/subtitles",
      pathParams: z.object({
        videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      }),
      query: z.object({
        lang: z
          .string()
          .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/)
          .default("en"),
      }),
      responses: {
        200: SubtitlesSchema,
        404: z.object({ message: z.string() }),
        429: z.object({ message: z.string() }),
        502: z.object({ message: z.string() }),
      },
    },
  }),
  subscriptions: c.router({
    getAll: {
      method: "GET",
      path: "/subscriptions",
      responses: {
        200: z.array(SubscriptionSchema),
      },
    },
    add: {
      method: "POST",
      path: "/subscriptions",
      body: z.object({ url: z.string() }),
      responses: {
        201: SubscriptionSchema,
        409: z.object({ message: z.string() }),
        422: z.object({ message: z.string() }),
      },
    },
    remove: {
      method: "DELETE",
      path: "/subscriptions/:channelId",
      pathParams: z.object({ channelId: z.string() }),
      responses: {
        204: c.noBody(),
        404: z.object({ message: z.string() }),
      },
    },
  }),
  watchLater: c.router({
    getIds: {
      method: "GET",
      path: "/watch-later",
      responses: {
        200: IdsResponseSchema,
      },
    },
    add: {
      method: "PUT",
      path: "/watch-later/:videoId",
      pathParams: z.object({ videoId: z.string() }),
      body: null,
      responses: {
        204: c.noBody(),
        404: z.object({ message: z.string() }),
      },
    },
    remove: {
      method: "DELETE",
      path: "/watch-later/:videoId",
      pathParams: z.object({ videoId: z.string() }),
      responses: {
        204: c.noBody(),
      },
    },
  }),
  history: c.router({
    getIds: {
      method: "GET",
      path: "/history",
      responses: {
        200: IdsResponseSchema,
      },
    },
    markWatched: {
      method: "PUT",
      path: "/history/:videoId",
      pathParams: z.object({ videoId: z.string() }),
      body: null,
      responses: {
        204: c.noBody(),
        404: z.object({ message: z.string() }),
      },
    },
    markUnwatched: {
      method: "DELETE",
      path: "/history/:videoId",
      pathParams: z.object({ videoId: z.string() }),
      responses: {
        204: c.noBody(),
      },
    },
  }),
});
