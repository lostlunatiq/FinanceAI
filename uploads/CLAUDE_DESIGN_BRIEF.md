# FinanceAI — Complete UI Redesign Brief
### Input for Claude Design / Stitch

---

## What is FinanceAI?

FinanceAI is an **enterprise-grade, AI-native finance automation platform** for mid-to-large organisations. It covers the full accounts payable and accounts receivable lifecycle — from vendor onboarding and invoice submission, through multi-level approval workflows, to CFO sign-off and payment — and the reverse flow of raising outgoing invoices to customers and tracking collections. It layers AI on top: anomaly detection, fraud control, smart expense categorisation, NL-query copilot, and predictive cash flow.

**User roles (each sees a different primary screen):**
- **Vendor** → submits invoices, tracks payment status. **Cannot see** department assignments, budget impact, or internal expense categories.
- **Employee / AP Clerk** → submits internal expenses (with AI category suggestion), reviews the payable queue
- **L1 Approver (first approver)** → reviews and approves/rejects; **can assign/update department** on any expense at this stage
- **HOD / Finance Manager / CFO** → subsequent approval stages; see department + budget impact read-only
- **Finance Admin** → full vendor registry, IAM (users / groups / policies), payment initiation, audit, AR management
- **System** → automated anomaly engine, budgetary enforcement, smart categorisation AI

---

## Design System to Apply

### Palette

| Token | Value | Usage |
|---|---|---|
| `--orange` | `#E8783B` | Primary CTA, active states, accents |
| `--orange-hot` | `#FF6B35` | Gradient endpoint, hover glow |
| `--slate-950` | `#020617` | Sidebar background |
| `--slate-900` | `#0F172A` | Dark panels, hero areas |
| `--slate-800` | `#1E293B` | Sidebar hover, secondary dark |
| `--slate-600` | `#475569` | Body text on dark |
| `--slate-400` | `#94A3B8` | Muted text, borders on dark |
| `--warm-white` | `#FAFAF8` | Page canvas background |
| `--card-white` | `#FFFFFF` | Card surfaces |
| `--card-subtle` | `#F8F7F5` | Alternate card / table row |
| `--green` | `#10B981` | Success, paid status |
| `--amber` | `#F59E0B` | Warning, pending |
| `--red` | `#EF4444` | Error, rejection, high anomaly |
| `--purple` | `#8B5CF6` | AI/ML-derived elements |

### Typography

- **Display / Headlines:** `Bricolage Grotesque` — weight 800, tracking -1.5px
- **UI Labels & Body:** `Plus Jakarta Sans` — weight 400–600
- **Numbers / KPIs:** `Bricolage Grotesque` weight 800, very large (48–72px)
- **Code / IDs:** `JetBrains Mono`

### Layout Shell (applies to all authenticated screens)

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (240px, slate-950 bg)  │  MAIN CANVAS      │
│  ─────────────────────────────  │  ────────────────  │
│  [Logo + wordmark]              │  [Sticky header]   │
│                                 │  [Page content]    │
│  Nav items — icon + label       │                    │
│  Active: orange left-border     │                    │
│  + orange text + bg-slate-800   │                    │
│                                 │                    │
│  Bottom: user avatar + role     │                    │
└─────────────────────────────────────────────────────┘
```

**Sidebar nav items (in order):**
1. Dashboard / Command Center
2. Accounts Payable Hub
3. Accounts Receivable *(new)*
4. Expense Management
5. Budget Management
6. Budgetary Guardrails
7. Anomaly Detection
8. Vendor Management
9. IAM — Identity & Access *(Finance Admin only)*
10. Audit Log
11. Settings

**Role-based sidebar visibility:**
- Vendor sees only: Vendor Portal (no sidebar — standalone layout)
- Employee sees: Dashboard, Expense Management
- L1 / HOD / Fin Manager / CFO sees: Dashboard, AP Hub, Expense Management, Budget Management, Guardrails, Anomaly Detection, Audit Log
- Finance Admin sees: all items including IAM and Accounts Receivable

**Sticky top header:** breadcrumb left, notification bell + user avatar right. Height 64px. White bg, 1px bottom border `#E2E8F0`.

### Component Patterns

**KPI Card:**
- White surface, 16px radius, subtle shadow (`0 2px 12px rgba(0,0,0,0.06)`)
- Oversized number (48px+, Bricolage Grotesque 800)
- Small label above in uppercase, 10px, slate-400, 0.08em tracking
- Delta badge: green pill for positive, red for negative, amber for neutral
- Bottom sparkline (thin SVG line, orange color)

**Data Table:**
- Header: `#F8F7F5` bg, uppercase 10px labels, slate-500
- Rows: white, 1px `#F1F0EE` dividers, 52px row height
- Hover: `#FFF8F5` (warm orange tint)
- Status badges: pill-shaped, solid bg, white text

