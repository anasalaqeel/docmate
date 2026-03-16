# Use the official Bun image
FROM oven/bun:1.3-slim AS base
WORKDIR /app

# Install production dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Final image
FROM base AS release
COPY --from=install --chown=bun:bun /temp/prod/node_modules node_modules
COPY --chown=bun:bun . .

# Expose the API port
EXPOSE 8000

# Copy and set up the entrypoint script
COPY --chown=bun:bun docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set environment to production
ENV NODE_ENV=production

# Use non-root user for security
USER bun

# Healthcheck to monitor app status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/v1/health || exit 1

# Run the app via entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
