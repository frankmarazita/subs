FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY packages/api ./packages/api
COPY packages/contracts ./packages/contracts
RUN cd packages/api && DATABASE_URL=postgresql://dummy/dummy bunx prisma generate
RUN cd packages/api && bun run build

FROM base AS release
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --production
ARG TARGETARCH
ARG YTDLP_VERSION=2026.08.19
ARG YTDLP_SHA256_AMD64=f3dec9cfeaf304cec98290fe41c6ad465d4b747d302473559643e7af24929722
ARG YTDLP_SHA256_ARM64=17b164c4d258be92bb1ad146cb7c336b783aedb380814aabbcb7d52937f77e57
RUN apk add --no-cache tini deno \
  && if [ "$TARGETARCH" = arm64 ]; then asset=yt-dlp_musllinux_aarch64 sha=$YTDLP_SHA256_ARM64; else asset=yt-dlp_musllinux sha=$YTDLP_SHA256_AMD64; fi \
  && wget -qO /usr/local/bin/yt-dlp "https://github.com/yt-dlp/yt-dlp/releases/download/$YTDLP_VERSION/$asset" \
  && echo "$sha  /usr/local/bin/yt-dlp" | sha256sum -c - \
  && chmod +x /usr/local/bin/yt-dlp
COPY --from=build /app/packages/api ./packages/api
COPY --from=build /app/packages/contracts ./packages/contracts
USER bun
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "sh", "-c", "cd /app/packages/api && bunx prisma migrate deploy && exec bun dist/src/main.js"]
