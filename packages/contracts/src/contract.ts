import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  VideoSchema,
  SubscriptionSchema,
  IdsResponseSchema,
} from "./schemas.js";

const c = initContract();

export const contract = c.router({
  health: {
    method: "GET",
    path: "/health",
    responses: {
      200: z.object({ status: z.string() }),
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
