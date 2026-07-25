FROM oven/bun:1.3
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy only manifests first so `bun install` is cached independently of source
# changes. Editing app code no longer busts the dependency layer.
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/data-worker/package.json apps/data-worker/
COPY packages/otr-core/package.json packages/otr-core/

RUN bun install --frozen-lockfile

COPY . .
RUN bun run --filter web build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/web", "start"]
