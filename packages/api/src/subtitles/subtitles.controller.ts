import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@subs/contracts';
import { SubtitlesService } from './subtitles.service.js';

@Controller()
export class SubtitlesController {
  constructor(private readonly subtitlesService: SubtitlesService) {}

  @TsRestHandler(contract.subtitles.get)
  async get() {
    return tsRestHandler(contract.subtitles.get, async ({ params, query }) => {
      const subtitles = await this.subtitlesService.getSubtitles(
        params.videoId,
        query.lang,
      );
      return { status: 200 as const, body: subtitles };
    });
  }
}
