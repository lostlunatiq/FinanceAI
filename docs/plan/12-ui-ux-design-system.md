# 12 — UI/UX Design System

## 12.1 Design Philosophy

FinanceAI follows a **professional, modern, and data-rich** design language that prioritizes:
- **Clarity**: Financial data must be immediately scannable and unambiguous
- **Efficiency**: Common workflows should require minimal clicks
- **Trust**: The design should instill confidence and professionalism
- **Consistency**: Uniform patterns across all modules
- **Accessibility**: WCAG 2.1 AA compliance

---

## 12.2 Design Tokens

### Color System

**Primary Palette (Indigo):**
```css
--color-primary-50:  #eef2ff;
--color-primary-100: #e0e7ff;
--color-primary-200: #c7d2fe;
--color-primary-300: #a5b4fc;
--color-primary-400: #818cf8;
--color-primary-500: #6366f1;  /* Primary */
--color-primary-600: #4f46e5;
--color-primary-700: #4338ca;
--color-primary-800: #3730a3;
--color-primary-900: #312e81;
--color-primary-950: #1e1b4b;
```

**Semantic Colors:**
```css
/* Success (Emerald) */
--color-success-50:  #ecfdf5;
--color-success-500: #10b981;
--color-success-700: #047857;

/* Warning (Amber) */
--color-warning-50:  #fffbeb;
--color-warning-500: #f59e0b;
--color-warning-700: #b45309;

/* Danger (Rose) */
--color-danger-50:   #fff1f2;
--color-danger-500:  #f43f5e;
--color-danger-700:  #be123c;

/* Info (Sky) */
--color-info-50:     #f0f9ff;
--color-info-500:    #0ea5e9;
--color-info-700:    #0369a1;
```

**Neutral Palette (Slate):**
```css
--color-gray-50:  #f8fafc;   /* Page background */
--color-gray-100: #f1f5f9;   /* Card background alt */
--color-gray-200: #e2e8f0;   /* Borders */
--color-gray-300: #cbd5e1;   /* Disabled */
--color-gray-400: #94a3b8;   /* Placeholder text */
--color-gray-500: #64748b;   /* Secondary text */
--color-gray-600: #475569;   /* Body text */
--color-gray-700: #334155;   /* Headings */
--color-gray-800: #1e293b;   /* Primary text */
--color-gray-900: #0f172a;   /* Sidebar background (dark) */
--color-gray-950: #020617;   /* Deepest dark */
```

### Typography

**Font Stack:**
```css
/* Primary: Inter (from Google Fonts) */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace: JetBrains Mono (for numbers, codes) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Type Scale:**
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 16px | Labels, captions, metadata |
| `text-sm` | 14px | 400 | 20px | Table cells, secondary text |
| `text-base` | 16px | 400 | 24px | Body text, form inputs |
| `text-lg` | 18px | 500 | 28px | Card titles, section labels |
| `text-xl` | 20px | 600 | 28px | Page subtitles |
| `text-2xl` | 24px | 700 | 32px | Page titles |
| `text-3xl` | 30px | 700 | 36px | Dashboard metrics |
| `text-4xl` | 36px | 800 | 40px | Hero numbers (KPIs) |

**Number Display Rule:**
All monetary values and quantities should use the monospace font (`font-mono`) for perfect column alignment in tables.

### Spacing Scale
```css
--space-0:  0px;
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Border Radius
```css
--radius-sm:   4px;    /* Buttons, inputs */
--radius-md:   8px;    /* Cards */
--radius-lg:   12px;   /* Modals, large cards */
--radius-xl:   16px;   /* Feature cards */
--radius-full: 9999px; /* Avatars, badges, pills */
```

