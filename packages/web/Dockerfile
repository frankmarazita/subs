FROM oven/bun:1.3.10-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY packages/contracts ./packages/contracts
COPY packages/web ./packages/web
RUN cd packages/web && bun run build

FROM nginx:1.29.5-alpine-slim AS release
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
