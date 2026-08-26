#!/bin/sh
set -e

echo "Running database push (syncing schema)..."
bun run drizzle:push

if [ "$SEED_DATABASE" = "true" ]; then
  echo "Running database seeding..."
  bun run drizzle:seed
fi

echo "Starting Docmate Backend..."
exec bun run start
