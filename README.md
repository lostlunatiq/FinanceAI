# FinanceAI - Intelligent Finance Management System

FinanceAI is a comprehensive finance management system built with Django, React, and AI capabilities for expense management, invoice processing, and financial analytics.

## Features

- **Multi-role Authentication**: 10+ user roles with RBAC (Vendor, Employee L1/L2, Department Head, Finance L1/L2, CFO, CEO, Admin, Auditor, External CA)
- **Expense Management**: Complete vendor bill lifecycle with 6-step approval chain
- **Invoice Management**: Sales invoicing with dunning and reconciliation
- **AI Integration**: Claude API for OCR, anomaly detection, and natural language query
- **Audit Trail**: Hash-chained immutable audit log
- **File Management**: SHA256 deduplication with MinIO/S3 storage
- **State Machine**: Generic state machine engine for business processes

## Tech Stack

### Backend
- Django 5 + Django REST Framework
- PostgreSQL 16
- Redis (Celery broker + cache)
- MinIO (S3-compatible storage)
- Celery (async tasks)
- JWT authentication

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- React Query (data fetching)
- React Router (routing)

### AI/ML
- Claude API (via masking middleware)
- OCR for document processing
- Anomaly detection
- Natural language query

## Project Structure

```
financeai/
├── apps/                           # Django apps
│   ├── accounts/                   # Authentication & RBAC
│   ├── core/                       # Shared models & services
│   ├── expenses/                   # Expense management
│   ├── invoices/                   # Invoice management
│   ├── vendors/                    # Vendor management
│   └── ...
├── frontend/                       # React frontend
│   ├── src/
│   │   ├── components/             # React components
│   │   ├── pages/                  # Page components
│   │   ├── layouts/                # Layout components
│   │   ├── stores/                 # Zustand stores
│   │   ├── api/                    # API clients
│   │   └── types/                  # TypeScript types
├── config/                         # Django settings
└── docs/                          # Documentation
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16
- Redis

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd financeai
   ```

2. **Set up backend**
   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run migrations
   python manage.py migrate
   
   # Seed demo data
   python manage.py seed_demo
   ```

3. **Set up frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Run with Docker (recommended)**
   ```bash
   docker-compose up -d
   ```

### Running the Application

1. **Start backend**
   ```bash
   python manage.py runserver
   ```

2. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin panel: http://localhost:8000/admin

### Demo Accounts

All demo accounts use password: `hackathon2026`

| Role | Email | Description |
|------|-------|-------------|
| Vendor | vendor@demo.com | External vendor submitting bills |
| Employee L1 | l1@demo.com | Internal employee submitting expenses |
| Employee L2 | l2@demo.com | Senior employee with more privileges |
| Department Head | hod@demo.com | Department approval authority |
| Finance L1 | finl1@demo.com | First-level finance approval |
| Finance L2 | finl2@demo.com | Second-level finance approval |
| CFO | cfo@demo.com | Final financial authority |
| CEO | ceo@demo.com | Executive oversight |
| Admin | admin@demo.com | System administration |
| Auditor | auditor@demo.com | Internal audit |
| External CA | ca@demo.com | External Chartered Accountant |

## API Documentation

### Authentication
- `POST /api/v1/auth/login/` - Login with email/password
- `POST /api/v1/auth/logout/` - Logout and blacklist token
- `POST /api/v1/auth/refresh/` - Refresh access token
- `GET /api/v1/auth/me/` - Get current user profile
- `GET /api/v1/auth/whoami/` - Get minimal user info for permissions

### Core Services
- File upload/download with SHA256 deduplication
- Hash-chained audit log
- State machine engine for business processes
- Role-based access control

## Development

### Code Style
- Backend: Black, isort, flake8
- Frontend: ESLint, Prettier
- Git: Conventional commits

### Testing
```bash
# Run backend tests
python manage.py test

# Run frontend tests
cd frontend
npm test
```

### Deployment
See `docs/deployment.md` for deployment instructions to production.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built for the FinanceAI Hackathon 2024
- Architecture inspired by enterprise finance systems
- AI integration with Anthropic Claude API