import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { VideosModule } from './videos/videos.module.js';
import { WatchLaterModule } from './watch-later/watch-later.module.js';
import { HistoryModule } from './history/history.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { EventsModule } from './events/events.module.js';
import { SubtitlesModule } from './subtitles/subtitles.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EventsModule,
    VideosModule,
    WatchLaterModule,
    HistoryModule,
    SubscriptionsModule,
    SubtitlesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
