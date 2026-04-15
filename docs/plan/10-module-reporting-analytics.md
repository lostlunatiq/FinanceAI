# 10 — Reporting & Analytics Module

## 10.1 Module Overview

The Reporting & Analytics module provides comprehensive financial insights through an executive dashboard, pre-built reports, a custom report builder, and data export capabilities. It enables data-driven decision making at every organizational level.

---

## 10.2 Feature Breakdown

### 10.2.1 Executive Dashboard

**Main Dashboard Page** (`/dashboard`)

This is the landing page after login. It's role-scoped:
- **Executive**: Full organizational view with strategic KPIs
- **Finance Manager**: Department-scoped with operational KPIs
- **Employee**: Personal expense summary + team metrics

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FinanceAI Dashboard                              │
│  Welcome back, Jane | Last login: Apr 14, 2026 3:45 PM                  │
│─────────────────────────────────────────────────────────────────────────│
│                                                                          │
│  ┌─── Quick Action Cards ───────────────────────────────────────────┐   │
│  │ ⏰ 12 Pending     │ 📄 5 Overdue      │ ⚠️ 3 Budget    │ 🔔 8    │   │
│  │    Approvals      │    Invoices       │    Alerts      │ Notifs  │   │
│  │    [Review →]     │    [$45,000]      │    [View →]    │         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─── Financial Overview KPIs ──────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  Total Expenses    │  Total Invoices   │  Budget Util.  │ Cash   │   │
│  │  $1,250,000        │  $890,000         │  68.5%         │ Flow   │   │
│  │  ↑ 12% vs last Q   │  ↓ 3% vs last Q  │  On track      │ $2.1M  │   │
│  │  [Sparkline chart]  │  [Sparkline]      │  [Progress]    │ [Line] │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─── Charts Row ──────────────────────────────────────────────────┐    │
│  │ ┌── Monthly Spend Trend ─────┐  ┌── Expense by Category ─────┐ │   │
│  │ │  [Area chart with gradient  │  │  [Donut chart showing      │ │   │
│  │ │   showing 12-month trend    │  │   category breakdown with  │ │   │
│  │ │   with budget line overlay] │  │   legend and percentages]  │ │   │
│  │ └────────────────────────────┘  └─────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─── Second Charts Row ───────────────────────────────────────────┐    │
│  │ ┌── Top 10 Vendors by Spend ─┐  ┌── Budget vs Actual ────────┐ │   │
│  │ │  [Horizontal bar chart     │  │  [Grouped bar chart by     │ │   │
│  │ │   sorted by total spend    │  │   department showing       │ │   │
│  │ │   with vendor names]       │  │   budget vs actual]        │ │   │
│  │ └────────────────────────────┘  └─────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─── Recent Activity ─────────┐  ┌── Upcoming Deadlines ───────┐      │
│  │ • EXP-0042 approved by Jane │  │ • 3 invoices due this week  │      │
│  │ • INV-0098 submitted        │  │ • 2 contracts expiring      │      │
│  │ • VND-0015 onboarded        │  │ • Q2 budget review due      │      │
│  │ • BDG-Q2-ENG 80% threshold  │  │ • 5 pending reimbursements  │      │
│  │ [View all activity →]       │  │ [View all →]                │      │
│  └─────────────────────────────┘  └──────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dashboard KPI Cards:**
| KPI | Calculation | Visualization |
|-----|-------------|---------------|
| Total Expenses (MTD) | Sum of approved+reimbursed expenses this month | Number + sparkline + % change |
| Total Invoice Volume | Sum of invoices this month | Number + sparkline + % change |
| Budget Utilization | (Total Spent / Total Budget) × 100 | Circular progress gauge |
| Pending Approvals | Count of items awaiting current user's approval | Number with action link |
| Overdue Invoices | Count + sum of invoices past due date | Number + amount (red) |
| Vendor Count | Active vendors | Number |
| Cash Flow Projection | Net income - outgoing payments | Line chart |
| Average Processing Time | Mean time from invoice receipt to payment | Number in days |

### 10.2.2 Pre-Built Reports

