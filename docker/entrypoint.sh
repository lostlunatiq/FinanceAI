#!/bin/bash
set -e

echo "Running migrations..."
uv run python manage.py migrate --no-input

echo "Seeding demo data..."
# Seed is safe to re-run but may warn if data already exists
uv run python manage.py seed_demo || true

echo "Ready. Starting server..."
exec "$@"
