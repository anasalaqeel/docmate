# Build stage
FROM oven/bun:1.3-slim AS build
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
# We pass the API URL as a build argument
ARG VITE_API_BASE_URL=http://localhost:8000/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN bun run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
