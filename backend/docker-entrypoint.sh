#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# The healthcheck in docker-compose handles this, but we can add a small delay if needed
# sleep 2

echo "Running database push (syncing schema)..."
bun run drizzle:push

echo "Running database seeding..."
bun run drizzle:seed

echo "Starting Grud Backend..."
exec bun run start
