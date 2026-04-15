# Shared Capabilities

These are the cross-cutting capabilities consumed by multiple modules. They are implemented as their own Django apps or service layers and called by the feature modules. Documenting them once avoids duplication.

| Capability | File | Used By |
|---|---|---|
| OCR Pipeline | `ocr.md` | Expense, Invoice |
| Anomaly Detection | `anomaly-detection.md` | Expense, AP, Invoice |
| Approval Engine | `approval-engine.md` | Expense, Invoice, Budget, Vendor, AP |
| Notifications | `notifications.md` | All modules |
| Audit Trail | `audit-trail.md` | All modules |
| Masking Middleware | `masking.md` | Anywhere data leaves 3SC bound for Claude |
| Document Storage | `document-storage.md` | All modules with attachments |
| NL Query Engine | `nl-query.md` | Reporting, Audit, CFO dashboard |
| AI Summaries | `ai-summaries.md` | Reporting, Forecast, CFO dashboard |
| D365 Integration | `d365-integration.md` | Expense, Invoice, Budget, Vendor, AP, AR |
| RBAC & SoD | `rbac-sod.md` | All modules |
| State Machine Framework | `state-machine.md` | Expense, Invoice, Budget, Vendor, AP |
