# subs

A self-hosted YouTube subscription manager, without the algorithm. Follow channels, see their latest uploads in chronological order, and track what you've watched from a terminal UI or a mobile-friendly web app.

## Screenshots

### CLI

![subs CLI showing the video feed with a thumbnail preview](docs/images/cli-main.png)

### Web

<p align="center">
  <img src="docs/images/web.png" alt="subs web app showing the video feed on mobile" width="320">
</p>

## Architecture

Four packages in a monorepo: `api` is a NestJS backend backed by PostgreSQL that fetches videos from YouTube RSS feeds. `cli` is a React Ink terminal UI compiled to a standalone binary. `web` is a React PWA for browsing on desktop or phone. `contracts` holds the shared ts-rest API types used by the others.

## Local Development

1. Copy `packages/api/.env.example` to `packages/api/.env` and set `DATABASE_URL`
2. Install dependencies: `bun install`
3. Generate the Prisma client: `bun run --filter api generate`
4. Start the API and web app: `bun run dev`

Fetching subtitles requires [yt-dlp](https://github.com/yt-dlp/yt-dlp) on your `PATH` (or set `YTDLP_PATH`). The Docker image bundles it.

Error reporting uses [Sentry](https://docs.sentry.io/platforms/javascript/guides/nestjs/) via `@sentry/nestjs` and is off unless `SENTRY_DSN` is set. Optional: `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, and `SENTRY_TRACES_SAMPLE_RATE` (defaults to `0`).

## Running the API

Requires a PostgreSQL database.

```bash
docker run \
  -e DATABASE_URL="postgresql://user:pass@host/db" \
  -p 3000:3000 \
  ghcr.io/frankmarazita/subs-api:latest
```

The container runs migrations automatically on startup.

## Running the CLI

Download the `subs` binary from the latest CI artifact, or build it yourself:

```bash
bun run --filter cli build
# outputs: packages/cli/dist/subs
```

Run it:

```bash
./subs
```

By default it connects to the API at `http://localhost:3000`. Override via config (see below).

## Running the web app

```bash
docker run -p 8080:80 ghcr.io/frankmarazita/subs-web:latest
```

The web app connects to `http://localhost:3000` by default (or `VITE_API_URL` when set at build time). Additional API hosts can be added and switched between from the Settings tab. It can be installed as a PWA from the browser.

## Keyboard controls

| Key                    | Action                                          |
| ---------------------- | ----------------------------------------------- |
| `↑` / `↓` or `j` / `k` | Navigate videos                                 |
| `PgUp` / `PgDn`        | Jump by page                                    |
| `Enter` / `o`          | Open in browser (marks as watched)              |
| `v`                    | Open in built-in HTML viewer (marks as watched) |
| `w`                    | Toggle watch-later                              |
| `m`                    | Toggle watched/unwatched                        |
| `l`                    | Filter to watch-later only                      |
| `s`                    | Show QR code for current video                  |
| `r`                    | Refresh videos                                  |
| `p`                    | Toggle thumbnail preview                        |
| `q` / `Esc`            | Quit                                            |

## Configuration

Config is stored at `~/.config/subs/config.json`:

```json
{
  "userPreferences": {
    "thumbnailPreview": true,
    "autoRefresh": true
  },
  "apiUrl": "http://localhost:3000",
  "viewerUrl": "http://localhost:3000/watch?v={videoId}"
}
```

`viewerUrl` sets where the `v` key opens videos. The `{videoId}` placeholder is
replaced with the URL-encoded video ID, so any player or proxy path shape works.
When omitted, videos open at `<apiUrl>/watch?v=<videoId>`.

The CLI watches this file for live changes.

## Managing subscriptions

Via the API:

```bash
# Add a channel (any YouTube URL format)
curl -X POST http://localhost:3000/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/@channelname"}'

# Import from Google Takeout CSV
curl -X POST http://localhost:3000/subscriptions/import-csv \
  -H "Content-Type: text/csv" \
  --data-binary @subscriptions.csv

# Export to CSV
curl http://localhost:3000/subscriptions/export-csv
```
