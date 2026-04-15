# 09 — Budget Management Module

## 9.1 Module Overview

The Budget Management module enables financial planning, allocation, tracking, and forecasting at the department and project level. It provides real-time visibility into budget utilization, variance analysis, and proactive alerts when spending approaches thresholds.

---

## 9.2 Feature Breakdown

### 9.2.1 Budget Overview Dashboard

**Budget Overview Page** (`/budgets`)
```
┌─────────────────────────────────────────────────────────────────────┐
│                    BUDGET MANAGEMENT - FY 2026                      │
│─────────────────────────────────────────────────────────────────────│
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │Total Budget   │ │  Allocated   │ │    Spent     │ │ Remaining  │ │
│  │ $2,500,000   │ │ $2,350,000   │ │ $1,620,000   │ │  $880,000  │ │
│  │              │ │   94.0%      │ │   64.8%      │ │   35.2%    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                      │
│  ┌── Budget Utilization by Department ──────────────────────────┐   │
│  │                                                               │   │
│  │  Engineering  ████████████████████████░░░░░░░░  72% ($360K)  │   │
│  │  Marketing    ██████████████████████████████░░░  85% ($255K) │   │
│  │  Operations   ████████████████░░░░░░░░░░░░░░░░  52% ($156K) │   │
│  │  HR           ████████████████████░░░░░░░░░░░░  62% ($93K)  │   │
│  │  Procurement  █████████████████████████████████  95% ($190K) │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Monthly Spend Trend (Bar + Line Chart) ────────────────────┐   │
│  │  [Bar chart: actual spend per month]                          │   │
│  │  [Line overlay: budgeted amount per month]                    │   │
│  │  [Months: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec]    │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Active Budgets ─────────────────────────────────────────────┐  │
│  │ Budget        │Dept│ Period │ Total   │ Spent  │ Util% │Status│  │
│  │ ENG-Q2-2026   │ENG │ Q2     │$500,000 │$342K   │ 68.4%│Active│  │
│  │ MKT-Q2-2026   │MKT │ Q2     │$300,000 │$255K   │ 85.0%│⚠ Warn│  │
│  │ OPS-H1-2026   │OPS │ H1     │$600,000 │$312K   │ 52.0%│Active│  │
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2.2 Budget Creation

**Create Budget Page** (`/budgets/new`)
- Form sections:

**Section 1: Budget Details**
```
Name:           [Engineering Q2 2026 Budget_____]
Department:     [▼ Engineering_________________ ]
Fiscal Year:    [▼ 2026_______________________ ]
Period:         [▼ Quarterly (◉ Monthly ○ Quarterly ○ Semi-Annual ○ Annual)]
Start Date:     [📅 2026-04-01  ]  (auto-calculated from period)
End Date:       [📅 2026-06-30  ]  (auto-calculated from period)
Total Amount:   [$500,000.00___]
Currency:       [▼ USD________]
```

**Section 2: Category Allocations**
```
┌── Budget Allocation Breakdown ─────────────────────────────────┐
│                                                                 │
│  Category              │ Allocation  │  % of Total  │ Actions  │
│  Software Licenses     │ [$150,000 ] │    30.0%     │  ✎ ✕    │
│  Hardware              │ [$100,000 ] │    20.0%     │  ✎ ✕    │
│  Professional Services │ [$120,000 ] │    24.0%     │  ✎ ✕    │
│  Travel                │ [$50,000  ] │    10.0%     │  ✎ ✕    │
│  Training              │ [$30,000  ] │     6.0%     │  ✎ ✕    │
│  Miscellaneous         │ [$50,000  ] │    10.0%     │  ✎ ✕    │
│                        [+ Add Category]                         │
│─────────────────────────────────────────────────────────────────│
│  Total Allocated: $500,000 (100.0%)                             │
│  Unallocated:     $0 (0%)                                       │
│  ✅ Fully allocated                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Section 3: Alert Thresholds**
```
Warning Threshold:  [80]% (amber alert when budget reaches this %)
Critical Threshold: [95]% (red alert when budget reaches this %)
Email Notifications: ☑ Department Head  ☑ Finance Admin  ☐ All department members
```

- Visual pie chart preview showing allocation breakdown
- Validation: Total allocations must equal budget total
- Submit for approval workflow (if required)

### 9.2.3 Budget Detail & Tracking

**Budget Detail Page** (`/budgets/[id]`)

