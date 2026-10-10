import { Controller, Get, Header } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@subs/contracts';
import { PrismaService } from './prisma/prisma.service.js';

const WATCH_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Watch</title>
    <style>
      body { margin: 0; padding: 0; background: #000; overflow: hidden; }
      iframe { width: 100vw; height: 100vh; border: none; }
      .error { color: white; font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
    </style>
  </head>
  <body>
    <div id="content"><div class="error">Loading video...</div></div>
    <script>
      const videoId = new URLSearchParams(window.location.search).get('v');
      if (videoId) {
        document.getElementById('content').innerHTML =
          \`<iframe src="https://www.youtube.com/embed/\${videoId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\`;
      } else {
        document.getElementById('content').innerHTML =
          '<div class="error">No video ID provided. Add ?v=VIDEO_ID to the URL.</div>';
      }
    </script>
  </body>
</html>`;

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @TsRestHandler(contract.health)
  async health() {
    return tsRestHandler(contract.health, async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { status: 200 as const, body: { status: 'ok' as const } };
      } catch {
        return { status: 503 as const, body: { status: 'error' as const } };
      }
    });
  }

  @Get('watch')
  @Header('Content-Type', 'text/html')
  watch() {
    return WATCH_HTML;
  }
}