**Status Badge Colors:**
- `PENDING` / `PENDING_L1` / `PENDING_L2` → amber bg `#FEF3C7`, text `#92400E`
- `APPROVED` / `PAID` → green bg `#D1FAE5`, text `#065F46`
- `REJECTED` → red bg `#FEE2E2`, text `#991B1B`
- `QUERY_RAISED` → purple bg `#EDE9FE`, text `#5B21B6`
- `ANOMALY` / `FRAUD` → red, pulsing dot indicator

**CTA Button:**
- Primary: `linear-gradient(135deg, #E8783B, #FF6B35)`, white text, shimmer animation on hover
- Secondary: white bg, 1.5px `#E2E8F0` border, slate-800 text, hover bg `#FFF8F5`
- Destructive: `#FEE2E2` bg, `#DC2626` text

**AI/Copilot elements:**
- Gradient border: `border-image: linear-gradient(135deg, #E8783B, #8B5CF6) 1`
- Purple + orange gradient label "AI"
- Pulsing dot (orange) for live/active AI analysis

---

## Screen 1 — Login Page

**Route:** `/frontend/financeai_login/`
**Audience:** All users (pre-auth)

### Layout: Full-width split, 52% left / 48% right

**LEFT PANEL — Brand Story (slate-900 background):**
- Animated dot-grid background (small orange dots, 32px grid, slowly drifting)
- Two soft radial glow blobs in orange, top-left and bottom-right
- Abstract geometric SVG: concentric circles with cross-hairs (orange, low opacity), floating rotated squares, diagonal accent lines, scattered dots
- Top-left: FinanceAI wordmark (Bricolage Grotesque 800, white) + small orange glowing dot
- Centre: Large headline — `"The Intelligent Financial OS for Enterprise."` with "Intelligent" in orange gradient text
- Subheading: slate-400, 16px, max-width 360px
- 3 stat chips (glass morphism, subtle white border):
  - `94%` · Faster Cycles
  - `$2.4M` · Leakage Caught
  - `12×` · ROI Average
- Bottom: Testimonial card (frosted glass, white 4% bg)
  - Opening quote mark in orange
  - Quote text in white 75% opacity
  - Avatar (orange gradient initials circle) + Name + Role

**RIGHT PANEL — Login Form (warm-white background):**
- Orange eyebrow label: `ENTERPRISE ACCESS`
- H1: `"Welcome back."` (Bricolage Grotesque 800, slate-900, 32px)
- Sub: `"Sign in to your financial command center."` (slate-500)
- Microsoft SSO button: slate-900 bg, white text, Microsoft logo SVG, rounded-12, hover lifts
- Divider: `── or ──`
- Email field: icon left (mail), warm white bg, orange focus ring
- Password field: icon left (lock), eye toggle right, orange focus ring
- `Forgot password?` link in orange, right-aligned above field
- CTA: full-width orange gradient button with shimmer — `"Sign In to Dashboard"`
- Footer: copyright left, Privacy / Security links right (10px, slate-400)

---

## Screen 2 — CFO Command Center (Dashboard)

**Route:** `/frontend/cfo_command_center/`
**Audience:** CFO role

### Page header
- H1: `"Intelligence Command"` (Bricolage Grotesque 800, 36px, slate-900)
- Sub: today's date + `"— Operational Overview"`
- Right: `"Ask Your Data"` button — orange gradient, pill-shaped, with sparkle icon

### CFO Approval Queue (shown when pending items exist)
- Section header with gavel icon + `"Pending CFO Approvals"` + `"View All"` link
- Cards: white, 12px radius, subtle border. Each shows invoice number, vendor name, amount (large, orange), date. Approve (orange) + Reject (red-tinted) buttons.

### KPI Row — 3 cards side by side
1. **Total Outstanding** — large number, `Outstanding` label, neutral delta
2. **Pending Approvals** — amber delta badge
3. **Anomalies Detected** — red delta badge with pulsing dot

### Main 2-column bento (65% / 35%)

**Left — 90-Day Cash Flow Chart:**
- White card, full height
- Title: `"90-Day Cash Flow Projection"` + subtitle about confidence bands
- Legend: orange dot = Projected, orange-20% dot = Confidence Band
- SVG area chart:
  - X-axis: 6 date labels, light grid lines
  - Y-axis: value labels on left
  - Confidence band: orange fill, 15% opacity
  - Projected line: thick orange stroke, smooth cubic bezier, subtle glow
  - Grid lines: `#F1F0EE`, horizontal only
- Floating glass overlay: `"Critical Peak"` insight — white glass card, orange headline, positioned at chart peak

**Right — Risk Watch Feed:**
- Header: `"Risk Watch"` + `"PRIORITISED FEED"` label
- Scrollable list, max-height 580px
- Each card: white bg, left-border 4px (red=high, amber=medium, slate=low)
  - Anomaly score badge (colored pill)
  - Timestamp (slate-400)
  - Bold title + description
  - `Explain` (orange text btn) + `Dismiss` (slate text btn)
- Bottom: dashed-border `"View Audit Log"` button

### Bottom Bento Row (4 columns)