**Header:**
- Budget name, code, department, period, status badge
- Progress bar showing utilization (green < 80%, amber 80-95%, red > 95%)
- Total / Spent / Remaining with variance

**Tabs:**

**Tab 1: Overview**
- Allocation vs. Spending donut chart
- Monthly spend trend area chart
- Top spending categories
- Recent transactions linked to this budget

**Tab 2: Allocations**
- Detailed allocation table with spent column
- Per-category progress bars
- Over/under budget indicators per category
- Reallocation form (move funds between categories)

**Tab 3: Transactions**
- All expenses and invoices charged against this budget
- Filterable by category, date, vendor
- Running balance column

**Tab 4: Variance Analysis**
```
┌── Budget vs. Actual Variance ────────────────────────────────────┐
│                                                                   │
│  Category              │ Budget   │ Actual  │ Variance │ Status  │
│  Software Licenses     │ $150,000 │ $125,000│ +$25,000 │ ✅ Under│
│  Hardware              │ $100,000 │ $95,000 │ +$5,000  │ ✅ Under│
│  Professional Services │ $120,000 │ $132,000│ -$12,000 │ ⚠ Over │
│  Travel                │ $50,000  │ $42,000 │ +$8,000  │ ✅ Under│
│  Training              │ $30,000  │ $28,000 │ +$2,000  │ ✅ Under│
│  Miscellaneous         │ $50,000  │ $20,000 │ +$30,000 │ ✅ Under│
│──────────────────────────────────────────────────────────────────│
│  TOTAL                 │ $500,000 │ $442,000│ +$58,000 │ ✅ Under│
│                                                                   │
│  [Grouped bar chart: Budget vs Actual by category]                │
│                                                                   │
│  Key Insights:                                                    │
│  ⚠ Professional Services is 10% over budget                      │
│  ✅ Overall budget is 11.6% under projected spend                 │
│  📊 Projected year-end spend at current rate: $1,768,000          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Tab 5: Forecast**
- Projected spend based on current trend
- Seasonal adjustment factors
- "What-if" scenario modeling

### 9.2.4 Budget Transfer

**Transfer Request:**
```
┌── Request Budget Transfer ────────────────────────────────┐
│                                                            │
│  From Budget: [▼ ENG-Q2-2026 (Remaining: $158,000)_____] │
│  To Budget:   [▼ MKT-Q2-2026 (Remaining: $45,000)______] │
│  Amount:      [$15,000.00_______________________________] │
│  Reason:      [Reallocating unused training budget to     │ 
│                marketing for Q2 campaign_______________]  │
│                                                            │
│  [Cancel]  [Submit Transfer Request]                      │
└────────────────────────────────────────────────────────────┘
```

- Requires Finance Admin approval
- Cannot transfer more than remaining budget
- Audit trail for all transfers
- Transfer history visible on both budgets

### 9.2.5 Budget Forecasting

**Forecasting Page** (`/budgets/forecasting`)
- Historical trend analysis (past 4 quarters)
- Linear projection for current period
- Seasonal adjustment based on historical patterns
- Department-level forecasting
- Scenario comparison: Best case / Expected / Worst case
- Recommendations based on spending patterns

**Forecast Visualization:**
- Area chart with confidence interval bands
- Projected vs. actual overlay
- Category-level breakdown projections
- Alert markers where projections exceed budget

---

## 9.3 Business Rules

1. **Budget Code Generation**: Auto-formatted as `BDG-{YEAR}-{PERIOD}-{DEPT}` (e.g., BDG-2026-Q2-ENG)
2. **Status Transitions**:
   ```
   DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → CLOSED
   ACTIVE → FROZEN (temporarily halt spending)
   FROZEN → ACTIVE (resume)
   ```
3. **Allocation Validation**: Sum of allocations must equal total budget amount
4. **Spending Tracking**: Expenses and invoices automatically debit the relevant budget
5. **Threshold Alerts**: 
   - Warning notification at 80% utilization
   - Critical notification at 95% utilization
   - Hard stop optional at 100% (configurable)
6. **Period Enforcement**: Budget can only be charged within its period dates
7. **Transfer Rules**:
   - Inter-department transfers require Finance Admin approval
   - Intra-department category reallocations require Department Manager approval
   - Maximum single transfer: 20% of source budget
8. **Rollover**: Unused budget does NOT automatically roll over (must be explicitly created)
9. **Fiscal Year**: Configurable (default: January-December)
10. **Currency**: Single currency per budget (conversion handled at expense/invoice level)
