# 06 — Vendor Management Module

## 6.1 Module Overview

The Vendor Management module is the cornerstone of the application — since the company deals primarily with vendors, this module provides comprehensive vendor lifecycle management from onboarding to performance evaluation.

---

## 6.2 Feature Breakdown

### 6.2.1 Vendor Registry & Onboarding

**Vendor List Page** (`/vendors`)
- Responsive data table with columns: Vendor Code, Company Name, Type, Status, Rating, Total Spend, Primary Contact, Actions
- Advanced filters: Status, Type, Industry, Rating range, Tag filters
- Search by company name, vendor code, or contact email
- Sortable columns with persistent sort state
- Bulk actions: Activate, Deactivate, Export
- "Add Vendor" CTA button (role-restricted)
- View toggle: Table view / Card view (grid with vendor cards)

**Add/Edit Vendor Page** (`/vendors/new`, `/vendors/[id]/edit`)
- Multi-step form with validation:
  - **Step 1 - Basic Info**: Company name, type, industry, tax ID, registration number
  - **Step 2 - Address**: Full address with country selector
  - **Step 3 - Banking**: Bank name, account number, routing number, SWIFT, payment terms, preferred payment method
  - **Step 4 - Contacts**: Add multiple contacts with primary contact designation
  - **Step 5 - Compliance Documents**: Upload W-9, insurance certificates, licenses
  - **Step 6 - Tags & Notes**: Tags for categorization, internal notes
- Form validation with real-time error display
- Draft save capability (auto-save every 30 seconds)
- Duplicate detection on company name and tax ID

**Vendor Detail Page** (`/vendors/[id]`)
- Header card with: Company name, status badge, type, rating stars, total spend, primary contact quick-actions (email, phone)
- Tabbed interface:
  - **Overview tab**: Key metrics (total invoices, total spend, avg payment time, contract status), recent activity timeline
  - **Contacts tab**: Contact list with add/edit/delete, click-to-email, click-to-call
  - **Contracts tab**: Active/expired contracts grid, contract detail view, add contract form
  - **Documents tab**: Compliance document list with expiry alerts, upload new documents, verification status
  - **Invoices tab**: All invoices from this vendor with status filters
  - **Performance tab**: Rating history chart, performance scorecard, submit new rating form
  - **Activity tab**: Audit trail of all changes to this vendor record

### 6.2.2 Contract Management

**Contract List** (within vendor detail or global view)
- Table: Contract #, Vendor, Title, Status, Start Date, End Date, Value, Auto-Renew
- Color-coded status badges
- Expiry alerts: Highlight contracts expiring within 30/60/90 days
- Calendar integration: Contract timeline view

**Contract Form**
```
Fields:
- Contract Number (auto-generated or manual)
- Title
- Description (rich text editor)
- Start Date (date picker)
- End Date (date picker)
- Total Value (currency input)
- Currency (dropdown)
- Auto-Renew (toggle)
- Renewal Notice Days (number)
- Terms & Conditions (rich text or upload)
- Attachments (file upload)
```

### 6.2.3 Vendor Performance Scoring

**Rating System**
- 5-star rating across 5 dimensions:
  1. **Quality** — Quality of goods/services delivered
  2. **Delivery** — On-time delivery performance
  3. **Communication** — Responsiveness and clarity
  4. **Price** — Competitive pricing
  5. **Overall** — Overall satisfaction
- Quarterly rating cycle
- Historical rating trend chart
- Vendor comparison view

**Performance Dashboard** (within vendor detail)
- Spider/radar chart of rating dimensions
- Line chart of rating trends over time
- Comparison with industry average
- Key performance indicators:
  - Average invoice processing time
  - Invoice dispute rate
  - On-time delivery rate
  - Contract compliance rate

### 6.2.4 Compliance Tracking

**Document Types Tracked:**
| Document | Required | Expiry Tracking |
|----------|----------|-----------------|
| W-9 / Tax Form | ✅ | Annual |
| Certificate of Insurance | ✅ | Annual |
| Business License | Optional | Per license |
| Professional Certifications | Optional | Per cert |
| NDA / Non-Disclosure | Optional | Per contract |
| Background Check | Optional | Biennial |

**Compliance Alerts:**
- Dashboard widgets showing vendors with expired/expiring documents
- Email notifications 30 days before document expiry
- Status indicators: ✅ Compliant, ⚠️ Expiring Soon, ❌ Non-Compliant
- Compliance report for auditors

---

## 6.3 UI Component Specifications

### VendorCard Component
```
┌─────────────────────────────────────────┐
│ ┌─────┐  Acme Corporation         ⋮    │
│ │ Logo│  VND-0001 • Technology          │
│ │     │  ★★★★☆ (4.2)                    │
│ └─────┘                                 │
│─────────────────────────────────────────│
│ Status: ● Active     Type: Company      │
│ Total Spend: $245,000  Invoices: 12     │
│─────────────────────────────────────────│
│ Primary: Jane Smith • jane@acme.com     │
│ [📧 Email] [📞 Call] [View Details →]   │
└─────────────────────────────────────────┘
```

### VendorForm Validation Rules
```typescript
const vendorSchema = z.object({
  companyName: z.string().min(2, "Company name required").max(200),
  vendorType: z.enum(["INDIVIDUAL", "COMPANY", "GOVERNMENT", "NON_PROFIT"]),
  taxId: z.string().regex(/^\d{2}-\d{7}$/, "Invalid EIN format (XX-XXXXXXX)").optional(),
  addressLine1: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2).optional(),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  country: z.string().length(2).default("US"),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  preferredPaymentMethod: z.enum(["BANK_TRANSFER", "CHECK", "WIRE_TRANSFER", "ACH", "CREDIT_CARD"]),
  contacts: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    isPrimary: z.boolean().default(false),
  })).min(1, "At least one contact required"),
});
```

---

## 6.4 Business Rules

1. **Vendor Code Generation**: Auto-incremented `VND-XXXX` format
2. **Duplicate Prevention**: Check for existing vendors by tax ID and company name before creation
3. **Status Transitions**: 
   - `PENDING_APPROVAL` → `ACTIVE` (requires FINANCE_ADMIN approval)
   - `ACTIVE` → `ON_HOLD` → `ACTIVE` (can toggle)
   - `ACTIVE` → `BLACKLISTED` (requires SUPER_ADMIN)
   - `ACTIVE` → `INACTIVE` (soft deactivate)
4. **Contract Alerts**: System generates notifications 30 days before contract expiry
5. **Compliance Blocking**: Vendors with expired compliance documents are flagged and optionally blocked from new POs
6. **Rating Calculation**: Overall vendor rating = weighted average of all quarterly ratings (recent ratings weighted more heavily)
7. **Deletion Rules**: Vendors with active invoices or contracts cannot be deleted, only deactivated