### Shadows
```css
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

---

## 12.3 Component Library (shadcn/ui)

### Core Components to Install

```bash
npx shadcn-ui@latest add button card input label select textarea
npx shadcn-ui@latest add dialog sheet drawer
npx shadcn-ui@latest add dropdown-menu context-menu
npx shadcn-ui@latest add table badge avatar
npx shadcn-ui@latest add tabs accordion
npx shadcn-ui@latest add toast sonner
npx shadcn-ui@latest add calendar date-picker
npx shadcn-ui@latest add command combobox
npx shadcn-ui@latest add popover tooltip
npx shadcn-ui@latest add progress skeleton
npx shadcn-ui@latest add separator scroll-area
npx shadcn-ui@latest add switch checkbox radio-group
npx shadcn-ui@latest add form
npx shadcn-ui@latest add pagination
npx shadcn-ui@latest add breadcrumb
npx shadcn-ui@latest add alert alert-dialog
```

### Custom Business Components

Beyond shadcn/ui base components, build these custom components:

#### DataTable
- Built on TanStack Table + shadcn table
- Features: Sorting, filtering, pagination, row selection, column visibility toggle
- Sticky header on scroll
- Row hover highlight
- Click-to-expand for detail view
- Export button (CSV/Excel)
- Column resize (optional)

#### KPICard
```
┌─────────────────────────────┐
│ 📊 Total Expenses           │
│                              │
│ $1,250,000                   │  ← text-3xl font-mono
│ ↑ 12.5% vs last quarter     │  ← text-sm text-success
│                              │
│ ▃▄▅▆▇▇▆▅▃▄▅▆  (sparkline)  │  ← Recharts sparkline
└──────────────────────────────┘
```

#### StatusBadge
Consistent status indicators across all modules:
- Rounded pill shape
- Color-coded by status category:
  - Gray: Draft, Inactive, Cancelled
  - Blue: Submitted, Processing, Pending
  - Amber: Under Review, Pending Approval, Warning
  - Green: Active, Approved, Paid, Completed
  - Red: Rejected, Overdue, Failed, Blacklisted
  - Purple: Reimbursed, Special states

#### CurrencyDisplay
- Formatted with locale-aware number formatting
- Currency symbol
- Monospace font
- Negative values in red with parentheses: `($1,250.00)`
- Abbreviation for large numbers: `$1.2M`

#### ApprovalActions
- Approve (green), Reject (red), Request Changes (amber) buttons
- Comment textarea (required for reject/request changes)
- Confirmation dialog before action

#### FileUpload
- Drag and drop zone with dashed border
- File type validation
- Size limit display
- Upload progress bar
- Preview for images
- Remove button

---

## 12.4 Page Layouts

### Dashboard Layout (Authenticated Pages)
```
┌─────────────────────────────────────────────────────────────────┐
│                      HEADER BAR (h-16)                          │
│  [☰ Toggle]  [🔍 Search...]             [🔔 3] [👤 Jane ▼]    │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ SIDEBAR  │           MAIN CONTENT AREA                          │
│ (w-64)   │           (flex-1, p-6)                              │
│          │                                                      │
│ Dashboard│  ┌── Page Header ──────────────────────────────┐     │
│ Vendors  │  │ Breadcrumb: Dashboard > Vendors              │     │
│ Expenses │  │ Title: Vendor Management                     │     │
│ Invoices │  │ [+ Add Vendor]  [Export ↓]  [Filter ≡]      │     │
│ Budgets  │  └──────────────────────────────────────────────┘     │
│ Reports  │                                                      │
│ Audit    │  ┌── Content ──────────────────────────────────┐     │
│ ──────   │  │                                              │     │
│ Settings │  │  (Module-specific content)                   │     │
│          │  │                                              │     │
│          │  └──────────────────────────────────────────────┘     │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Sidebar Design
```
┌──────────────────────────┐
│  ◇ FinanceAI             │  ← Logo + app name
│                          │
│  ▸ 📊 Dashboard          │
│  ▸ 🏢 Vendors     (48)   │  ← Badge with count
│  ▸ 💳 Expenses    (12)   │  ← Badge for pending
│  ▸ 📄 Invoices    (5)    │  ← Badge for action needed
│  ▸ 💰 Budgets            │
│  ▸ 📈 Reports            │
│  ▸ 🔍 Audit              │
│  ────────────────────    │
│  ▸ ⚙️ Settings           │
│                          │
│  ────────────────────    │
│  👤 Jane Manager         │
│     Finance Dept         │
│  [Profile] [Logout]      │
└──────────────────────────┘
```

**Sidebar Behavior:**
- Collapsible to icon-only mode (w-16)
- Active item highlighted with primary color
- Nested items expand on click
- Mobile: Sheet/drawer overlay
- Hover tooltips in collapsed mode

### Header Design
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [☰]  FinanceAI         [🔍 Search anything... ⌘K]    [🔔 3] [👤 ▼]   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Header Features:**
- Command palette search (Cmd+K / Ctrl+K) for global search
- Notification bell with badge count
- User avatar with dropdown: Profile, Settings, Theme toggle, Logout
- Breadcrumb trail below header

---

## 12.5 Responsive Breakpoints

