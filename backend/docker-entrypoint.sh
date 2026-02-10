#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# The healthcheck in docker-compose handles this, but we can add a small delay if needed
# sleep 2

echo "Running database push (syncing schema)..."
bun run drizzle:push

if [ "$SEED_DATABASE" = "true" ]; then
  echo "Running database seeding..."
  bun run drizzle:seed
else
  echo "Skipping database seeding (SEED_DATABASE != true)..."
fi

echo "Starting Grud Backend..."
exec bun run start
