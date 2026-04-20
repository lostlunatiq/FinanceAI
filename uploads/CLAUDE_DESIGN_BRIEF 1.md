# FinanceAI — Complete UI Redesign Brief
### Input for Claude Design / Stitch

---

## What is FinanceAI?

FinanceAI is an **enterprise-grade, AI-native finance automation platform** for mid-to-large organisations. It covers the full accounts payable and accounts receivable lifecycle — from vendor onboarding and invoice submission, through multi-level approval workflows, Finance compliance review, ERP booking, and payment — and the reverse flow of raising outgoing invoices to customers and tracking collections. It layers AI on top: anomaly detection, fraud control, smart expense categorisation, NL-query copilot, and predictive cash flow.

**User roles (each sees a different primary screen):**
- **Vendor** → submits invoices, tracks payment status. **Cannot see** department assignments, budget impact, or internal expense categories.
- **Employee / AP Clerk** → submits internal expenses (with AI category suggestion), reviews the payable queue
- **L1 Approver (first approver)** → reviews and approves/rejects; **can assign/update department** on any expense at this stage
- **HOD / Finance Manager / CFO** → subsequent approval stages; see department + budget impact read-only
- **Finance Admin** → full vendor registry, IAM (users / groups / policies), Finance Review, ERP booking, payment initiation, audit, AR management
- **System** → automated anomaly engine, budgetary enforcement, smart categorisation AI

---

## Full Bill / Invoice Lifecycle (8 stages)

Every vendor bill passes through these stages in order. The Bill Detail screen must show all 8 stages as a live timeline.

| Stage | Status | Actor | What happens | Visible to Vendor? |
|---|---|---|---|---|
| 1 | `SUBMITTED` | Vendor | Vendor submits bill with all fields + attachments | Yes |
| 2 | `PENDING_L1` → `PENDING_L2` | L1 Approver | First internal review; department & category assigned | No (assignment hidden) |
| 3 | `PENDING_HOD` | Dept Head | HOD reviews against departmental budget | No |
| 4 | `PENDING_FIN_L1` → `PENDING_FIN_L2` → `PENDING_FIN_HEAD` | Finance Manager / Head | Finance levels based on amount policy limits | No |
| 5 | `PENDING_CFO` | CFO | Final commercial approval for high-value bills | No |
| 6 | `APPROVED` → Finance Review | Finance Team | Compliance check: GST validity, TDS section, Budget code, PO match. Clears bill for ERP. | Partial — vendor sees "Cleared for Processing" |
| 7 | `BOOKED_D365` | Finance Team | Books invoice in ERP (D365). Document No. generated. | Yes — vendor sees ERP Ref No. |
| 8 | `PAID` | Finance / D365 | Payment made. UTR No. recorded. | Yes — full payment details |

---

## Expanded Data Models (for UI field reference)

### Vendor Master — All Fields

| # | Field | Type | Notes |
|---|---|---|---|
| 1 | Vendor No. | Code[20] | Auto-generated unique ID |
| 2 | Name | Text[100] | Primary vendor name |
| 3 | Name 2 | Text[50] | Trade name / DBA |
| 4 | Address | Text[100] | Street address line 1 |
| 5 | Address 2 | Text[50] | Street address line 2 |
| 6 | City | Text[30] | |
| 7 | Post Code | Code[20] | PIN code |
| 8 | State Code | Code[20] | State abbreviation |
| 9 | County / State Name | Text[30] | Full state name |
| 10 | Country / Region Code | Code[10] | Default: IN |
| 11 | Phone No. | Text[30] | |
| 12 | Mobile Phone No. | Text[30] | |
| 13 | Email | Text[80] | Login email |
| 14 | Website | Text[80] | |
| 15 | GST Registration No. | Text[30] | GSTIN (15-char) |
| 16 | PAN No. | Code[20] | 10-char PAN |
| 17 | Vendor Posting Group | Code[20] | ERP GL mapping |
| 18 | Currency Code | Code[10] | INR default |
| 19 | Payment Terms Code | Code[20] | Net 30 / Net 45 etc. |
| 20 | Blocked | Option | Active / Suspended / Blacklisted |
| 21 | Order Address Codes | Code[30][] | Multiple service delivery addresses |
| 22 | Vendor Type | Text[30] | SaaS / Cloud / Logistics / General |
| 23 | TDS Section | Text[10] | 194C / 194J / 194I etc. |
| 24 | MSME Registered | Boolean | |
| 25 | Bank Account Name | Text[200] | |
| 26 | Bank Account No. | Text[30] | Masked in UI (last 4 digits) |
| 27 | Bank IFSC | Code[11] | |

### Bill / Invoice — All Fields

