FROM oven/bun:1.3-slim
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
USER bun
EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