| Breakpoint | Min Width | Layout |
|------------|-----------|--------|
| Mobile | 0px | Single column, bottom nav, no sidebar |
| Tablet | 768px | Collapsed sidebar, responsive grid |
| Desktop | 1024px | Full sidebar, multi-column layouts |
| Wide | 1280px | Extended layouts, side panels |
| Ultra-wide | 1536px | Max content width with centering |

**Mobile-Specific Adaptations:**
- Sidebar becomes bottom tab bar or hamburger drawer
- Tables become card lists
- Multi-column forms become single column
- Charts resize with scrollable container
- Action buttons become bottom fixed bar

---

## 12.6 Animation & Transitions

```css
/* Default transition */
--transition-default: 150ms ease-in-out;

/* Sidebar expand/collapse */
--transition-sidebar: 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Modal/Dialog enter */
--transition-dialog: 200ms cubic-bezier(0.16, 1, 0.3, 1);

/* Page transitions */
--transition-page: 200ms ease-out;

/* Toast notifications */
--transition-toast: 400ms cubic-bezier(0.21, 1.02, 0.73, 1);
```

**Micro-animations:**
- Button hover: slight scale + brightness
- Card hover: subtle shadow elevation
- Status badge: subtle pulse on new status
- KPI numbers: count-up animation on load
- Chart data: staggered entrance animation
- Table row hover: background highlight
- Sidebar item: slide-in icon + text

---

## 12.7 Dark Mode Support

The application should support light and dark themes:

**Dark Mode Colors:**
```css
/* Dark mode overrides */
.dark {
  --bg-primary: #0f172a;      /* Page background */
  --bg-secondary: #1e293b;    /* Card background */
  --bg-tertiary: #334155;     /* Input/table row background */
  --text-primary: #f8fafc;    /* Primary text */
  --text-secondary: #94a3b8;  /* Secondary text */
  --border-color: #334155;    /* Borders */
}
```

**Theme Toggle:**
- Toggle in header user menu
- Persisted in localStorage
- System preference detection on first visit
- Smooth transition between themes

---

## 12.8 Form Design Guidelines

### Form Layout Rules
1. **Labels**: Always above inputs (not inline) for accessibility
2. **Required fields**: Marked with red asterisk (*)
3. **Help text**: Muted text below input for context
4. **Error messages**: Red text below input, icon prefix
5. **Grouping**: Related fields grouped in sections with headers
6. **Actions**: Primary action right-aligned, Cancel left

### Form States
```
Normal:   Border: gray-300, Background: white
Focus:    Border: primary-500, Ring: primary-200 (2px)
Error:    Border: danger-500, Ring: danger-200 (2px), Error text below
Disabled: Background: gray-100, Text: gray-400, Cursor: not-allowed
Success:  Border: success-500, Checkmark icon
```

---

## 12.9 Table Design Guidelines

### Table Styling
- **Header**: Sticky, gray-50 background, font-semibold, uppercase text-xs
- **Rows**: Alternating white/gray-50 (subtle stripe), hover highlight
- **Borders**: Horizontal only (no vertical borders for cleaner look)
- **Density**: Comfortable (py-4) by default, compact mode toggle (py-2)
- **Pagination**: Bottom-right, show total count
- **Empty State**: Illustration + message + CTA button
- **Loading State**: Skeleton rows matching table structure

### Number Formatting in Tables
- Use monospace font for numbers
- Right-align monetary values
- Use locale-appropriate formatting (commas, decimals)
- Color-code negative values (red with parentheses)

---

## 12.10 Iconography

**Icon Library: Lucide React**

| Context | Icons Used |
|---------|-----------|
| Navigation | LayoutDashboard, Building2, CreditCard, FileText, Wallet, BarChart3, FileSearch, Settings |
| Actions | Plus, PencilLine, Trash2, Download, Upload, Check, X, ChevronRight |
| Status | CheckCircle2, AlertCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight |
| Finance | DollarSign, TrendingUp, TrendingDown, PieChart, Receipt, Banknote |
| Communication | Bell, MessageSquare, Mail, Phone |
| Users | User, Users, UserPlus, Shield |

---

## 12.11 Loading & Empty States

### Loading States
- **Page load**: Full-height skeleton matching page structure
- **Table load**: Skeleton rows (5-10 rows of animated bars)
- **Chart load**: Gray container with pulsing arc
- **Button load**: Spinner icon replacing button text + disabled state

### Empty States
Each empty state should include:
1. Relevant illustration or icon (large, muted)
2. Descriptive heading ("No expenses yet")
3. Supporting text ("Submit your first expense to get started")
4. CTA button ("+ Create Expense")
