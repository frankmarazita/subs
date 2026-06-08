# subs

A terminal-based YouTube subscription manager.

## Architecture

Three packages in a monorepo: `api` is a NestJS backend backed by PostgreSQL that fetches videos from YouTube RSS feeds. `cli` is a React Ink terminal UI compiled to a standalone binary. `contracts` holds the shared ts-rest API types used by both.

## Local Development

1. Copy `packages/api/.env.example` to `packages/api/.env` and set `DATABASE_URL`
2. Install dependencies: `bun install`
3. Generate the Prisma client: `bun run --filter api generate`
4. Start the API: `bun run --filter api start:dev`

## Running the API

Requires a PostgreSQL database.

```bash
docker run \
  -e DATABASE_URL="postgresql://user:pass@host/db" \
  -p 3000:3000 \
  ghcr.io/frankmarazita/subs:latest
```

The container runs migrations automatically on startup.

## Running the CLI

Download the `subs` binary from the latest CI artifact, or build it yourself:

```bash
bun run --filter cli build
# outputs: packages/cli/subs
```

Run it:

```bash
./subs
```

By default it connects to the API at `http://localhost:3000`. Override via config (see below).

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
  "apiUrl": "http://localhost:3000"
}
```

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