**Col 1–2: Treasury Health Index**
- Circular SVG progress ring (85%, orange stroke on slate-100 track)
- Centre: large `85%` + `"GLOBAL HEALTH"` label
- Right: Liquidity = EXCELLENT (green), Solvency = STABLE (amber)

**Col 3: Generate 10-Q (AI Action Card)**
- Hover: orange gradient bg, white text
- Sparkle icon (orange), `"Generate 10-Q"` title, AI subtitle

**Col 4: Audit Sweep (AI Action Card)**
- Hover: orange gradient bg
- Shield icon, `"Audit Sweep"` title

### Floating AI Copilot FAB (bottom-right, fixed)
- Orange gradient circle button, sparkle icon, white
- Glow shadow: `0 0 24px rgba(232,120,59,0.5)`
- Opens slide-in panel from right: `"CFO Copilot"` with chat interface

---

## Screen 3 — Vendor Portal

**Route:** `/frontend/vendor_portal/`
**Audience:** Vendor (external)

### Header
- Breadcrumb: `Vendor Portal → [Vendor Name]`
- Right: `"Submit Invoice"` CTA — orange gradient, upload icon

### Stats Row — 4 equal cards
1. **Pending Payouts** — large number, amber delta
2. **Total Submitted** — large number
3. **In Progress** — large number, orange color
4. **Paid** — large number, green color

### Main 2-column grid (7/12 + 5/12)

**Left — My Invoices table:**
- Card with `"My Invoices"` header
- Filter pills: All (active=orange), In Progress, Query, Paid, Rejected
- Table columns: Invoice #, Amount, Date, Status, Actions
- Status badges per color system above
- Empty state: illustration placeholder + `"No invoices yet. Submit your first invoice."`

**Right — Invoice Detail Panel:**
- Shows when an invoice row is clicked
- Invoice number as card title
- Timeline/stepper showing approval stages:
  - Each step: icon circle (filled=done in green, current=orange pulse, future=slate)
  - Step labels: Submitted → L1 Review → HOD → Finance Manager → CFO → Payment
- File attachment section
- Query thread (if QUERY_RAISED status)

### Submit Invoice Modal
- Slide-up sheet (mobile) / centered modal (desktop)
- Fields: Invoice #, Vendor Reference, Amount, Invoice Date, Upload PDF
- AI extraction notice: purple gradient pill — `"AI will auto-extract line items"`
- CTA: orange gradient `"Submit for Approval"`

### Intentional Omissions (Vendor Portal — strict data visibility rules)
The following are **never shown** to the vendor at any point:
- Department assignment
- Expense category
- Budget impact or budget utilisation
- Internal approval notes (only final approval/rejection outcome is shown)
- Any other vendor's data

---

## Screen 4 — Accounts Payable Hub

**Route:** `/frontend/accounts_payable_hub/`
**Audience:** AP Clerk, Finance Manager, L1/HOD/CFO approvers

### Header
- H1: `"Accounts Payable Hub"`
- Right: search bar + filter dropdown + `"Export"` secondary button

### Stats Row — 3 cards
1. **Total Outstanding** — large ₹ number, amber
2. **Pending Approval** — count, orange pulsing dot
3. **Processing** — count, green

### Authority Limits Info Panel
- Collapsed expandable card
- Title: `"Finance Payment Authority Limits"`
- Table: Role → Max Amount → Current Utilisation %

### Main Invoice Queue Table
- Columns: Invoice # | Vendor | Amount | Date | Status | Assigned To | Actions
- Status badges full-color system
- Actions: `Approve` (green pill) + `Reject` (red pill) + `Query` (purple pill)
- Bulk action bar appears when rows are selected: orange bg, white text, count badge

### Approve / Reject / Query Modals

**Approve Modal (L1 only — first approver sees department assignment):**
- Green header with checkmark icon + `"Approve Invoice"`
- **Department Assignment Panel** (orange-bordered section, only visible to L1):
  - Label: `"CHARGE TO DEPARTMENT"` (orange, uppercase, 10px)
  - Dropdown: list of all departments with cost centre codes (e.g. `Engineering — CC-001`)
  - Sub-label: `"This links the expense to the department's budget. Not visible to vendor."`
  - AI suggestion chip: purple pill — `"AI suggests: Engineering (87% confidence)"` with Accept button
- **Expense Category** (orange-bordered section, L1 and above only):
  - Dropdown: smart category list (Travel, Software, Infrastructure, Marketing, HR, Legal, etc.)
  - AI pre-filled from smart categorisation — shows confidence %, editable
  - Budget Impact Preview: mini card showing `"This will consume ₹X of ₹Y remaining in [Department] [Category] budget"` — green if headroom, amber if < 20% remaining, red if over budget
- Optional approval notes field
- `"Confirm Approval"` CTA (orange gradient)

**Approve Modal (HOD / Finance Manager / CFO — department already set, read-only):**
- Same layout but Department and Category fields are **read-only badges**, not dropdowns
- Budget Impact Preview still shown
- Optional approval notes

**Reject Modal:**
- Red header, required reason textarea (min 10 chars counter), `"Confirm Rejection"`

