# Phase 0 — Foundation (Days 1–3)

## Goal
Running Django + React stack with auth, RBAC, shared services, Docker Compose.

---

## Day 1: Project Scaffold + Auth

### Step 1.1 — Django Project Init
```bash
mkdir -p backend && cd backend
python -m venv venv && source venv/bin/activate
pip install django djangorestframework djangorestframework-simplejwt
pip install django-cors-headers django-filter drf-spectacular
pip install celery[redis] django-celery-beat redis
pip install psycopg2-binary boto3 pillow python-decouple
django-admin startproject config .
```

Create `apps/` directory structure:
```
apps/__init__.py
apps/accounts/     # User, auth, RBAC
apps/core/         # AuditLog, FileRef, state machine, masking
apps/approvals/    # Approval engine, SoD
apps/notifications/# In-app + email
```

### Step 1.2 — Settings
- `config/settings/base.py`: DB config (PostgreSQL), installed apps, middleware, REST framework config
- `config/settings/development.py`: DEBUG=True, CORS_ALLOW_ALL, CELERY_ALWAYS_EAGER=True (sync for dev)
- Environment variables via `python-decouple`:
  - `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `CLAUDE_API_KEY` (all optional with defaults)

### Step 1.3 — Docker Compose
Create `docker-compose.yml` with:
- `db`: postgres:16-alpine
- `redis`: redis:7-alpine
- `minio`: minio/minio with console on :9001
- `web`: Django app on :8000
- `celery_worker`: Celery worker
- `celery_beat`: Celery Beat scheduler
- Target: `docker compose up` runs everything

### Step 1.4 — User Model + Auth
```python
# apps/accounts/models.py
# Custom User with email login, 10+ roles, department FK
# See 03-data-models.md for full schema

# apps/accounts/views.py
# LoginView → returns JWT (access + refresh)
# LogoutView → blacklists refresh token
# MeView → current user profile
# RefreshView → new access token
```

### Step 1.5 — Seed Data Command
```python
# apps/accounts/management/commands/seed_demo.py
# Creates:
# - 3 departments: Engineering, Finance, Operations
# - 8 users (1 per role), password: hackathon2026
# - vendor@demo.com (VENDOR)
# - l1@demo.com (EMP_L1)
# - l2@demo.com (EMP_L2)
# - hod@demo.com (HOD)
# - finl1@demo.com (FIN_L1)
# - finl2@demo.com (FIN_L2)
# - cfo@demo.com (CFO)
# - admin@demo.com (ADMIN)
```

### Step 1.6 — Frontend Scaffold
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install @tanstack/react-query zustand react-router-dom axios
npx shadcn-ui@latest init
npm install lucide-react recharts
npm install react-hook-form @hookform/resolvers zod
```

Create: LoginPage, DashboardLayout, ProtectedRoute, RoleRoute, authStore.

**Exit**: Login as any seed user → see empty dashboard with correct role label.

---

## Day 2: Core Services

### Step 2.1 — AuditLog (Hash-Chained)
```python
# apps/core/models.py → AuditLog model (see 03-data-models.md)
# apps/core/audit.py

class AuditWriter:
    @staticmethod
    def log(action, target_type, target_id, actor, before=None, after=None, reason=''):
        # Get prev_hash from last entry
        prev = AuditLog.objects.order_by('-id').values_list('entry_hash', flat=True).first()
        prev_hash = prev or ''
        # Build payload
        payload = json.dumps({action, target_type, str(target_id), str(actor.id), ...}, sort_keys=True)
        entry_hash = hashlib.sha256((payload + prev_hash).encode()).hexdigest()
        AuditLog.objects.create(
            actor_id=actor.id, actor_role=actor.role,
            action=action, target_type=target_type, target_id=target_id,
            before=before, after=after, reason=reason,
            prev_hash=prev_hash, entry_hash=entry_hash,
            actor_ip=get_client_ip(request), ...
        )
```

