FROM oven/bun:1.2.23
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --filter web build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/web", "start"]