| # | Field | Type | Notes |
|---|---|---|---|
| 1 | Document No. | Code[15] | Auto: `BILL-2026-XXXXX` |
| 2 | Vendor Code | Code[20] | FK to Vendor |
| 3 | Vendor Name | Text[100] | Denormalised for display |
| 4 | Expense Category | Option | Rent / Warehouse / Travel / Software / Hardware / Marketing / Office / Other |
| 5 | Vendor Invoice No. | Text[60] | Vendor's own invoice number |
| 6 | Vendor Invoice Date | Date | Date on vendor's invoice |
| 7 | Due Date | Date | Payment due date |
| 8 | Invoice Submit Date | Date | When submitted to portal |
| 9 | Order Address Code | Code[30] | Delivery / service address |
| 10 | Location Code | Code[30] | Company location |
| 11 | Project Code | Code[30] | Linked project (optional) |
| 12 | Project Location | Code[30] | |
| 13 | Currency Code | Code[15] | INR default |
| 14 | Service Month | Date | Month the service was rendered |
| 15 | Basic Amount (Pre-GST) | Decimal | |
| 16 | GST % | Option | 5% / 12% / 18% / 28% |
| 17 | HSN / SAC Code | Code[15] | |
| 18 | CGST Amount | Decimal | |
| 19 | SGST Amount | Decimal | |
| 20 | IGST Amount | Decimal | |
| 21 | Total Invoice Value | Decimal | Basic + all GST |
| 22 | TDS Section | Text[10] | |
| 23 | TDS Amount | Decimal | |
| 24 | Payment Date | Date | Actual payment date |
| 25 | UTR No. | Code[50] | Bank transfer reference |
| 26 | Payment Amount | Decimal | May differ from invoice (partial) |
| 27 | D365 Document No. | Code[100] | ERP booking reference |
| 28 | Status | Option | Draft / Submitted / Pending Approval / Finance Review / ERP Processing / Paid / Rejected |
| 29 | Attachments | File[] | Multiple PDFs/images |
| 30 | Comments | Text[] | Thread — any stakeholder can add |
| 31 | Department | FK | Assigned at L1 approval |
| 32 | Anomaly Severity | Option | null / LOW / MEDIUM / HIGH |

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

*Finance*
1. Dashboard / Command Center
2. Accounts Payable Hub
3. Accounts Receivable *(new)*
4. Expense Management

*Planning & Controls*
5. Budget Management
6. Budgetary Guardrails

*Intelligence*
7. Reports & Analytics *(new)*
8. AI Intelligence Hub *(new — Cash Flow / Summaries / Payment Optimisation)*
9. Anomaly Detection

*Operations*
10. Vendor Management
11. Document Management *(new)*
12. Audit Log

*Administration*
13. IAM — Identity & Access *(Finance Admin only)*
14. Settings

**Role-based sidebar visibility:**
- **Vendor** → Vendor Portal standalone (no sidebar)
- **Employee** → Dashboard, Expense Management
- **L1 / HOD** → Dashboard, AP Hub, Expense Management, Budget Management, Guardrails, Audit Log
- **Finance Manager** → All of the above + Reports & Analytics, AI Intelligence Hub, Anomaly Detection, Document Management
- **CFO** → All Finance Manager items + AI Intelligence Hub full view
- **Finance Admin** → Everything including IAM, Accounts Receivable, Document Management (admin view)

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

### Invoice / Bill Rows — Clickable

Every bill row in every table (AP Hub, Vendor Portal, CFO Dashboard, Expense Management) is clickable and opens the **Bill Detail Page** (Screen 4A below). The row click area is the entire row excluding action buttons. A subtle right-arrow chevron at the row end signals it is navigable.

---

## Screen 4A — Bill / Invoice Detail (Full Page)

