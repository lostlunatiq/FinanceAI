#!/bin/bash

# Exit on error
set -e

echo "Setting up FinanceAI database..."

# Create migrations
echo "Creating migrations..."
python manage.py makemigrations

# Apply migrations
echo "Applying migrations..."
python manage.py migrate

# Create superuser
echo "Creating superuser..."
python manage.py createsuperuser --noinput --username admin --email admin@example.com || true

# Seed demo data
echo "Seeding demo data..."
python manage.py seed_demo

echo "Database setup complete!"