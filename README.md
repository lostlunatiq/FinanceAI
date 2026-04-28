# FinanceAI (Tijori AI)

**Team 14 - Data Dakait**

FinanceAI ek AI-powered finance automation platform hai jo finance teams ke manual workflows (jaise invoice processing, approval routing, anomaly detection, aur cash flow forecasting) ko automate karta hai.

## 🚀 Key Features (Kya ho raha hai isme)

1. **Role-Based Access Control (RBAC):** Isme alag-alag personas ke liye custom dashboards hain (jaise AP Clerks, Finance Managers, Finance Admins, aur Employees).
2. **CFO Command Center (Dashboard):** Ye ek high-level view deta hai total spend, pending approvals, budget utilization, aur future cash flow projections ka.
3. **Accounts Payable (AP) Hub:** Yahan saare invoices real-time track hote hain. Isme **AI-powered OCR** use hua hai jo automatically vendor name, amounts aur line items extract kar leta hai.
4. **AP Match & Fraud Control:** Ye automated three-way matching (Invoice, PO, Goods Receipt) aur fraud detection karta hai, jaise duplicate invoices pakadna, first-time vendors flag karna, aadi.
5. **AI Anomaly Detection:** Machine learning (Isolation Forest) ke madad se historical spend data me koi bhi ajeeb ya suspicious transactions ko pakadta hai.
6. **Cash Flow Forecasting:** Prophet library use karke future cash positions ko predict karta hai based on past patterns.

## 🛠️ Tech Stack (Kaunsi technologies use hui hain)

**Backend:**
- Django & Django REST Framework
- Celery & Redis (Background task processing)
- PostgreSQL (Database) & ClickHouse (Analytics)
- AI / ML: Scikit-learn, Prophet, OpenAI API, Spacy, Microsoft Presidio (PII masking ke liye)

**Frontend:**
- React.js

## 📁 Project Structure (Code kaise divided hai)

- `ai/`: AI agents aur unke pipelines (OCR, Anomaly Detection, Forecast).
- `apps/`: Django apps jo platform ke core features handle karti hain (`expenses`, `forecast`, `invoices`, `query`, `reports`).
- `config/`: Main Django project configurations.
- `frontend/` & `js/`: React based frontend code aur UI components.
- `docker/`: Docker containerization ke liye files.
- `docs/`: Project ki important documentation aur presentation scripts.
