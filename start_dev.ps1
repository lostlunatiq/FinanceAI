Write-Host "FinanceAI - Local Development Setup"
Write-Host "--------------------------------------"

if (!(Test-Path -Path ".venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

Write-Host "Installing dependencies..."
.venv\Scripts\pip.exe install -q django djangorestframework djangorestframework-simplejwt django-cors-headers django-environ openai pillow celery clickhouse-connect redis

Write-Host "Running migrations..."
$env:USE_SQLITE="true"
$env:DJANGO_SETTINGS_MODULE="config.settings.dev"
.venv\Scripts\python.exe manage.py makemigrations --no-input
.venv\Scripts\python.exe manage.py migrate --no-input

Write-Host "Seeding demo data..."
.venv\Scripts\python.exe manage.py seed_demo

Write-Host "`n--------------------------------------"
Write-Host "FinanceAI is ready!`n"
Write-Host "Open in browser: http://localhost:8000`n"
Write-Host "Login credentials:"
Write-Host "   Vendor:          vendor1 / demo1234"
Write-Host "   Vendor 2:        vendor2 / demo1234"
Write-Host "   Employee:        employee1 / demo1234"
Write-Host "   L1 Approver:     l1_approver / demo1234"
Write-Host "   Dept Head:       hod / demo1234"
Write-Host "   Finance Manager: fin_manager / demo1234"
Write-Host "   Finance Admin:   fin_admin / demo1234"
Write-Host "   CFO:             cfo / demo1234`n"
Write-Host "Pages:"
Write-Host "   Login:          http://localhost:8000/frontend/financeai_login/code.html"
Write-Host "   Vendor Portal:  http://localhost:8000/frontend/vendor_portal/code.html"
Write-Host "   AP Hub:         http://localhost:8000/frontend/accounts_payable_hub/code.html"
Write-Host "   CFO Dashboard:  http://localhost:8000/frontend/cfo_command_center/code.html"
Write-Host "   Audit Log:      http://localhost:8000/frontend/audit_log/code.html`n"
Write-Host "Press Ctrl+C to stop the server."
Write-Host "--------------------------------------`n"

.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
