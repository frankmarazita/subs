import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async getIds(): Promise<string[]> {
    const rows = await this.prisma.watchHistory.findMany({
      select: { videoId: true },
    });
    return rows.map((r) => r.videoId);
  }

  async markWatched(videoId: string): Promise<void> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) {
      throw new NotFoundException(
        `Video ${videoId} not found. Refresh videos first.`,
      );
    }
    try {
      await this.prisma.watchHistory.upsert({
        where: { videoId },
        create: { videoId, watchedAt: BigInt(Date.now()) },
        update: {},
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
    this.events.broadcast('history');
  }

  async markUnwatched(videoId: string): Promise<void> {
    await this.prisma.watchHistory.deleteMany({ where: { videoId } });
    this.events.broadcast('history');
  }
}