**Query Modal:**
- Purple header, question textarea, `"Send Query to Vendor"`
- Note: query is sent to vendor — department/category info is NOT included in the query message

---

## Screen 5 — Expense Management

**Route:** `/frontend/expense_management/`
**Audience:** Employees, AP Hub

### Header
- H1: `"Internal Expenses"`
- Sub: `"Manage employee reimbursements and operational expenditures."`
- Right: `"File Expense"` CTA

### Stat Cards Row
- **Unapproved Spend** — `₹12,450`, red delta
- **Approved This Month** — green
- **Reimbursed** — green

### Expenses Table
- Columns: Report ID | Employee | Amount | Date | Category | Department | Status | Actions
- **Category column**: shows AI-suggested category as a purple pill with `AI` badge, or manually set category as a slate pill
- **Department column**: shows `—` until L1 approves and assigns it; then shows department name (slate badge). **This column is hidden entirely on the Vendor Portal.**
- Same status badge system
- Clicking a row expands inline detail: line items, receipt thumbnails, approval notes, budget impact (internal users only)

### File Expense Side Panel (slide-in from right)
- Title: `"File Expense / Bill"`
- Upload zone: dashed border, drag-and-drop, `"Upload invoice for AI extraction"`
- AI label: purple gradient pill — `"AI Powered"`

**Smart Category section (orange-bordered panel):**
- Label: `"EXPENSE CATEGORY"` (uppercase, 10px, orange)
- After file upload: AI analyses description/line items and pre-fills category with confidence %
- Shows as: `"AI suggests: Travel & Accommodation — 91% confidence"` with purple AI badge
- User can accept or change via dropdown
- Categories: Travel, Software & Licences, Infrastructure, Marketing & Events, HR & Recruitment, Legal & Compliance, Office Supplies, Professional Services, Utilities, Other
- **Note shown:** `"Category helps route this to the correct budget. Your approver may update this."`

**Other fields:** Amount, Date, Description, Attach Receipt
- CTA: orange gradient `"Submit for Approval"`

### Budget Impact Preview (internal users only — not shown to Vendor)
- Appears inline below Category once category + amount are filled
- Mini card: `"Budget Impact"` heading
- Shows: `[Category] budget for [inferred dept] — ₹X remaining of ₹Y total`
- Green if > 50% remaining, amber if 20–50%, red if < 20%
- If no budget found: `"No budget configured for this category — Finance will assign on approval"`

---

## Screen 6 — Budget Management

**Route:** `/frontend/budget_management/`
**Audience:** Finance Manager, Finance Admin

### Header
- Breadcrumb: `Budgetary Controls → Budget Management`
- H1: `"Budget Management"`
- Right: `"+ Create Budget"` orange CTA

### Stats Row — 4 cards
1. **Total Budget** — large ₹ number
2. **Total Spent** — orange color
3. **Remaining** — green color
4. **Active Budgets** — count

### Budget Alert Banner (conditional, shown when over threshold)
- Red bg, warning icon, `"Budget Alert"` bold title, description text
- `"View Details"` link

### Budget Cards Grid (2–3 columns)
Each card:
- Department name (Bricolage Grotesque, large)
- Progress bar: thick (12px), rounded, orange fill transitioning to red as it approaches 100%
- `₹X.XM / ₹X.XM` spent/total labels
- `XX%` utilisation badge (green < 70, amber 70–90, red > 90)
- Threshold warning indicator if near limit
- Edit / Delete icon buttons (top-right)

### Create/Edit Budget Modal
- Fields: Department, Total Amount, Warning Threshold (%), Critical Threshold (%), Period
- Threshold visual: mini dual-knob slider showing where warning and critical fall on 0–100%
- CTA: `"Save Budget"`

---

## Screen 7 — Budgetary Guardrails

**Route:** `/frontend/budgetary_guardrails/`
**Audience:** Finance Admin, CFO

### Header
- H1: `"Budgetary Guardrails"`
- Sub: `"Q3 Fiscal Year 2024"` + `"Updated 4 minutes ago"` (orange pulsing dot)

### Active Alert Banner
- Full-width red-tinted card: `"Booking Suspension Active"` — Engineering at 100%
- `"Resolve"` button

### Two-column layout

**Left — Departmental Utilisation:**
- Title: `"Departmental Utilisation"`
- Horizontal stacked bar chart for each department:
  - Engineering: `$2.4M / $2.4M` — red (100%)
  - Marketing: `$1.1M / $1.3M` — amber (85%)
  - Operations: `$650K / $1.5M` — green (43%)
  - HR: `$544K / $800K` — amber (68%)
- Each bar: department label left, amount right, colored fill

**Right — Enforcement Logs:**
- Title: `"Enforcement Logs"`
- Feed of blocked transactions:
  - Red dot + timestamp
  - `"System blocked $12,400 transaction for Engineering. Cap exceeded."`
  - View details link

---

## Screen 8 — Anomaly Detection (AI Fraud Engine)