**Report Hub Page** (`/reports`)
```
┌── Report Library ──────────────────────────────────────────────────┐
│                                                                     │
│  [🔍 Search reports...]                                            │
│                                                                     │
│  📊 Financial Reports                                               │
│  ├── Expense Summary Report                                        │
│  ├── Invoice Aging Report                                          │
│  ├── Payment History Report                                         │
│  ├── Cash Flow Statement                                           │
│  └── Profit & Loss Summary                                         │
│                                                                     │
│  🏢 Vendor Reports                                                  │
│  ├── Vendor Spend Analysis                                          │
│  ├── Vendor Performance Scorecard                                   │
│  ├── Contract Expiry Report                                        │
│  └── Compliance Status Report                                      │
│                                                                     │
│  💰 Budget Reports                                                  │
│  ├── Budget vs. Actual Variance Report                             │
│  ├── Department Spend Report                                       │
│  ├── Budget Utilization Trending                                   │
│  └── Forecast vs. Actual Report                                    │
│                                                                     │
│  🔍 Audit Reports                                                   │
│  ├── User Activity Report                                          │
│  ├── Approval Workflow Report                                      │
│  └── Data Change Audit Report                                      │
│                                                                     │
│  ✨ [Build Custom Report →]                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Pre-Built Report Specifications:**

#### Report 1: Expense Summary Report
- **Filters**: Date range, department, category, status, employee
- **Data**: Expense count, total amount, average amount, by category/department/month
- **Charts**: Bar chart (by category), line chart (monthly trend), pie chart (by department)
- **Export**: PDF, Excel, CSV

#### Report 2: Vendor Spend Analysis
- **Filters**: Date range, vendor, industry, payment method
- **Data**: Spend per vendor, invoice count, avg payment time, trend
- **Charts**: Horizontal bar (top vendors), treemap (spend distribution), line (trend)
- **Export**: PDF, Excel, CSV

#### Report 3: Budget Variance Report
- **Filters**: Fiscal year, period, department
- **Data**: Budget vs actual by category, variance %, over/under flags
- **Charts**: Grouped bar (budget vs actual), waterfall (variance), gauge (utilization)
- **Export**: PDF, Excel, CSV

#### Report 4: Invoice Aging Report
- **Filters**: Date range, vendor, age bucket
- **Data**: Invoice count and amount by aging bucket, by vendor
- **Charts**: Stacked bar (aging by vendor), area (aging trend), summary table
- **Export**: PDF, Excel, CSV

### 10.2.3 Custom Report Builder

**Report Builder Page** (`/reports/builder`)

```
┌── Custom Report Builder ──────────────────────────────────────────────┐
│                                                                        │
│  ┌── Step 1: Data Source ──────────────────────────────────────────┐  │
│  │ Select data source:                                              │  │
│  │ ◉ Expenses  ○ Invoices  ○ Vendors  ○ Budgets  ○ Combined       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Step 2: Select Fields ───────────────────────────────────────┐  │
│  │ Available Fields:          Selected Fields (drag to reorder):   │  │
│  │ □ Expense Number           ☑ Department        ↕               │  │
│  │ ☑ Title                    ☑ Category           ↕               │  │
│  │ ☑ Amount                   ☑ Amount             ↕               │  │
│  │ □ Expense Date             ☑ Title              ↕               │  │
│  │ ☑ Category                 ☑ Status             ↕               │  │
│  │ ☑ Department                                                    │  │
│  │ ☑ Status                                                        │  │
│  │ □ Submitted By                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Step 3: Filters ────────────────────────────────────────────┐   │
│  │ [+ Add Filter]                                                 │   │
│  │                                                                 │   │
│  │ Date Range:   [📅 2026-01-01] to [📅 2026-03-31]              │   │
│  │ Status:       [▼ Approved, Reimbursed____________]             │   │
│  │ Department:   [▼ All departments_________________]             │   │
│  │ Amount:       Min [$____] Max [$____]                          │   │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Step 4: Grouping & Aggregation ──────────────────────────────┐  │
│  │ Group By:   [▼ Department] then [▼ Category]                   │  │
│  │ Aggregate:  [▼ Sum of Amount]                                  │  │
│  │ Sort By:    [▼ Amount (Desc)]                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Step 5: Visualization ──────────────────────────────────────┐   │
│  │ ○ Table Only  ◉ Table + Chart  ○ Chart Only                   │   │
│  │ Chart Type: [▼ Bar Chart]                                      │   │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Preview Report]  [Save Report Template]  [Export →]                  │
│                                                                        │
│  ┌── Report Preview ──────────────────────────────────────────────┐  │
│  │  [Live preview of the report with selected options]             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 10.2.4 Export Capabilities

**Supported Export Formats:**

| Format | Use Case | Library |
|--------|----------|---------|
| **PDF** | Formal reports with charts, headers, and branding | `@react-pdf/renderer` or `puppeteer` |
| **Excel (XLSX)** | Data analysis with multiple sheets, formulas | `exceljs` or `xlsx` |
| **CSV** | Raw data export for external tools | Built-in |

