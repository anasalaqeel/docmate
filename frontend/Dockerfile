# Build stage
FROM oven/bun:1.3-slim AS build
WORKDIR /app

# Install dependencies
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .

RUN bun run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.http.conf /etc/nginx/nginx.http.conf
COPY nginx.https.conf /etc/nginx/nginx.https.conf
COPY 40-toggle-ssl.sh /docker-entrypoint.d/40-toggle-ssl.sh
RUN chmod +x /docker-entrypoint.d/40-toggle-ssl.sh

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