**Route:** `/frontend/anomaly_detection/`
**Audience:** Finance Manager, Finance Admin, CFO

### Header
- Breadcrumb: `Anomaly Engine`
- H1: `"AI Fraud & Anomaly Engine"` — with small AI badge (purple gradient)
- Sub: `"Continuous monitoring for duplicate invoices, inflated values, and abnormal velocity."`
- Right: `"Run Full Scan"` orange CTA + pulsing green `"Live"` indicator

### Alert Banner (when high-probability flags exist)
- Red-tinted full-width card
- `"High Probability Flags Detected"` in red bold
- `"3 Invoices match known structural signatures of double-billing logic. 1 Expense matches off-shift pattern."`
- `"Review All"` CTA

### Anomaly Stats Row — 4 mini cards
1. **Total Flagged** — count, red
2. **High Confidence (>80%)** — red
3. **Pending Review** — amber
4. **Resolved Today** — green

### Anomaly Table
- Columns: Confidence Score | Entity Ref | Anomaly Details | AI Logic | Action
- Confidence: circular badge (red > 80, amber 50–80, slate < 50) with % inside
- AI Logic: purple-tinted cell with small `AI` badge, plain-language explanation
- Actions: `Investigate` (orange) + `Mark Safe` (green) + `Escalate` (red)
- Rows with > 80 confidence: subtle red-tinted row background

### Anomaly Detail Side Panel (slide-in)
- Shows when `Investigate` is clicked
- AI confidence breakdown chart (mini horizontal bars per signal)
- Similar historical cases
- `"Explain this anomaly"` → opens AI Copilot with pre-filled query

---

## Screen 9 — Admin Vendor Management

**Route:** `/frontend/admin_vendor_management/`
**Audience:** Finance Admin

### Header
- Breadcrumb: `Vendor Registry`
- H1: `"Vendor Management"`
- Right: `"+ Add Vendor"` orange CTA

### Stats Row — 4 cards
1. **Total Vendors**
2. **Active** — green
3. **Pending Approval** — amber
4. **Suspended** — red

### Vendors Table
- Columns: Vendor Name | GST / PAN | Category | Status | Outstanding | Actions
- Status badges: Active (green), Pending (amber), Suspended (red), Blacklisted (dark red)
- Actions: View | Activate | Suspend | Blacklist (each appropriately colored)
- Search bar top-left of table
- Filter by status dropdown

### Add / Edit Vendor Modal
- Multi-step form (3 steps):
  1. Basic Info: Name, GST, PAN, Category, Contact
  2. Bank Details: Account Number (masked), IFSC, Bank Name
  3. Documents: Upload GST cert, PAN, bank letter
- Step indicator: orange active dot, slate future dots
- CTA: `"Save Vendor"` or `"Send Activation Email"`

### Vendor Detail Drawer (slide-in from right)
- Full vendor profile
- Tabs: Overview | Invoices | Audit Trail
- Outstanding amount, payment history chart

---

## Screen 10 — Audit Log

**Route:** `/frontend/audit_log/`
**Audience:** Finance Admin, CFO

### Header
- H1: `"Audit Registry"`
- Sub: `"A permanent, immutable record of every transaction and system event within FinanceAI."`
- Right: date-range picker + `"Export CSV"` secondary button

### Summary Stats (mini row)
- Event counts by category: Invoice Actions | Approvals | Vendor Changes | Login Events | System Actions

### Filters Bar
- Search input (full-text)
- Filter chips: All | Invoice | Approval | Vendor | User | System
- Active chip: orange bg, white text

### Audit Timeline / Table
- Timeline view (default): left vertical orange line, each entry is a dot on the line
- Each entry card:
  - Action type badge (colored per category)
  - `"[User] [action] [entity]"` — bold action verb, entity in orange monospace
  - Timestamp (slate-400)
  - `"View Details"` expand button
- Expanded: full JSON-like detail, masked sensitive fields

### Table view toggle
- Switch between Timeline and Table view (segmented control in orange)

---

## Screen 11 — AP Match & Fraud Control (Invoice Detail)

**Route:** `/frontend/ap_match_fraud_control_1/`
**Audience:** AP Hub, Finance Manager

### Header
- H1: `"Invoice #INV-2024-082"`
- Sub: `"Vendor: TechLogistics Solutions Global"`
- Status badge (large) + approval stage indicator

### 3-Way Match Panel
- 3 equal columns side by side:
  1. **Purchase Order** — PO number, line items table, total
  2. **Goods Receipt** — GRN number, received items, date
  3. **Vendor Invoice** — invoice lines, total
- Each column: white card, header in respective color (blue=PO, green=GRN, orange=Invoice)
- Match indicators between columns: green checkmark (matched), red X (mismatch), amber tilde (partial)

### Line Item Audit Intelligence (AI section)
- Purple-gradient header with AI badge
- Table: each line item with AI-derived match confidence %, mismatch reason (plain language)
- Visual diff highlighting: matched text green, mismatched text red underline

