FROM oven/bun:1.3-slim AS base
WORKDIR /app

# Install all dependencies (including devDependencies for drizzle-kit)
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile

# Build stage — run drizzle push and install production-only deps
FROM base AS release
COPY --from=install --chown=bun:bun /temp/prod/node_modules node_modules
COPY --chown=bun:bun . .
COPY --chown=bun:bun docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production

USER bun

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
