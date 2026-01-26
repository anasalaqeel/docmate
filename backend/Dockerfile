# Use the official Bun image
FROM oven/bun:1.3-slim AS base
WORKDIR /app

# Install dependencies in a separate stage for caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Expose the API port
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Run the app
CMD [ "bun", "run", "index.ts" ]
