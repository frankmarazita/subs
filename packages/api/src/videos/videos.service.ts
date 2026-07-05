import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import type { VideoDto } from '@subs/contracts';

const FETCH_CONCURRENCY = 50;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => name === 'entry' || name === 'media:thumbnail',
});

interface RssAttr {
  url?: string;
  href?: string;
  views?: string;
  count?: string;
}

interface RssMediaCommunity {
  'media:statistics'?: RssAttr;
  'media:starRating'?: RssAttr;
}

interface RssMediaGroup {
  'media:thumbnail'?: RssAttr[];
  'media:description'?: string;
  'media:community'?: RssMediaCommunity;
}

interface RssEntry {
  'yt:videoId'?: string;
  title?: string;
  published?: string;
  link?: RssAttr;
  author?: { name?: string };
  'media:group'?: RssMediaGroup;
}

interface RssFeed {
  feed?: {
    entry?: RssEntry[];
  };
}

interface CursorPayload {
  p: string;
  i: string;
}

function encodeCursor(published: bigint, id: string): string {
  const json = JSON.stringify({
    p: published.toString(),
    i: id,
  } satisfies CursorPayload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

function decodeCursor(raw: string): { published: bigint; id: string } | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as CursorPayload;
    if (typeof parsed.p !== 'string' || typeof parsed.i !== 'string') {
      return null;
    }
    return { published: BigInt(parsed.p), id: parsed.i };
  } catch {
    return null;
  }
}

function toDto(video: {
  id: string;
  title: string;
  channel: string;
  link: string;
  published: bigint;
  isShort: boolean;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  description: string | null;
}): VideoDto {
  return {
    videoId: video.id,
    title: video.title,
    channel: video.channel,
    link: video.link,
    published: new Date(Number(video.published)).toISOString(),
    isShort: video.isShort,
    thumbnailUrl: video.thumbnailUrl ?? undefined,
    viewCount: video.viewCount ?? undefined,
    likeCount: video.likeCount ?? undefined,
    description: video.description ?? undefined,
  };
}

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  private isRefreshing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly events: EventsGateway,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledRefresh() {
    this.logger.log('Scheduled video refresh starting');
    try {
      await this.refreshVideos(false);
      this.logger.log('Scheduled video refresh complete');
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn('Scheduled refresh skipped: refresh already in progress');
      } else {
        this.logger.error(`Scheduled video refresh failed: ${error}`);
      }
    }
  }

  async getVideos(includeShorts = false): Promise<VideoDto[]> {
    const videos = await this.prisma.video.findMany({
      where: includeShorts ? undefined : { isShort: false },
      orderBy: { published: 'desc' },
    });

    return videos.map(toDto);
  }

  async getVideosFeed(opts: {
    cursor?: string;
    limit: number;
    includeShorts: boolean;
    playlistId?: string;
  }): Promise<{ items: VideoDto[]; nextCursor: string | null }> {
    let decoded: { published: bigint; id: string } | null = null;
    if (opts.cursor !== undefined) {
      decoded = decodeCursor(opts.cursor);
      if (decoded === null) {
        throw new BadRequestException('Invalid cursor');
      }
    }

    const where = {
      ...(opts.includeShorts ? {} : { isShort: false }),
      ...(opts.playlistId
        ? { playlists: { some: { playlistId: opts.playlistId } } }
        : {}),
      ...(decoded
        ? {
            OR: [
              { published: { lt: decoded.published } },
              { published: decoded.published, id: { lt: decoded.id } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.video.findMany({
      where,
      orderBy: [{ published: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const page = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map(toDto),
      nextCursor: hasMore && last ? encodeCursor(last.published, last.id) : null,
    };
  }

  async refreshVideos(includeShorts = false): Promise<VideoDto[]> {
    if (this.isRefreshing) {
      throw new ConflictException('Refresh already in progress');
    }

    this.isRefreshing = true;

    try {
      const subscriptions = await this.subscriptionsService.getAll();

      const allVideos: VideoDto[] = [];
      for (let i = 0; i < subscriptions.length; i += FETCH_CONCURRENCY) {
        const batch = subscriptions.slice(i, i + FETCH_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((sub) => this.fetchRSSFeed(sub.channelId)),
        );
        for (const [j, result] of results.entries()) {
          if (result.status === 'fulfilled') {
            allVideos.push(...result.value);
          } else {
            this.logger.warn(
              `Failed to fetch RSS for channel ${batch[j]!.channelId}: ${result.reason}`,
            );
          }
        }
      }

      if (allVideos.length > 0) {
        const now = BigInt(Date.now());
        const upsertResults = await Promise.allSettled(
          allVideos.map((v) =>
            this.prisma.video.upsert({
              where: { id: v.videoId },
              create: {
                id: v.videoId,
                title: v.title,
                channel: v.channel,
                link: v.link,
                published: BigInt(new Date(v.published).getTime()),
                isShort: v.isShort,
                thumbnailUrl: v.thumbnailUrl ?? null,
                viewCount: v.viewCount ?? null,
                likeCount: v.likeCount ?? null,
                description: v.description ?? null,
                cachedAt: now,
              },
              update: {
                title: v.title,
                channel: v.channel,
                link: v.link,
                published: BigInt(new Date(v.published).getTime()),
                isShort: v.isShort,
                thumbnailUrl: v.thumbnailUrl ?? null,
                viewCount: v.viewCount ?? null,
                likeCount: v.likeCount ?? null,
                description: v.description ?? null,
                cachedAt: now,
              },
            }),
          ),
        );
        for (const [i, result] of upsertResults.entries()) {
          if (result.status === 'rejected') {
            this.logger.warn(
              `Failed to upsert video ${allVideos[i]!.videoId}: ${result.reason}`,
            );
          }
        }
      }

      const videos = await this.prisma.video.findMany({
        where: includeShorts ? undefined : { isShort: false },
        orderBy: { published: 'desc' },
      });

      const result = videos.map(toDto);
      this.events.broadcast('videos');
      return result;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async fetchRSSFeed(channelId: string): Promise<VideoDto[]> {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetch(rssUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from RSS feed`);
    }

    try {
      const xmlData = await response.text();
      const result = xmlParser.parse(xmlData) as RssFeed;

      const videos: VideoDto[] = [];
      const entries = result?.feed?.entry ?? [];

      for (const entry of entries) {
        const videoId = entry['yt:videoId'];
        if (!videoId) continue;

        const link = entry.link?.href ?? '';
        const isShort = link.includes('/shorts/');
        const mediaGroup = entry['media:group'];
        const thumbnails = mediaGroup?.['media:thumbnail'];
        const thumbnailUrl =
          thumbnails?.[thumbnails.length - 1]?.url ??
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        const community = mediaGroup?.['media:community'];
        const viewsStr = community?.['media:statistics']?.views;
        const likesStr = community?.['media:starRating']?.count;

        videos.push({
          videoId,
          title: entry.title ?? '',
          channel: entry.author?.name ?? '',
          link,
          published: new Date(entry.published ?? 0).toISOString(),
          isShort,
          thumbnailUrl,
          viewCount: viewsStr ? parseInt(viewsStr, 10) : undefined,
          likeCount: likesStr ? parseInt(likesStr, 10) : undefined,
          description: mediaGroup?.['media:description'],
        });
      }

      return videos;
    } catch (error) {
      this.logger.warn(
        `Failed to parse RSS feed for channel ${channelId}: ${error}`,
      );
      return [];
    }
  }
}