### Fraud Control Center
- Risk score gauge: large semi-circle, 0–100, orange needle
- Risk factors list: each with severity dot + description
- Historical vendor grayscale image (becomes color on hover)
- `"Flag for Review"` (red) + `"Clear Invoice"` (green) + `"Escalate to CFO"` (orange) CTAs

---

## Screen 12 — Settings

**Route:** `/frontend/settings/`
**Audience:** All users (own profile) + Admin (system settings)

### Header
- H1: `"Account Architecture"`
- Sub: `"Manage your institutional identity, access controls, and intelligence flows."`

### Two-column layout (4/12 + 8/12)

**Left — Profile Card:**
- Large avatar (120px, orange gradient bg with initials if no photo)
- Name (Bricolage Grotesque 800, 24px)
- Role badge (orange pill)
- `"Edit Profile"` secondary button

- **Notification Preferences** (toggle cards):
  - Email Summaries — `"Daily automated ledger digest"` — toggle
  - System Alerts — `"Critical transaction anomalies"` — toggle
  - Mobile Push — `"Real-time biometrics auth"` — toggle
  - Each toggle: orange when on

**Right — Settings Sections (tabbed):**
- Tabs: Security | Integrations | Appearance | Permissions (admin only)

  **Security tab:**
  - Change Password section
  - Active Sessions list (device, location, last seen, `Revoke` link)
  - 2FA toggle

  **Integrations tab:**
  - D365 integration card: status badge (Live/Mock) + toggle
  - Email server config
  - Webhook endpoints

  **Appearance tab:**
  - Theme selector: Light / Dark / System (card-based selector, selected = orange border)
  - Density: Comfortable / Compact

---

---

## Screen 13 — IAM: Identity & Access Management

**Route:** `/frontend/iam/`
**Audience:** Finance Admin only
**Concept:** Azure AD / Entra-style portal — three pillars: Users, Groups, Policies. Clean tabbed interface, data-dense but well-structured.

### Header
- H1: `"Identity & Access Management"` with a shield-key icon
- Sub: `"Manage who can do what inside FinanceAI. Users · Groups · Policies."`
- Right: `"+ Invite User"` orange CTA

### Top Navigation Tabs (segmented control, full-width)
Three tabs — **Users** | **Groups** | **Policies**. Active tab: orange underline + bold text.

---

### Tab 1 — Users