**Route:** `/frontend/bill_detail/?id=[bill-id]`
**Audience:** All internal roles see full detail. Vendor sees a restricted version (fields 1–21 only, no department, no internal notes, no budget impact).
**Trigger:** clicking any bill row anywhere in the application.

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Bill ref + Status badge + Vendor name + Action buttons  │
├──────────────────────────────┬──────────────────────────────────┤
│  LEFT COLUMN (7/12)          │  RIGHT COLUMN (5/12)             │
│  ─────────────────           │  ───────────────────             │
│  Section A: Invoice Details  │  Section E: Approval Timeline    │
│  Section B: Vendor Card      │  Section F: Finance Review       │
│  Section C: GST & Tax        │  Section G: ERP & Payment        │
│  Section D: Attachments      │  Section H: Comments Thread      │
└──────────────────────────────┴──────────────────────────────────┘
```

---

### Page Header (sticky)

- **Back link:** `← AP Hub` (breadcrumb)
- **Bill reference:** `BILL-2026-00042` in JetBrains Mono, 20px
- **Status badge:** large, colored (matches status badge system), with stage label e.g. `PENDING_CFO`
- **Anomaly badge:** if `anomaly_severity` is set — red/amber pulsing pill `"HIGH RISK"` beside status
- **Action buttons (role-based):**
  - Finance Admin sees: `Approve` + `Reject` + `Raise Query` + `Initiate Finance Review` + `Book in ERP` + `Record Payment`
  - CFO sees: `Approve` + `Reject` + `Raise Query`
  - Finance Manager sees: `Approve` + `Reject` + `Raise Query`
  - Vendor sees: `Add Comment` only (no approval actions)
- **`⋮` more menu:** Download PDF | View Audit Trail | Flag for Review

---

### Section A — Invoice Details

White card, two-column field grid layout.

| Left column | Right column |
|---|---|
| **Document No.** — `BILL-2026-00042` (monospace) | **Vendor Invoice No.** — vendor's ref |
| **Expense Category** — colored category badge | **HSN / SAC Code** |
| **Invoice Date** — vendor's invoice date | **Service Month** |
| **Submit Date** — when portal received it | **Due Date** — with overdue red indicator if past |
| **Order Address** | **Location Code** |
| **Project Code** | **Project Location** |
| **Currency** | **Payment Terms** |

**Amount breakdown table (full width, below field grid):**

| Line | Amount |
|---|---|
| Basic Amount (Pre-GST) | ₹ X,XX,XXX |
| CGST (9%) | ₹ X,XXX |
| SGST (9%) | ₹ X,XXX |
| IGST (0%) | ₹ 0 |
| **Total Invoice Value** | **₹ X,XX,XXX** (bold, large, orange) |
| TDS Deduction (`194C`) | − ₹ X,XXX |
| **Net Payable** | **₹ X,XX,XXX** (bold, green) |

---

### Section B — Vendor Card

Compact card with orange left-border accent.

- **Vendor No.** (monospace, slate-400)
- **Vendor Name** (Bricolage Grotesque, 18px) + **Name 2** (if set, slate-400)
- Row: GSTIN badge + PAN badge (masked: `ABCDE****F`) + MSME badge (if registered)
- **Address block:** Address, Address 2, City, State, PIN, Country
- **Contact:** Phone icon + number | Mobile icon + number | Email icon + email | Website icon + URL
- **Bank details** (Finance Admin / Finance Manager only — never shown to vendor):
  - Bank: IFSC + masked account `•••• •••• 4521`
  - Vendor Posting Group
- **Vendor status badge:** Active (green) / Suspended (red) / Blacklisted (dark red)
- `"View Full Vendor Profile"` link → navigates to Vendor Management detail

---

### Section C — GST & Tax Compliance

Card with purple AI badge — `"Compliance Check"`.

| Check | Result |
|---|---|
| GSTIN Format Valid | ✅ Green |
| GSTIN Active (GSTN portal) | ✅ Green |
| TDS Section Applicable | ✅ `194C — Contractors` |
| HSN/SAC Code Valid | ✅ Matched |
| GST % matches HSN | ✅ 18% confirmed |
| Reverse Charge Applicable | ❌ No |
| Budget Code Matched | ✅ Engineering Q3 FY26 |
| PO Reference | ⚠️ No PO linked — manual override required |

- Each row: icon (✅ / ⚠️ / ❌) + label + result + optional `Fix` link (Finance Admin only)
- AI badge on section header: `"AI Verified"` purple pill or `"Manual Review Required"` amber pill
- If any check fails: amber banner at top of section — `"2 compliance issues require Finance review before ERP booking"`

---

### Section D — Attachments

- Title: `"Attachments"` + count badge
- Grid of attachment cards (3 per row):
  - PDF: document icon (orange), filename, file size, uploader name + date
  - Image: thumbnail preview
  - Each card: `Download` icon + `Preview` icon
  - Hover: card lifts, orange border
- `"Add Attachment"` dashed-border upload zone (all roles except view-only)
- Preview opens in a lightbox/modal overlay (PDF viewer or image)

---

### Section E — Approval Timeline *(Right column, most important)*

Full-height vertical stepper. Each stage of the 8-step lifecycle is shown.

```
Stage design per step:

● [Icon]  Stage Name                    [Status badge]
│         Assigned to: [Avatar] Name
│         Acted by: [Avatar] Name (if different — delegation)
│         Decided at: DD MMM YYYY, HH:MM
│         Reason / Notes: "..."
│
● [Icon]  Next Stage...
```

**Step states:**
- **Completed — Approved:** filled green circle, green checkmark icon, full details visible
- **Completed — Rejected:** filled red circle, X icon
- **Completed — Queried:** filled purple circle, question mark icon
- **Current / Active:** filled orange circle with pulse animation, clock icon
- **Pending (future):** hollow slate circle, dash icon, shows assigned approver name

**All 8 stages listed:**
1. `Submitted` — by [Vendor name], [date]
2. `L1 Review` — assigned to [name], acted by [name]
3. `Dept Head Review` — assigned to [name]
4. `Finance L1` — assigned to [name]
5. `Finance L2` — assigned to [name] (shown only if triggered)
6. `CFO Approval` — assigned to [name]
7. `Finance Review` — compliance check by Finance Team
8. `ERP Booking` — D365 document no., booked by [name]
9. `Payment` — UTR No., paid by [name]

- **Department assigned:** shown as an orange tag on the L1 step row — `"Dept: Engineering"`
- **Category assigned:** shown as a purple tag — `"Category: Software"`
- If a step was **delegated:** shows `"Delegated from [original approver]"` in slate-400
- If SLA breached: amber `"SLA breached by 2 days"` on that step
- Clicking any completed step **expands** to show full decision reason inline

---

### Section F — Finance Review *(internal users only)*

Shown only after CFO approval. Card with `"Finance Compliance Review"` header.

**Status states:**
- `"Pending Review"` — amber, `"Initiate Review"` button (Finance Admin only)
- `"In Review"` — orange pulsing dot, reviewer name + started date
- `"Cleared"` — green, `"Cleared for ERP Processing"` + reviewer + date
- `"Issues Found"` — red, list of issues

**Checklist (editable by Finance Admin, read-only for others):**
- [ ] GST compliance verified
- [ ] TDS section confirmed
- [ ] Budget code assigned and headroom confirmed
- [ ] PO match verified (or manual override approved)
- [ ] Duplicate invoice check passed
- [ ] Vendor bank details verified

Each checkbox: label + `"Verified by [name] at [time]"` once checked.

**Finance Review Notes:** text area (Finance team only)

`"Clear for ERP"` CTA — orange gradient, only enabled when all checkboxes ticked.

---

### Section G — ERP Booking & Payment *(internal users only)*

Two sub-sections:

**ERP Booking:**
- Status: `Not Yet Booked` (slate) / `Booked` (green)
- If booked: `D365 Document No.` in monospace — `DOC-2026-08821`
- Booked by: [avatar] name + date
- `"Book in ERP"` button (Finance Admin only, enabled after Finance Review cleared)
- After booking: `"Update Booking Status"` dropdown — Booked / Posted / Failed — manual update

**Payment Details:**
- Status: `Pending` / `Initiated` / `Paid`
- Payment Date
- UTR No. — monospace, copyable (copy icon beside it)
- Payment Amount
- Paid by: [avatar] name
- `"Record Payment"` button (Finance Admin only) — opens modal:
  - UTR No. (required)
  - Payment Date
  - Payment Amount
  - `"Confirm Payment"` CTA

---

### Section H — Comments Thread

- Chronological thread, newest at bottom
- Each comment: [Avatar] **Name** · Role badge · timestamp
- Comment text (full width)
- If comment has attachments: small file chips below text
- **Vendor can see and reply to comments** (this is the communication channel replacing email)
- **Internal-only comments:** Finance Admin / Finance Manager can post `"Internal Note"` — shown with a lock icon + orange tinted background. Vendor CANNOT see these.
- `"Add Comment"` text area at bottom + `"Post"` button
- `"Internal Note"` toggle (Finance team only) — switches background to orange-tinted

---

### Vendor's Restricted View of Bill Detail

When a **vendor** views their bill, they see a simplified version:

- Section A: Invoice Details (all fields ✅)
- Section B: Their own vendor card (no bank details shown back to them) ✅
- Section C: GST summary only — `"Compliance Status: Verified"` or `"Under Review"` — no detailed checklist ✅
- Section D: Attachments they uploaded ✅
- Section E: **Simplified timeline** — stage names only, no internal approver names/notes. Shows: `Submitted → Under Review → Approved → Processing → Paid`. No department or category tags.
- Section F: Hidden entirely ❌
- Section G: Payment details only once PAID — UTR No., Payment Date, Amount ✅
- Section H: Comments thread — vendor sees all non-internal comments and can reply ✅

---

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

### Add / Edit Vendor — Multi-step Full-page Form (not a modal — too many fields)

**Step indicator:** horizontal progress bar, 4 steps, orange active step.

**Step 1 — Identity:**
- Vendor No. (auto-generated, editable)
- Name + Name 2 (trade name)
- Vendor Type (SaaS / Cloud / Logistics / General / Other)
- GSTIN (15-char validated) + PAN (10-char validated)
- MSME Registered toggle + TDS Section dropdown (194C / 194J / 194I / 194H / other)
- Vendor Posting Group (dropdown, ERP mapping)
- Blocked status (Active / Suspended / Blacklisted)

**Step 2 — Address & Contact:**
- Address line 1 + Address 2
- City + Post Code + State Code (dropdown, all Indian states) + Country (default IN)
- Phone No. + Mobile No.
- Email + Website
- Order Address Codes (repeating section — add multiple service delivery addresses, each with a code + full address)

**Step 3 — Banking & Payment:**
- Bank Account Name
- Bank Account No. (masked after entry — show `•••• 4521`)
- Bank IFSC (auto-resolves bank name on valid IFSC — show green pill `"HDFC Bank, Mumbai"`)
- Currency Code (default INR)
- Payment Terms Code (Net 15 / Net 30 / Net 45 / Net 60 / On Receipt)
- Avg Invoice Amount (optional reference figure)

**Step 4 — Documents:**
- Upload: GST Registration Certificate
- Upload: PAN Card copy
- Upload: Bank letter / cancelled cheque
- Upload: MSME Certificate (if applicable)
- Each upload shows filename, size, `Remove` link
- CTA: `"Save & Send Activation Email"` (creates user account) or `"Save as Draft"`

### Vendor Detail — Full Page (not a drawer — too much data)

**Route:** `/frontend/vendor_detail/?id=[vendor-id]`

**Page header:**
- Vendor No. (monospace) + Vendor Name (Bricolage Grotesque, 28px) + Name 2
- Status badge (Active / Suspended / Blacklisted / Pending)
- GSTIN chip + PAN chip + MSME badge (if applicable)
- Right: `"Edit Vendor"` + `"Suspend"` / `"Activate"` action button + `"⋮"` more menu

**Tabs: Overview | Invoices | Compliance | Audit Trail**

**Overview tab — 2 columns:**
- Left: full address block, contact details, payment terms
- Right: bank details (masked, Finance Admin only), posting group, TDS section, order addresses list

**Financial summary strip (below tabs, always visible):**
- Total Invoiced | Total Paid | Outstanding | Avg Payment Days | Invoice Count

**Invoices tab:**
- Full invoice history table — all bills for this vendor
- Same columns + clickable rows as AP Hub
- Filter by status, date range

**Compliance tab:**
- Uploaded documents list (GST cert, PAN, bank letter) with expiry dates if applicable
- Compliance check results
- `"Request Updated Documents"` button

**Audit Trail tab:**
- All changes to this vendor record (field-level diff)
- All approval actions on their invoices

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

**Concept:** Groups are named role-bundles. Each group has one assigned system Role (e.g. `Finance Manager`) and a set of members. All members inherit the role's permissions. A user can belong to multiple groups, with the most permissive winning.

> **Implementation note:** Backend does not yet have a Group model. The UI must be designed so Groups map cleanly onto Django's existing `role` field on User — groups are a UX layer that sets the `role` of multiple users at once and provides a named bucket for reporting/audit. No custom permission model needed at this stage.

**Stats Row — 3 cards:**
1. **Total Groups** — count
2. **Total Members** — count across all groups
3. **Unassigned Users** — amber (users with no group yet)

**Groups Table (not a card grid — a table is more scannable for admins):**
- Columns: Group Name | Role Mapped | Members | Policies | Created | Actions
- Group Name: bold, Bricolage Grotesque, clickable to open detail
- Role Mapped: colored role badge (same system as users tab)
- Members: small avatar stack (max 4 circles) + `"+N"` overflow count
- Policies: `"3 policies"` purple pill
- Actions: `Edit` | `Delete` (kebab menu)
- `"+ Create Group"` button top-right
- Search bar + Role filter

**Group Detail — Full-page (replaces tab content, breadcrumb back):**
```
┌─────────────────────────────────────────────────────┐
│  Header: [Group name] · [Role badge] · Edit · Delete │
├───────────────────────┬─────────────────────────────┤
│  MEMBERS (left 6/12)  │  PERMISSIONS (right 6/12)   │
│  ─────────────────    │  ───────────────────────     │
│  Search + Add button  │  Inherited from: [Role]      │
│  Table:               │  Permission list (read-only  │
│  Avatar | Name | Role │  summary from Policies tab)  │
│  | Dept | Remove btn  │                              │
│                       │  + "Assign Extra Policy"     │
│                       │  button for overrides        │
└───────────────────────┴─────────────────────────────┘
```
- **Members section:** table with Avatar, Name, Role badge, Department, `Remove` link per row. `"+ Add Members"` opens searchable user picker modal.
- **Permissions section:** flat list of what this group can do, grouped by resource (Invoices, Expenses, Budgets, Vendors, Reports, IAM). Each row: resource icon + action label + source (`"from Finance Manager role"` or `"Direct override"`). Read-only summary.

**Create/Edit Group Modal:**
- Group Name (text)
- Description (text)
- Map to Role (dropdown — picks one of the 6 system roles, defines base permissions)
- Members (searchable multi-select chip input — type name to find users)
- Preview panel below: `"Members will inherit: [list of 5 key permissions from selected role]"`
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

---

## Screen 17 — Reports & Analytics

**Route:** `/frontend/reports/`
**Audience:** Finance Manager, Finance Admin, CFO
**Backend note:** `apps/reports` exists as an empty stub — this screen drives the requirements for what views/endpoints to build.

### Header
- H1: `"Reports & Analytics"` with a bar-chart icon
- Sub: `"Generate, filter, and export financial intelligence across every dimension."`
- Right: `"Schedule Report"` (secondary) + `"Export"` dropdown (PDF / Excel / CSV) — orange gradient

### Report Type Selector (top, prominent)
Full-width segmented tab bar with 5 report types:
1. **P&L Summary** — profit & loss by period
2. **Revenue Dashboard** — AR collections, customer breakdown
3. **Expense Breakdown** — AP + internal expenses by category/dept
4. **Vendor Analysis** — spend by vendor, top vendors, payment terms compliance
5. **Month-over-Month Trends** — all key metrics trended over time

Active tab: orange underline, bold. Switching tab changes the entire content area below.

---

### Universal Filter Bar (sticky below tab selector)

Present on all report types. Orange `"Apply Filters"` button at right end.

| Filter | Control type | Options |
|---|---|---|
| Date Range | Date range picker | This Month / Last 3M / Last 6M / YTD / Custom |
| Department | Multi-select dropdown | All departments from DB |
| Vendor | Searchable multi-select | All vendors from DB |
| Category | Multi-select | All expense categories |
| Status | Multi-select | Paid, Pending, Rejected, etc. |
| Amount Range | Min / Max number inputs | ₹ |
| Report Format | Toggle | Summary / Detailed |

Active filters show as removable orange chips below the bar.

---

### Tab 1 — P&L Summary

**Layout: 2-column (charts left, table right)**

**Top KPI strip — 4 cards:**
- Total Revenue (AR collected): green
- Total Expenses (AP + internal): orange
- Gross Profit: large, green/red depending on sign
- Net Margin %: circular gauge, 0–100%

**Left — P&L Waterfall Chart (SVG):**
- Horizontal waterfall / bridge chart
- Bars: Revenue (green) → Cost of Goods (red down) → Gross Profit (green) → OpEx (red down) → EBITDA (green)
- Each bar labelled with ₹ amount and % of revenue
- Orange accent for the final net figure

**Right — P&L Table:**
- Category | Budget | Actual | Variance | Variance %
- Rows grouped by: Revenue / Cost of Revenue / Operating Expenses / Net Profit
- Variance: green if favourable, red if unfavourable
- Sub-rows expandable per category

---

### Tab 2 — Revenue Dashboard

**Top KPI strip:**
- Total AR Raised: orange
- Collected: green
- Outstanding: amber
- Overdue: red
- Collection Rate %: circular gauge

**Main area — 2 rows:**

**Row 1: Revenue Trend + Top Customers (side by side)**
- Left (7/12): SVG line chart — monthly revenue collected vs invoiced over selected period. Two lines: orange (invoiced), green (collected). X-axis = months, Y-axis = ₹.
- Right (5/12): Top 5 customers table — Customer | Invoiced | Collected | Outstanding | Payment Days

**Row 2: Revenue by Category + AR Aging (side by side)**
- Left (5/12): Donut chart — revenue split by product/service category (segments in orange shades)
- Right (7/12): Aging bucket bar chart — grouped bars per customer, colour-coded by age bucket (0–30d green, 31–60d amber, >60d red)

---

### Tab 3 — Expense Breakdown

**Top KPI strip:**
- Total Spend: orange
- vs Budget: red/green delta badge
- Avg per Transaction: slate
- Transactions Count: slate

**Main area:**

**Row 1: Spend by Department (full width)**
- Horizontal bar chart — one bar per department
- Each bar: orange fill, shows ₹ amount + % of total
- Budget line overlay (dashed grey vertical line showing budget ceiling per dept)
- Click a department bar → filters the rest of the page to that department

**Row 2: Spend by Category + Spend Trend (side by side)**
- Left (5/12): Treemap or donut — category breakdown. Each category is a rectangle/segment sized by spend. Labels inside: category name + ₹ + %.
- Right (7/12): Month-over-month spend line chart — one line per top 3 categories, coloured distinctly (orange, purple, green). X = months, Y = ₹.

**Row 3: Expense Transactions Table (full width)**
- Columns: Date | Ref # | Vendor / Employee | Department | Category | Amount | Status
- Sortable columns
- Inline expand: shows approval chain, notes
- `"Export this table"` button

---

### Tab 4 — Vendor Analysis

**Top KPI strip:**
- Total Vendors: slate
- Active: green
- Total AP Spend: orange
- Avg Payment Days: amber

**Main area:**

**Row 1: Top Vendors by Spend + Payment Compliance (side by side)**
- Left (6/12): Horizontal bar chart — top 10 vendors by total spend, orange bars
- Right (6/12): Scatter plot — X = avg payment days, Y = total spend. Each dot = a vendor. Dots in red zone (right of 60-day line) = late payers. Hover shows vendor name.

**Row 2: Vendor Spend Trend (full width)**
- Multi-line chart — select up to 5 vendors to compare spend month-over-month
- Vendor selector chips above chart
- Lines in distinct colours with legend

**Row 3: Vendor Table**
- Vendor | Category | Total Invoiced | Total Paid | Outstanding | Avg Days to Pay | Last Invoice | Status
- Colour-coded Avg Days: green (< 30), amber (30–45), red (> 45)

---

### Tab 5 — Month-over-Month Trends

**Concept:** Single scrollable page of trend charts across all key metrics.

**Controls:** Year selector (e.g. FY 2025–26) + Compare toggle (compare to previous year)

**Charts (stacked vertically, full width, consistent style):**
1. **Revenue vs Expenses** — dual-line chart, orange = expenses, green = revenue. Gap = profit margin area fill.
2. **Invoice Volume** — bar chart, count of invoices raised per month, split AP (orange) / AR (blue)
3. **Approval Cycle Time** — line chart, avg days from submission to payment per month
4. **Budget Utilisation** — grouped bars per department, % used per month
5. **Anomaly Count** — bar chart, anomalies flagged per month, colour by severity
6. **Vendor Onboarding** — area chart, cumulative vendor count

Each chart has a download icon (top-right) for individual export.

---

### Export Panel (slide-in from right, triggered by Export button)
- Title: `"Export Report"`
- Report type shown (current tab)
- Format: PDF / Excel / CSV (radio buttons with icons)
- Date range confirmation
- Include charts toggle (PDF only)
- Include raw data toggle
- Schedule: `"Send via email"` + email input + frequency (Once / Weekly / Monthly)
- CTA: `"Generate & Download"` (orange gradient)

---

## Screen 18 — AI Intelligence Hub

**Route:** `/frontend/ai_intelligence/`
**Audience:** Finance Manager, Finance Admin, CFO
**Backend note:** `apps/forecast` exists as empty stub. This screen drives the AI feature requirements.

### Header
- H1: `"AI Intelligence"` with a neural-network / sparkle icon
- Sub: `"Predictive forecasting, automated summaries, and vendor payment optimisation — powered by FinanceAI."`
- Right: `"Run All Models"` orange CTA + pulsing green `"Live"` indicator
- AI badge: purple gradient pill — `"Powered by FinanceAI AI"`

### Three Feature Panels (full-width sections, stacked vertically)

---

### Panel 1 — Cash Flow Forecasting

**Section header:** `"Cash Flow Forecasting"` + `"90-day rolling"` label + `"Last run: [time]"` + `"Rerun"` secondary button

**Main chart (full-width, tall):**
- SVG area chart with:
  - X-axis: next 90 days (weekly ticks, major monthly ticks labelled)
  - Y-axis: ₹ cash position
  - **Actual (past):** solid orange line + filled area below (orange, 15% opacity)
  - **Forecast (future):** dashed orange line
  - **80% Confidence Band:** orange-tinted shaded area above and below the forecast line
  - **Zero line:** dashed red horizontal line (cash shortfall zone below it)
  - **Key events pinned on chart:**
    - Orange pin: `"Large AP due: ₹14L — Vendor XYZ (Nov 15)"`
    - Green pin: `"Expected AR receipt: ₹22L — Acme Corp (Nov 18)"`
    - Red pin: `"Payroll run: ₹45L (Nov 30)"`

**Insight Cards below chart (3 columns):**
- `"Surplus Peak"` — green: `"₹1.2M expected surplus on Dec 14"`
- `"Shortfall Risk"` — red: `"₹340K deficit risk on Nov 28 if Acme payment delayed"`
- `"Recommended Action"` — orange: `"Accelerate ₹8L AR collection from 3 customers to avoid gap"`
  - `"View customers"` link

**Scenarios toggle (above chart):** Base / Optimistic / Pessimistic — switches chart line variant

---

### Panel 2 — Auto Monthly Financial Summaries

**Section header:** `"Monthly Financial Summaries"` + `"Auto-generated on 1st of each month"` + `"Generate Now"` secondary button

**Summary Cards Grid (3 columns, current + last 2 months):**

Each card:
- Month label (Bricolage Grotesque, large) + year
- Status badge: `"Auto-Generated"` (purple AI pill) or `"Draft"` (amber) or `"Reviewed"` (green)
- KPI mini-grid inside card (2×2):
  - Revenue | Expenses | Net Profit | Cash Position
  - Each: small label + bold number + ↑↓ delta vs prev month
- Key insight line: AI-generated single sentence (e.g. `"Travel expenses up 34% vs September"`)
- Bottom actions: `"View Full Summary"` (orange) | `"Export PDF"` | `"Mark Reviewed"`
- Hover: card lifts, orange border

**Full Summary Drawer (slide-in from right when View is clicked):**
- Header: `"November 2025 — Financial Summary"` + AI badge + `"Export PDF"` button
- **Executive Summary** section: 3–5 AI-generated bullet points, each with a supporting number
- **Key Metrics Table:** all KPIs vs prior month vs budget, colour-coded variance
- **Notable Events:** AI-identified significant transactions, anomalies resolved, new vendors
- **Next Month Outlook:** `"Based on current pipeline, December revenue is forecast at ₹X (±12%)"` — AI-generated, purple-tinted section
- `"Add Finance Manager Notes"` text area (editable, saves with the summary)

**Schedule Settings (expandable section at bottom):**
- Toggle: `"Auto-generate on 1st of each month"` — orange when on
- Recipients: email list (add/remove)
- Format: PDF / both PDF and Excel

---

### Panel 3 — Vendor Payment Optimisation

**Section header:** `"Vendor Payment Optimisation"` + `"AI analyses payment terms and cash flow to suggest optimal timing"` + pulsing orange dot

**How it works (top explainer — collapsible after first view):**
3 small icon-cards in a row:
1. `"Analyses cash flow"` — reads forecast data
2. `"Checks payment terms"` — early payment discounts, late fees, vendor relationship score
3. `"Recommends timing"` — batch payments to optimise cash position

**Optimisation Recommendations Table:**

Columns: Vendor | Invoice(s) | Amount Due | Due Date | Suggested Pay Date | Saving / Risk | Action

- **Suggested Pay Date:** may differ from Due Date — AI-calculated optimal date
- **Saving / Risk column:** the key AI insight:
  - Green pill: `"Save ₹1,200 — 2% early payment discount available"`
  - Amber pill: `"Pay by Nov 20 to avoid ₹800 late fee"`
  - Orange pill: `"Batch with 3 others — reduces transaction fees by ₹400"`
  - Red pill: `"Cash shortfall risk if paid before Nov 25"`
- **Action:** `"Pay Now"` (orange) | `"Schedule"` (secondary) | `"Ignore"` (slate)

**Optimisation Summary Card (above table):**
- `"If you follow all recommendations this month:"` heading
- Large numbers: `"Total Savings: ₹14,200"` (green) | `"Avoided Late Fees: ₹3,800"` | `"Optimised Payment Days: +4.2 DPO"`
- `"Apply All Recommendations"` CTA (orange gradient, full-width)

---

## Screen 19 — Document Management

**Route:** `/frontend/documents/`
**Audience:** Finance Admin (full), Finance Manager (view + upload), all internal users (own documents)
**Backend note:** `FileRef` model exists in `apps/invoices/models.py` with `path`, `uploaded_by`, `uploaded_at`. Linked to Expense and ExpenseQuery. This screen provides a centralised UI over those records, plus adds a standalone document store for compliance docs.

### Header
- H1: `"Document Management"` with a folder icon
- Sub: `"Centralised repository for invoices, contracts, compliance certificates, and audit evidence."`
- Right: `"Upload Document"` orange CTA + `"Storage Used: 2.4 GB / 10 GB"` subtle progress bar

### Top Navigation Tabs
**All Documents** | **Invoices & Bills** | **Contracts** | **Compliance Certs** | **Audit Evidence**

Active tab: orange underline.

---

### Tab 1 — All Documents (default view)

**Filter Bar:**
- Search (filename or content)
- Document Type dropdown: Invoice / Contract / Certificate / Evidence / Other
- Uploaded By: user picker
- Date Range: date range picker
- Linked To: entity picker (Invoice #, Vendor, Expense, etc.)

**Documents Table:**
- Columns: File Name | Type badge | Size | Uploaded By | Date | Linked To | Actions
- **Type badges:** Invoice (orange), Contract (blue), Certificate (green), Evidence (purple), Other (slate)
- **Linked To:** shows entity chip — e.g. `"INV-2024-082"` (orange) or `"Vendor: TechLogistics"` (blue) — clickable to navigate to that entity
- **Actions:** `Download` (download icon) | `Preview` (eye icon) | `Delete` (red, Finance Admin only)
- Clicking a filename row expands an inline preview panel

**Inline Preview Panel (below clicked row, full table width):**
- Left: PDF/image viewer (iframe for PDF, img tag for images). `"Open full screen"` icon.
- Right: Document metadata — Name, Type, Size, Uploaded by, Date, Linked entities, Tags
- `"Add Tag"` chip input
- `"Replace File"` button (Finance Admin only)

---

### Tab 2 — Invoices & Bills

Pre-filtered view showing only documents of type Invoice/Bill.
Same table as above + extra column: `Invoice Status` (mirrors the Expense/Invoice status badge).
`"Link to Invoice"` action if document is unlinked (orphan).

---

### Tab 3 — Contracts

**Purpose:** Store vendor contracts, MSAs, SOWs — not linked to individual invoices.

**Extra columns vs All Documents:** Vendor | Contract Value | Expiry Date | Status
- Status: Active (green), Expiring Soon (amber — < 60 days), Expired (red)
- Expiry alert: amber banner at top if any contracts expire within 30 days

**Add Contract Modal:**
- Vendor (searchable dropdown)
- Contract Type: MSA / SOW / NDA / Purchase Agreement / Other
- Value (optional)
- Start Date + Expiry Date
- Upload file (drag-and-drop)
- Tags (chip input)
- CTA: `"Save Contract"`

---

### Tab 4 — Compliance Certificates

**Purpose:** GST registration, TDS certificates, ISO certs, vendor GST proofs, PAN cards.

**Extra columns:** Entity | Certificate Type | Valid From | Valid Until | Status
- Status: Valid (green), Expiring (amber — < 30 days), Expired (red)
- **Expiry warning banner** when any cert expires within 14 days: `"3 compliance certificates expiring soon — review required"` (red-tinted, prominent)

**Bulk Upload Button:** `"Bulk Upload Certs"` (secondary button) — multi-file drag and drop, auto-classifies by filename pattern using AI

---

### Tab 5 — Audit Evidence

**Purpose:** Screenshots, emails, approval exports, external audit files tied to specific audit events.

**Extra columns:** Linked Audit Event | Auditor | Submitted Date
- `"Link to Audit Entry"` action — opens audit log entry picker
- Filter by audit event type

---

### Storage Usage Panel (bottom of all tabs, collapsible)
- `"Storage Overview"` header
- Progress bar: `"2.4 GB used of 10 GB"` (orange fill)
- Breakdown by type: Invoices (1.2 GB), Contracts (600 MB), Certs (300 MB), Evidence (300 MB)
- `"Clean up"` link → shows documents older than 7 years (beyond retention policy)

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
13. **Reports are for decisions, not just data.** Every chart must have an accompanying KPI strip and at least one insight callout. Raw tables are secondary — the visual always leads.
14. **AI Intelligence Hub feels like a cockpit.** Dense but scannable. The cash flow chart is the centrepiece — it must feel alive with pinned events and confidence bands, not a static line on a grid.
15. **IAM Groups must be implementable.** Groups map to existing Django `role` field. No custom permission model needed — the UI is a management layer over roles, not a new auth system.
16. **Document Management respects the existing FileRef model.** The UI surfaces what already exists (uploaded invoice PDFs, evidence attachments) plus adds standalone document types (Contracts, Certs) as new categories on the same model.
17. **Export is a first-class action in Reports.** The Export button is always visible in the sticky header of the Reports screen, not buried in a menu.
18. **Bill Detail is a full page, never a drawer.** There are 8 lifecycle stages, 30+ fields, an approval timeline, compliance checks, ERP status, a payment panel, and a comments thread — this cannot fit in a slide-in panel. It must be a dedicated full page with a back-navigation breadcrumb.
19. **The approval timeline is the centrepiece of the Bill Detail page.** It should be the first thing a Finance Admin reads — who submitted, who approved at each step, what reason was given, when. Make it tall, scannable, and visually clear using a vertical stepper.
20. **Internal-only content has a distinct visual treatment.** Internal notes in the comments thread use an orange-tinted background + lock icon. Finance Review section and ERP/Payment panels are wrapped in a subtle `[INTERNAL]` header band. Vendor-facing content is clean white.
21. **Every bill row everywhere is a navigation trigger.** AP Hub, CFO Dashboard, Vendor Portal, Expense Management — all bill rows navigate to the Bill Detail page on click. Rows have a right-chevron indicator.
22. **Vendor Master is a proper master data record, not just a name + GSTIN.** The 27-field vendor form uses a 4-step wizard. Vendor Detail is a full page with tabs, not a sidebar drawer.
