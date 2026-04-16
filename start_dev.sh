#!/bin/bash
# FinanceAI — Local Development Startup Script
# Run this script to start the entire application locally.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "🚀 FinanceAI — Local Development Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Check/Create Virtual Environment ─────────────────────────
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# ─── 2. Install Dependencies ─────────────────────────────────────
echo "📦 Installing dependencies..."
.venv/bin/pip install -q django djangorestframework djangorestframework-simplejwt \
    django-cors-headers django-environ openai pillow 2>&1 | tail -3

# ─── 3. Run Migrations ───────────────────────────────────────────
echo "🗄️  Running migrations..."
USE_SQLITE=true DJANGO_SETTINGS_MODULE=config.settings.dev \
    .venv/bin/python manage.py makemigrations --no-input 2>&1 | grep -v "^$\|WARNING\|HINT" || true
USE_SQLITE=true DJANGO_SETTINGS_MODULE=config.settings.dev \
    .venv/bin/python manage.py migrate --no-input 2>&1 | grep -v "^$\|WARNING\|HINT" || true

# ─── 4. Seed Demo Data ───────────────────────────────────────────
echo "🌱 Seeding demo data..."
USE_SQLITE=true DJANGO_SETTINGS_MODULE=config.settings.dev \
    .venv/bin/python manage.py seed_demo 2>&1 | grep -v "^$\|WARNING\|HINT"

# ─── 5. Start Server ─────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FinanceAI is ready!"
echo ""
echo "🌐 Open in browser: http://localhost:8000"
echo ""
echo "📋 Login credentials:"
echo "   Vendor:          vendor1 / demo1234"
echo "   Vendor 2:        vendor2 / demo1234"
echo "   Employee:        employee1 / demo1234"
echo "   L1 Approver:     l1_approver / demo1234"
echo "   Dept Head:       hod / demo1234"
echo "   Finance Manager: fin_manager / demo1234"
echo "   Finance Admin:   fin_admin / demo1234"
echo "   CFO:             cfo / demo1234"
echo ""
echo "📄 Pages:"
echo "   Login:          http://localhost:8000/frontend/financeai_login/code.html"
echo "   Vendor Portal:  http://localhost:8000/frontend/vendor_portal/code.html"
echo "   AP Hub:         http://localhost:8000/frontend/accounts_payable_hub/code.html"
echo "   CFO Dashboard:  http://localhost:8000/frontend/cfo_command_center/code.html"
echo "   Audit Log:      http://localhost:8000/frontend/audit_log/code.html"
echo ""
echo "Press Ctrl+C to stop the server."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

USE_SQLITE=true DJANGO_SETTINGS_MODULE=config.settings.dev \
    .venv/bin/python manage.py runserver 0.0.0.0:8000