**PDF Report Template:**
```
┌─────────────────────────────────────────────┐
│  [Company Logo]    FINANCEAI REPORT          │
│                    Generated: Apr 15, 2026    │
│─────────────────────────────────────────────│
│                                              │
│  Report Title: Expense Summary Q1 2026       │
│  Generated By: Jane Manager                  │
│  Department: All Departments                 │
│  Period: Jan 1, 2026 - Mar 31, 2026         │
│                                              │
│  EXECUTIVE SUMMARY                           │
│  Total Expenses: $1,250,000                  │
│  Total Approved: $1,180,000                  │
│  Average Expense: $1,520                     │
│                                              │
│  [Charts embedded in PDF]                    │
│                                              │
│  DETAILED BREAKDOWN                          │
│  [Data table]                                │
│                                              │
│─────────────────────────────────────────────│
│  Page 1 of 5 | Confidential                 │
└─────────────────────────────────────────────┘
```

### 10.2.5 Scheduled Reports

**Schedule Configuration:**
```typescript
{
  reportTemplateId: "uuid",
  schedule: "WEEKLY",              // DAILY, WEEKLY, MONTHLY, QUARTERLY
  dayOfWeek: "MONDAY",            // For weekly
  dayOfMonth: 1,                   // For monthly
  time: "08:00",                   // UTC
  format: "PDF",
  recipients: ["email1@co.com", "email2@co.com"],
  enabled: true,
  lastRunAt: "2026-04-08T08:00:00Z",
  nextRunAt: "2026-04-15T08:00:00Z"
}
```

---

## 10.3 Chart Specifications

### Chart Library: Recharts

All charts should use the Recharts library with consistent styling:

**Color Palette for Charts:**
```typescript
const CHART_COLORS = {
  primary: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  secondary: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'],
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  neutral: ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'],
  categorical: ['#6366f1', '#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#f97316', '#ec4899', '#14b8a6'],
};
```

**Chart Types Used:**
| Chart Type | Recharts Component | Used For |
|------------|-------------------|----------|
| Area Chart | `<AreaChart>` | Monthly spend trends, cash flow |
| Bar Chart | `<BarChart>` | Category comparison, budget vs actual |
| Horizontal Bar | `<BarChart layout="vertical">` | Top vendors by spend |
| Donut Chart | `<PieChart>` with inner radius | Category breakdown, status distribution |
| Line Chart | `<LineChart>` | Trend analysis, forecasting |
| Stacked Bar | `<BarChart>` with stacked bars | Aging buckets, multi-category |
| Treemap | `<Treemap>` | Spend distribution |
| Radar | `<RadarChart>` | Vendor performance rating |

**Chart Wrapper Component:**
Every chart should be wrapped in a `ChartCard` component providing:
- Title and subtitle
- Legend toggle
- Fullscreen expand option
- Data refresh button
- Export chart as image
- Tooltip on hover with formatted values
- Responsive container that adapts to card size

---

## 10.4 Dashboard Widget Configuration

The dashboard should support configurable widgets:

**Available Widgets:**
| Widget | Size | Data Source |
|--------|------|-------------|
| KPI Card | 1×1 | Any metric |
| Expense by Category | 2×2 | Expenses |
| Monthly Spend Trend | 2×2 | Expenses + Invoices |
| Budget Utilization Bars | 2×2 | Budgets |
| Top Vendors | 2×2 | Vendors + Invoices |
| Aging Summary | 2×1 | Invoices |
| Recent Activity | 1×2 | Audit Log |
| Pending Actions | 1×2 | Approvals |
| Contract Calendar | 2×2 | Contracts |
| Cash Flow Projection | 2×2 | Invoices + Payments |

---

## 10.5 Business Rules

1. **Data Freshness**: Dashboard data refreshes every 60 seconds (configurable)
2. **Role-Based Dashboard**: Widget visibility based on user role
3. **Date Defaults**: All date ranges default to current fiscal quarter
4. **Comparative Periods**: % change always compared to same period last year or previous period
5. **Export Audit**: All report exports are logged in the audit trail
6. **Data Scope**: Reports respect RBAC — users can only see data they have permission to access
7. **Report Templates**: Users can save custom report configurations for reuse
8. **Drill-Down**: Every chart/metric should be clickable to drill into underlying data
9. **Responsive Charts**: All charts must resize properly on mobile/tablet screens
10. **Large Dataset Handling**: Reports with > 10,000 rows should use server-side pagination and progressive loading
