#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/drizzle-kit push

echo "Starting application..."
exec bun server.js