DB trigger (migration):
```sql
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is append-only. Cannot UPDATE or DELETE.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON core_auditlog
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

### Step 2.2 — FileRef (Document Storage)
```python
# apps/core/file_service.py
class FileService:
    def upload(self, file, bucket, uploaded_by):
        sha256 = compute_sha256(file)
        existing = FileRef.objects.filter(sha256=sha256).first()
        if existing: return existing
        key = f"{bucket}/{uuid4()}/{file.name}"
        self._get_storage().save(key, file)
        return FileRef.objects.create(sha256=sha256, bucket=bucket, key=key, ...)

    def get_download_url(self, file_ref, ttl=900):
        # Returns presigned URL (15min TTL) or local path
        ...

    def _get_storage(self):
        # Returns MinIO client if configured, else Django default storage
        ...
```

### Step 2.3 — State Machine Engine
```python
# apps/core/state_machine.py
class StateMachineEngine:
    def transition_to(self, record, target_state, actor, reason='', metadata=None):
        machine = self._get_machine(record)
        transition = machine.get_transition(record.status, target_state)
        if not transition: raise IllegalTransition(...)
        for guard in transition.guards:
            if not guard(record, actor): raise GuardFailed(...)
        # Optimistic lock
        updated = type(record).objects.filter(
            id=record.id, version=record.version
        ).update(status=target_state, version=F('version') + 1)
        if updated == 0: raise ConcurrentModification(...)
        record.refresh_from_db()
        # Side effects
        for effect in transition.side_effects: effect(record, actor)
        # Audit (non-bypassable)
        AuditWriter.log(f'{record._meta.model_name}.{transition.action}', ...)
        # Post-commit hooks (notifications)
        for hook in transition.after_hooks: hook(record, actor)
        return record
```

### Step 2.4 — Approval Engine
```python
# apps/approvals/engine.py
# See 14-shared-capabilities.md for full API

# apps/approvals/sod.py
class SoDChecker:
    RULES = [
        no_self_approval,
        no_double_approval,
        no_vendor_as_approver,
        no_admin_financial_approval,
        no_filer_as_l1_validator,
        no_delegate_in_chain,
        no_cfo_own_expense,
        no_reviewer_own_findings,
    ]
    def check(self, chain, actor, step):
        for rule in self.RULES:
            violation = rule(chain, actor, step)
            if violation: raise SoDViolation(violation)
```

**Exit**: AuditLog writes hash-chained entries. FileService uploads/downloads. State Machine enforces transitions.

---

## Day 3: Masking, Notifications, Frontend Base

### Step 3.1 — Masking Middleware
```python
# services/masking.py
class MaskingService:
    def process(self, data, schema):
        if not settings.CLAUDE_API_KEY:
            raise AIServiceUnavailable("Claude API key not configured")
        token_map = {}
        masked = self._mask_fields(data, schema, token_map)
        response = self._call_claude(masked)
        unmasked = self._unmask_response(response, token_map)
        # token_map goes out of scope and is garbage collected
        return unmasked
```

### Step 3.2 — Notifications
```python
# apps/notifications/dispatcher.py
class NotificationDispatcher:
    def send(self, recipient, template_key, context, target_type='', target_id=None):
        # Always create in-app notification
        Notification.objects.create(
            recipient=recipient, template_key=template_key,
            title=render_title(template_key, context),
            body=render_body(template_key, context), ...
        )
        # Try email (graceful if no SMTP)
        try:
            if settings.EMAIL_CONFIGURED:
                send_notification_email.delay(...)  # Celery task
            else:
                logger.info(f"[EMAIL-SKIP] {template_key} → {recipient.email}")
        except Exception:
            logger.warning("Email send failed", exc_info=True)
```

### Step 3.3 — Frontend Dashboard Shell
- Login page with email + password → calls `/api/v1/auth/login/`
- JWT stored in memory (Zustand) + httpOnly cookie for refresh
- `DashboardLayout`: sidebar (role-based menu), header (user + notifications bell), breadcrumbs
- `ProtectedRoute`: redirects to login if no JWT
- `RoleRoute`: checks `user.role` against route config
- `NotificationBell`: polls `/api/v1/notifications/unread-count/` every 30s
- Empty dashboard page with placeholder KPI cards

### Step 3.4 — Makefile
```makefile
up:      docker compose up -d
down:    docker compose down
migrate: docker compose exec web python manage.py migrate
seed:    docker compose exec web python manage.py seed_demo
test:    docker compose exec web python manage.py test
logs:    docker compose logs -f web celery_worker
shell:   docker compose exec web python manage.py shell_plus
```

**Exit**: Full stack running. Login works. Dashboard shell visible. Notifications bell in header.
