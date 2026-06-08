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

FROM base AS release
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile --production
RUN apk add --no-cache tini
COPY --from=build /app/packages/api ./packages/api
COPY --from=build /app/packages/contracts ./packages/contracts
USER bun
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "sh", "-c", "cd /app/packages/api && bunx prisma migrate deploy && exec bun src/main.ts"]
