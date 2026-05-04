#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --no-input

echo "Seeding demo data..."
# Seed is safe to re-run but may warn if data already exists
python manage.py seed_demo || true

echo "Ready. Starting server..."
exec "$@"
