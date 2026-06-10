#!/bin/sh
set -e

echo "Running database migrations..."
npx tsx DB/migrate.ts

if [ "${RUN_SEED}" = "true" ]; then
  echo "Seeding admin user..."
  npx tsx DB/seed.ts
fi

echo "Starting API server..."
exec node dist/index.js