**Stats Row — 4 cards:**
1. **Total Users** — count
2. **Active** — green
3. **Invited / Pending** — amber (user hasn't accepted invite yet)
4. **Suspended** — red

**Users Table:**
- Columns: Avatar + Name | Email | Role | Department | Groups | Last Login | Status | Actions
- Role badge: colored pill per role (`CFO` = dark slate, `Finance Admin` = orange, `Finance Manager` = blue, `Dept Head` = purple, `Employee` = green, `Vendor` = amber)
- Status: Active (green dot), Pending (amber dot), Suspended (red dot)
- Groups: shows up to 2 group pills + `"+N more"` overflow badge
- Actions: `Edit` (pencil icon) | `Suspend` | `Reset Password` (via kebab menu)
- Search bar + Role filter dropdown + Status filter

**User Detail Drawer (slide-in from right):**
- Avatar circle (orange gradient), Name, Email, Role badge
- Tabs: **Profile** | **Permissions** | **Activity**
  - Profile: department, manager, employee grade, created date, last login
  - Permissions: list of all policies this user inherits (via group) + any direct overrides
    - Each permission row: resource icon, permission name, `"via [Group Name]"` or `"Direct"` badge
  - Activity: last 20 audit log entries for this user (action, entity, timestamp)
- Bottom actions: `"Edit User"` | `"Suspend"` | `"Reset Password"`

**Invite User Modal:**
- Fields: Full Name, Corporate Email, Role (dropdown), Department (dropdown), Groups (multi-select)
- Preview panel: shows what screens/actions this user will have access to based on role + groups
- CTA: `"Send Invite Email"`

---

### Tab 2 — Groups

**Concept:** Groups are named collections of users that share the same policy assignments. Like Azure AD security groups.

**Stats Row:**
1. **Total Groups** — count
2. **Members across all groups** — count
3. **Policies assigned** — count

**Groups Grid (card layout, 3 columns):**
Each group card:
- Group name (Bricolage Grotesque, 18px)
- Description (slate-400, 13px)
- Member count: `"12 members"` with avatar stack (up to 4 small circles)
- Policy count badge: `"3 policies"` (purple pill)
- `"View"` + `"Edit"` buttons
- Hover: card lifts with orange left-border

**Group Detail Page (full page, not drawer):**
- Header: Group name + description + `"Edit Group"` + `"Delete Group"`
- Two-column:
  - Left: **Members** — table of users in this group (Name, Role, Status) + `"Add Members"` button
  - Right: **Assigned Policies** — list of policies with permission summary + `"Assign Policy"` button

**Create/Edit Group Modal:**
- Fields: Group Name, Description
- Members: searchable multi-select user picker
- CTA: `"Save Group"`

---

### Tab 3 — Policies

**Concept:** Policies define what a user/group can do — resource-level permissions. Like AWS IAM policies but simplified for finance ops.

**Stats Row:**
1. **Total Policies** — count
2. **Active** — green
3. **Assigned to Groups** — count

**Policies Table:**
- Columns: Policy Name | Description | Permissions (count) | Assigned Groups | Created By | Actions
- `Permissions` cell: shows `"8 permissions"` as an orange count badge — click to expand
- Actions: `Edit` | `Clone` | `Delete`

**Policy Detail Drawer:**
- Policy name (large, Bricolage Grotesque)
- Description
- **Permissions Matrix** (the core UI — this is the most important part):
  - Left column: Resource categories (Invoices, Expenses, Budgets, Vendors, Reports, IAM, Settings)
  - Top row: Actions (View, Create, Approve, Reject, Export, Admin)
  - Grid cells: green checkmark (allowed), red X (denied), dash (not set = inherits default)
  - This is a visual checkbox grid — very clean, like a spreadsheet
- Assigned groups list

**Create/Edit Policy Modal:**
- Name + Description fields
- Same permissions matrix as the detail view but editable (checkboxes in cells)
- CTA: `"Save Policy"`

**Pre-built system policies (shown with lock icon, not editable):**
- `Vendor Self-Service` — view own invoices, submit invoices
- `AP Clerk` — view all invoices, query vendor
- `Approver L1` — approve/reject + assign department
- `Finance Manager` — approve + view budgets + reports
- `CFO` — all approve actions + CFO dashboard
- `Finance Admin` — full access to IAM + vendor management + payments

---

## Screen 14 — Accounts Receivable: Dashboard

**Route:** `/frontend/accounts_receivable/`
**Audience:** Finance Admin, Finance Manager, CFO

### Header
- H1: `"Accounts Receivable"` with a `→` arrow icon (money flowing in)
- Sub: `"Track outgoing invoices, customer payments, and collections."`
- Right: `"+ Raise Invoice"` orange CTA + `"AR Aging Report"` secondary button

### KPI Row — 4 cards
1. **Total Outstanding AR** — large ₹ number, orange
2. **Overdue (> 30 days)** — red, pulsing dot
3. **Collected This Month** — green, up-arrow delta
4. **Average Days to Pay** — amber, number + `"Days"` label

### AR Aging Chart (full-width card)
- Title: `"Receivables Aging"` + `"by invoice age bucket"`
- Horizontal stacked bar chart:
  - Y-axis: top 8 customers by outstanding amount
  - X-axis: ₹ amounts
  - Each bar split into buckets: `0–30 days` (green), `31–60 days` (amber), `61–90 days` (orange), `>90 days` (red)
- Legend at top
- Clicking a customer row opens Customer Detail Drawer

### Main Two-Column Layout

**Left (7/12) — Outstanding Invoices Table:**
- Filter pills: All | Current | Overdue | Partially Paid | Disputed
- Columns: Invoice # | Customer | Amount | Issued Date | Due Date | Age | Status | Actions
- Age badge: green (< 30d), amber (30–60d), orange (60–90d), red (> 90d)
- Status badges: `UNPAID` (amber), `PARTIALLY_PAID` (blue), `OVERDUE` (red pulsing), `PAID` (green), `DISPUTED` (purple)
- Actions: `Record Payment` (green) | `Send Reminder` (slate) | `View` (orange)

**Right (5/12) — Collections Activity Feed:**
- Title: `"Recent Activity"`
- Chronological feed:
  - Payment received: green dot — `"₹1.2L received from Acme Corp against INV-2024-101"`
  - Reminder sent: slate dot — `"Payment reminder sent to XYZ Ltd — 45 days overdue"`
  - New invoice: orange dot — `"Invoice INV-2024-108 raised for ₹3.4L to Global Tech"`
  - Dispute raised: purple dot
- `"View All"` link at bottom

---

## Screen 15 — Accounts Receivable: Raise Invoice

**Route:** `/frontend/accounts_receivable/raise/` (or modal from dashboard)
**Audience:** Finance Admin, Finance Manager

### Layout: Full-page form (not a modal — too complex)

### Header
- Breadcrumb: `Accounts Receivable → Raise Invoice`
- H1: `"New Customer Invoice"`
- Right: `"Save Draft"` (secondary) + `"Issue Invoice"` (orange gradient CTA)

### Two-column form layout (7/12 + 5/12)

**Left — Invoice Builder:**

**Customer section:**
- Search/select customer (typeahead)
- If new customer: `"+ Add New Customer"` link → inline mini-form: Name, GSTIN, Address, Email, Payment Terms
- Shows selected customer card: name, GSTIN, address, default payment terms

**Invoice Details:**
- Invoice # (auto-generated, editable) — JetBrains Mono font
- Issue Date + Due Date (date pickers)
- Payment Terms dropdown: `Net 15 / Net 30 / Net 45 / Net 60 / On Receipt`
- PO Reference (optional)

**Line Items table:**
- Columns: # | Description | Qty | Unit Price | Tax % | Amount
- Each row: editable inline cells
- `"+ Add Line Item"` button below
- Subtotal / Tax / Total row at bottom (right-aligned, Bricolage Grotesque)

**Notes / Terms section (optional, collapsible)**

**Right — Invoice Preview:**
- Live preview card styled like an actual invoice document
- Company letterhead: `"FinanceAI"` logo, address
- Customer address block
- Line items table (read-only mirror of left)
- Total amount (large, bold)
- Payment instructions
- Updates in real-time as left side is filled
- `"Download PDF Preview"` link at bottom

---

## Screen 16 — Accounts Receivable: Customer Detail

**Route:** `/frontend/accounts_receivable/customer/[id]/`
**Audience:** Finance Admin, Finance Manager

### Header
- Breadcrumb: `Accounts Receivable → Customers → [Customer Name]`
- H1: Customer name (Bricolage Grotesque 800)
- Status badge: Active / On Hold / Blacklisted
- Right: `"Raise Invoice"` (orange) + `"Edit Customer"` (secondary)

### Stats Row — 4 cards
1. **Total Invoiced** — lifetime amount
2. **Outstanding** — orange
3. **Overdue** — red
4. **Avg Days to Pay** — amber

### Two-column layout

**Left — Invoice History:**
- Table: Invoice # | Amount | Due Date | Age | Status
- Same aging color system
- Clicking a row opens invoice detail

**Right — Customer Profile:**
- GSTIN, PAN (masked), Address
- Payment Terms (default)
- Contact: Name, Email, Phone
- Credit Limit (if set): progress bar showing utilisation
- Notes / Internal memo section (editable, not visible to customer)

---

## Global Micro-interactions & Animation Rules

- **Page load:** content fades up staggered (0ms, 80ms, 160ms, 240ms delays per section)
- **Card hover:** `translateY(-2px)`, shadow deepens from `0 2px 12px` to `0 8px 24px`
- **CTA button:** shimmer sweep left-to-right on hover (CSS `::before` pseudo)
- **Status badge:** subtle scale(1.05) on hover
- **Anomaly cards with > 80 score:** 3px red left-border pulses opacity 0.4→1 every 2s
- **Live indicators:** `"Live"` label has 8px green dot with `box-shadow` pulse animation
- **Table rows:** hover bg `#FFF8F5`, 150ms transition
- **Modal open:** backdrop fade in 200ms, panel slides up 300ms cubic-bezier(0.34, 1.56, 0.64, 1)
- **Sidebar active item:** orange left-border 3px, bg `#1E293B`, text white
- **Reduced motion:** all animations disabled via `@media (prefers-reduced-motion: reduce)`

---

## Typography Scale

| Element | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Page H1 | Bricolage Grotesque | 36px | 800 | -1.5px |
| Section H2 | Bricolage Grotesque | 24px | 700 | -0.8px |
| Card title | Bricolage Grotesque | 18px | 700 | -0.5px |
| KPI number | Bricolage Grotesque | 48px | 800 | -2px |
| Body | Plus Jakarta Sans | 14px | 400 | 0 |
| Label | Plus Jakarta Sans | 11px | 700 | +0.08em (uppercase) |
| Table cell | Plus Jakarta Sans | 13px | 500 | 0 |
| Code/ID | JetBrains Mono | 12px | 500 | 0 |

---

## Key Design Principles

1. **Numbers are heroes.** KPI values should be the largest, boldest element on the screen.
2. **Orange is precious.** Use it only for active states, primary CTAs, and AI elements — not decoration.
3. **Dark sidebar anchors the UI.** The slate-950 sidebar creates contrast that makes the warm-white canvas feel airy and open.
4. **AI elements have a distinct visual language.** Purple gradient borders, `AI` pill badges, and pulsing indicators separate AI-derived content from static data.
5. **Status is always legible.** Every workflow state (invoice, vendor, budget) must be immediately identifiable by color + label — never color alone.
6. **Tables breathe.** 52px row height, generous padding, hover state — data tables are primary UI not afterthoughts.
7. **Modals are focused.** One action per modal, minimal fields, no noise.
8. **Data visibility is a design constraint, not an afterthought.** Department, category, and budget impact fields are visually present for internal users but entirely absent from vendor-facing screens — not hidden or greyed out, just not rendered.
9. **IAM permissions matrix is the centrepiece of the IAM screen.** It must be the most readable, scannable table in the entire application — use maximum contrast and clear cell states.
10. **Accounts Receivable and Accounts Payable are mirror flows.** AP = money going out (vendor invoices in). AR = money coming in (customer invoices out). The visual language should feel related but distinguishable — AP uses orange/amber tones, AR uses green/teal tones for its primary accent.
11. **Smart categorisation suggestions are never forced.** AI suggestions appear as editable pre-fills with a confidence %, not locked values — the user always has the last word.
12. **Department assignment at L1 is a power action.** It should feel deliberate — orange-bordered section, clear label that this action links spend to a budget, not a casual dropdown.
