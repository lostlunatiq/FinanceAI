# 🧪 FinanceAI QA Protocol Pack

> Generated 2026-05-05 by QA Cartographer for branch `quick-wins-optimization`.
> Format: Obsidian-flavored Markdown with `- [ ]` interactive checkboxes.

## How to use

1. Open this folder as an Obsidian vault (or any Markdown viewer that renders task lists).
2. Pick a feature file — each one is a self-contained protocol.
3. Set up the **Prerequisites & State Setup** before walking the checklist.
4. Tick boxes only when each assertion is **verified**, not just "looks fine".

## Demo credentials

All passwords: `demo1234`. Set via `seed_demo` management command.

| Username | Grade | Role |
|---|---|---|
| `vendor1`, `vendor2` | 0 | Vendor (portal) |
| `employee1` | 1 | Employee |
| `l1_approver` | 1 | L1 Approver |
| `hod` | 2 | Department Head |
| `fin_manager` | 3 | Finance Manager |
| `fin_admin` | 4 | Finance Admin |
| `cfo` | 5 (superuser) | CFO |

## Environment toggles

```bash
USE_SQLITE=true                              # use SQLite, dev settings
DJANGO_SETTINGS_MODULE=config.settings.dev
CELERY_TASK_ALWAYS_EAGER=true                # tasks run synchronously
OPENROUTER_API_KEY=<real or "sk-or-placeholder">  # placeholder ⇒ mock LLM
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_REDIRECT_TO=qa@example.com             # optional: catch-all redirect
D365_MOCK_MODE=true                          # disables real D365 calls
```

## Feature index

| # | Feature | File | Stack touched |
|---|---|---|---|
| 01 | Authentication & Session | [01-auth.md](01-auth.md) | DRF → JWT → PostgreSQL → AuditLog |
| 02 | File Upload + OCR Sync | [02-file-upload-ocr.md](02-file-upload-ocr.md) | DRF → media/ → ocr_pipeline → OpenRouter (vision) |
| 03 | Expense Submission + Approval FSM | [03-expense-fsm.md](03-expense-fsm.md) | DRF → services.transition_expense → Celery (D365 export) |
| 04 | Anomaly Detection | [04-anomaly.md](04-anomaly.md) | DRF → anomaly_pipeline → Presidio → OpenRouter (text) |
| 05 | Vendor Portal + Vendor CRUD | [05-vendor.md](05-vendor.md) | DRF → vendor_views → Expense FSM |
| 06 | Budget Management + Cashflow | [06-budget-cashflow.md](06-budget-cashflow.md) | DRF → budget_views → OpenRouter (text) |
| 07 | Analytics Suite (14 endpoints) | [07-analytics.md](07-analytics.md) | DRF → analytics_views → Expense aggregations |
| 08 | AI Reports (10-Q / Monthly / Annual / Command Center) | [08-ai-reports.md](08-ai-reports.md) | DRF → MonthlyFinancialSummary → OpenRouter (text) |
| 09 | NL Query + Chat Sessions | [09-nl-query.md](09-nl-query.md) | DRF → ChatSession → AICopilotLog → OpenRouter |
| 10 | Notifications | [10-notifications.md](10-notifications.md) | DRF → dispatcher → Celery (email) → SMTP/Teams/Push |
| 11 | AI Feedback Loop | [11-ai-feedback.md](11-ai-feedback.md) | DRF → AIFeedback → OCR/anomaly prompt injection |
| 12 | Audit Log + RBAC | [12-audit-rbac.md](12-audit-rbac.md) | DRF → AuditLog tiered visibility |
| 13 | User & IAM Management | [13-iam.md](13-iam.md) | DRF → User/Department/Group/GroupProfile |
| 14 | D365 Export | [14-d365.md](14-d365.md) | Celery → exports/ JSON (real D365 stub blocked) |

## Cross-feature stress sweep

After running individual checklists, run [99-cross-cutting.md](99-cross-cutting.md) — multi-feature concurrency, replication-lag, and idempotency tests.

## Known caveats (verify before testing)

- **`apps.d365` is missing.** Triggering `push_invoice_to_d365` from non-mock mode will `ImportError`. Keep `D365_MOCK_MODE=true` in QA.
- **Approve view contains a triple-looped while-block** (employee_views.py ~L170–282) — confirm a single approve click does not double-advance.
- **No HOD scoping** on most analytics endpoints (only Budget Health + Dept Variance + Budget CRUD). Document any data leakage you observe.
- **OpenRouter mock mode** returns a fixed demo invoice; checklist marks LLM-dependent assertions accordingly.
