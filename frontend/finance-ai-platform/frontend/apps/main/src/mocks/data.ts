// ============================================================================
// Mock fixtures used when no backend is connected. All IDs/names/amounts are
// fabricated; GSTINs follow the correct regex shape but are not real. All
// amounts are in INR unless marked otherwise.
// ============================================================================

import type {
  Vendor,
  Invoice,
  InvoiceLineItem,
  ApprovalStep,
  Payment,
  Budget,
  ApprovalPolicy,
  AuditLogEntry,
  CashflowProjection,
  AgeingBucket,
  FxExposure
} from '@finance-ai/core'

const TENANT = 'mock-tenant'

export const mockVendors: Vendor[] = [
  {
    id: 'v1', tenantId: TENANT,
    legalName: 'Tata Consultancy Services Ltd',
    displayName: 'TCS',
    gstin: '27AAACT2727Q1ZW', pan: 'AAACT2727Q',
    country: 'IN', defaultCurrency: 'INR',
    email: 'ap@tcs.com', phone: '+91 22 6778 9999',
    paymentTerms: 45, category: 'IT Services',
    riskScore: 8, status: 'active',
    createdAt: '2024-06-01', updatedAt: '2025-11-12'
  },
  {
    id: 'v2', tenantId: TENANT,
    legalName: 'Godrej Industries Ltd',
    displayName: 'Godrej Industries',
    gstin: '27AAACG1099H1ZS', pan: 'AAACG1099H',
    country: 'IN', defaultCurrency: 'INR',
    email: 'accounts@godrej.com',
    paymentTerms: 30, category: 'Manufacturing',
    riskScore: 15, status: 'active',
    createdAt: '2024-08-12', updatedAt: '2026-01-04'
  },
  {
    id: 'v3', tenantId: TENANT,
    legalName: 'Amazon Web Services India Pvt Ltd',
    displayName: 'AWS India',
    gstin: '29AAICA1234L1Z3', pan: 'AAICA1234L',
    country: 'IN', defaultCurrency: 'INR',
    email: 'india-billing@amazon.com',
    paymentTerms: 30, category: 'Cloud Services',
    riskScore: 5, status: 'active',
    createdAt: '2024-02-20', updatedAt: '2026-02-10'
  },
  {
    id: 'v4', tenantId: TENANT,
    legalName: 'Deloitte Haskins & Sells LLP',
    displayName: 'Deloitte',
    gstin: '27AAAFD1234K1ZD', pan: 'AAAFD1234K',
    country: 'IN', defaultCurrency: 'INR',
    email: 'inservices@deloitte.com',
    paymentTerms: 45, category: 'Professional Services',
    riskScore: 12, status: 'active',
    createdAt: '2023-11-08', updatedAt: '2026-03-18'
  },
  {
    id: 'v5', tenantId: TENANT,
    legalName: 'NewVendor Logistics Pvt Ltd',
    displayName: 'NewVendor Logistics',
    gstin: '07AAACN7890L1ZQ', pan: 'AAACN7890L',
    country: 'IN', defaultCurrency: 'INR',
    email: 'billing@nvlogistics.in',
    paymentTerms: 15, category: 'Logistics',
    riskScore: 62, status: 'pending_verification',
    createdAt: '2026-03-10', updatedAt: '2026-03-10'
  }
]

const lineItemsFor = (invoiceId: string): InvoiceLineItem[] => [
  {
    id: `${invoiceId}-l1`, invoiceId, lineNo: 1,
    description: 'Professional services — March 2026',
    quantity: 1, unitPrice: 450000, taxRate: 18, lineTotal: 531000
  },
  {
    id: `${invoiceId}-l2`, invoiceId, lineNo: 2,
    description: 'On-site engineering hours',
    quantity: 40, unitPrice: 6500, taxRate: 18, lineTotal: 306800
  }
]

export const mockInvoices: Invoice[] = [
  {
    id: 'i1', tenantId: TENANT, vendorId: 'v1', vendorName: 'TCS',
    invoiceNumber: 'TCS-26-00481', issueDate: '2026-04-02', dueDate: '2026-05-17',
    currency: 'INR', subtotal: 710000, taxAmount: 127800, totalAmount: 837800,
    fxRateToBase: 1, baseTotal: 837800,
    status: 'l2_review', fraudScore: 12, fraudFlags: [],
    submittedBy: 'mock-l1_finance_employee', submittedAt: '2026-04-03T09:10:00Z',
    currentAssignee: 'mock-l2_finance_head',
    createdAt: '2026-04-02', updatedAt: '2026-04-05',
    lineItems: lineItemsFor('i1')
  },
  {
    id: 'i2', tenantId: TENANT, vendorId: 'v2', vendorName: 'Godrej Industries',
    invoiceNumber: 'GODR/26/1044', issueDate: '2026-03-28', dueDate: '2026-04-27',
    currency: 'INR', subtotal: 212000, taxAmount: 38160, totalAmount: 250160,
    fxRateToBase: 1, baseTotal: 250160,
    status: 'l1_review', fraudScore: 28, fraudFlags: [],
    submittedBy: 'v2', submittedAt: '2026-03-29T12:00:00Z',
    currentAssignee: 'mock-l1_finance_employee',
    createdAt: '2026-03-28', updatedAt: '2026-03-29',
    lineItems: lineItemsFor('i2')
  },
  {
    id: 'i3', tenantId: TENANT, vendorId: 'v3', vendorName: 'AWS India',
    invoiceNumber: 'AWSIN-2026-0315', issueDate: '2026-03-31', dueDate: '2026-04-30',
    currency: 'USD', subtotal: 52000, taxAmount: 0, totalAmount: 52000,
    fxRateToBase: 83.4, baseTotal: 4336800,
    status: 'cfo_review', fraudScore: 8, fraudFlags: [],
    submittedBy: 'mock-l1_finance_employee', submittedAt: '2026-04-01T07:20:00Z',
    currentAssignee: 'mock-cfo',
    createdAt: '2026-03-31', updatedAt: '2026-04-04',
    lineItems: [
      {
        id: 'i3-l1', invoiceId: 'i3', lineNo: 1,
        description: 'AWS cloud consumption — March 2026 (EC2, S3, RDS)',
        quantity: 1, unitPrice: 52000, taxRate: 0, lineTotal: 52000
      }
    ]
  },
  {
    id: 'i4', tenantId: TENANT, vendorId: 'v5', vendorName: 'NewVendor Logistics',
    invoiceNumber: 'NVL-000041', issueDate: '2026-04-10', dueDate: '2026-04-17',
    currency: 'INR', subtotal: 800000, taxAmount: 144000, totalAmount: 944000,
    fxRateToBase: 1, baseTotal: 944000,
    status: 'l1_review', fraudScore: 74,
    fraudFlags: ['new_vendor_high_amount', 'rush_payment', 'round_amount'],
    submittedBy: 'v5', submittedAt: '2026-04-10T22:30:00Z',
    currentAssignee: 'mock-l1_finance_employee',
    createdAt: '2026-04-10', updatedAt: '2026-04-10',
    lineItems: lineItemsFor('i4')
  },
  {
    id: 'i5', tenantId: TENANT, vendorId: 'v4', vendorName: 'Deloitte',
    invoiceNumber: 'DEL-IN-0039', issueDate: '2026-02-25', dueDate: '2026-04-11',
    currency: 'INR', subtotal: 1240000, taxAmount: 223200, totalAmount: 1463200,
    fxRateToBase: 1, baseTotal: 1463200,
    status: 'approved', fraudScore: 18, fraudFlags: [],
    submittedBy: 'mock-l1_finance_employee', submittedAt: '2026-02-26T10:00:00Z',
    createdAt: '2026-02-25', updatedAt: '2026-03-12',
    lineItems: lineItemsFor('i5')
  },
  {
    id: 'i6', tenantId: TENANT, vendorId: 'v1', vendorName: 'TCS',
    invoiceNumber: 'TCS-26-00412', issueDate: '2026-02-02', dueDate: '2026-03-19',
    currency: 'INR', subtotal: 610000, taxAmount: 109800, totalAmount: 719800,
    fxRateToBase: 1, baseTotal: 719800,
    status: 'paid', fraudScore: 9, fraudFlags: [],
    submittedBy: 'mock-l1_finance_employee', submittedAt: '2026-02-03T09:00:00Z',
    createdAt: '2026-02-02', updatedAt: '2026-03-20',
    lineItems: lineItemsFor('i6')
  },
  {
    id: 'i7', tenantId: TENANT, vendorId: 'v2', vendorName: 'Godrej Industries',
    invoiceNumber: 'GODR/26/0987', issueDate: '2026-03-05', dueDate: '2026-04-04',
    currency: 'INR', subtotal: 92000, taxAmount: 16560, totalAmount: 108560,
    fxRateToBase: 1, baseTotal: 108560,
    status: 'rejected', fraudScore: 42, fraudFlags: ['duplicate_invoice'],
    submittedBy: 'v2', submittedAt: '2026-03-06T11:00:00Z',
    createdAt: '2026-03-05', updatedAt: '2026-03-08',
    lineItems: lineItemsFor('i7')
  },
  {
    id: 'i8', tenantId: TENANT, vendorId: 'v3', vendorName: 'AWS India',
    invoiceNumber: 'AWSIN-2026-0214', issueDate: '2026-02-28', dueDate: '2026-03-30',
    currency: 'USD', subtotal: 48200, taxAmount: 0, totalAmount: 48200,
    fxRateToBase: 83.2, baseTotal: 4010240,
    status: 'paid', fraudScore: 7, fraudFlags: [],
    submittedBy: 'mock-l1_finance_employee', submittedAt: '2026-03-01T06:00:00Z',
    createdAt: '2026-02-28', updatedAt: '2026-03-29',
    lineItems: []
  }
]

export const mockApprovalTrail: Record<string, ApprovalStep[]> = {
  i1: [
    {
      id: 'i1-s1', invoiceId: 'i1', stepNo: 1, requiredRole: 'l1_finance_employee',
      assignedTo: 'mock-l1_finance_employee', assigneeName: 'Neha Sharma',
      action: 'approve', actorId: 'mock-l1_finance_employee', actorName: 'Neha Sharma',
      comments: 'PO matched, invoice line-items reconcile.',
      actedAt: '2026-04-03T14:10:00Z', slaDueAt: '2026-04-05T09:10:00Z'
    },
    {
      id: 'i1-s2', invoiceId: 'i1', stepNo: 2, requiredRole: 'l2_finance_head',
      assignedTo: 'mock-l2_finance_head', assigneeName: 'Rohan Iyer',
      slaDueAt: '2026-04-07T14:10:00Z'
    }
  ],
  i3: [
    {
      id: 'i3-s1', invoiceId: 'i3', stepNo: 1, requiredRole: 'l1_finance_employee',
      assignedTo: 'mock-l1_finance_employee', assigneeName: 'Neha Sharma',
      action: 'approve', actorId: 'mock-l1_finance_employee', actorName: 'Neha Sharma',
      comments: 'Cloud invoice within Mar budget.',
      actedAt: '2026-04-01T10:20:00Z'
    },
    {
      id: 'i3-s2', invoiceId: 'i3', stepNo: 2, requiredRole: 'l2_finance_head',
      assignedTo: 'mock-l2_finance_head', assigneeName: 'Rohan Iyer',
      action: 'approve', actorId: 'mock-l2_finance_head', actorName: 'Rohan Iyer',
      comments: 'FX exposure logged; approved.',
      actedAt: '2026-04-02T16:40:00Z'
    },
    {
      id: 'i3-s3', invoiceId: 'i3', stepNo: 3, requiredRole: 'cfo',
      assignedTo: 'mock-cfo', assigneeName: 'Priya Menon',
      slaDueAt: '2026-04-06T16:40:00Z'
    }
  ]
}

export const mockPayments: Payment[] = [
  {
    id: 'p1', tenantId: TENANT, invoiceId: 'i5', invoiceNumber: 'DEL-IN-0039',
    vendorId: 'v4', vendorName: 'Deloitte',
    amount: 1463200, currency: 'INR', baseAmount: 1463200, fxRateToBase: 1,
    rail: 'manual', status: 'scheduled',
    scheduledFor: '2026-04-11',
    createdAt: '2026-03-12'
  },
  {
    id: 'p2', tenantId: TENANT, invoiceId: 'i6', invoiceNumber: 'TCS-26-00412',
    vendorId: 'v1', vendorName: 'TCS',
    amount: 719800, currency: 'INR', baseAmount: 719800, fxRateToBase: 1,
    rail: 'neft', status: 'paid', externalRef: 'UTR-N8802639012',
    initiatedAt: '2026-03-19T09:00:00Z', completedAt: '2026-03-19T14:20:00Z',
    createdAt: '2026-03-19'
  },
  {
    id: 'p3', tenantId: TENANT, invoiceId: 'i8', invoiceNumber: 'AWSIN-2026-0214',
    vendorId: 'v3', vendorName: 'AWS India',
    amount: 48200, currency: 'USD', baseAmount: 4010240, fxRateToBase: 83.2,
    rail: 'wire', status: 'reconciled', externalRef: 'SWIFT-MT103-20263289',
    initiatedAt: '2026-03-28T07:30:00Z', completedAt: '2026-03-29T10:00:00Z',
    createdAt: '2026-03-29'
  }
]

export const mockBudgets: Budget[] = [
  {
    id: 'b1', tenantId: TENANT, costCenterId: 'cc-eng', costCenterName: 'Engineering',
    categoryId: 'cat-cloud', categoryName: 'Cloud & Infra',
    periodStart: '2026-04-01', periodEnd: '2026-06-30',
    amountBase: 15000000, currency: 'INR', createdAt: '2026-03-15'
  },
  {
    id: 'b2', tenantId: TENANT, costCenterId: 'cc-mkt', costCenterName: 'Marketing',
    categoryId: 'cat-agency', categoryName: 'Agencies',
    periodStart: '2026-04-01', periodEnd: '2026-06-30',
    amountBase: 6000000, currency: 'INR', createdAt: '2026-03-15'
  },
  {
    id: 'b3', tenantId: TENANT, costCenterId: 'cc-ops', costCenterName: 'Operations',
    categoryId: 'cat-logistics', categoryName: 'Logistics',
    periodStart: '2026-04-01', periodEnd: '2026-06-30',
    amountBase: 4500000, currency: 'INR', createdAt: '2026-03-15'
  }
]

export const mockBudgetUtilization: Record<string, number> = {
  b1: 0.68, // 68% consumed
  b2: 0.89,
  b3: 0.41
}

export const mockPolicies: ApprovalPolicy[] = [
  {
    id: 'pol1', tenantId: TENANT, name: 'Standard — up to ₹5L',
    minAmountBase: 0, maxAmountBase: 500000,
    requiredChain: ['l1_finance_employee', 'l2_finance_head'],
    priority: 100, isActive: true, createdAt: '2026-01-01'
  },
  {
    id: 'pol2', tenantId: TENANT, name: 'High-value — ₹5L to ₹50L',
    minAmountBase: 500000, maxAmountBase: 5000000,
    requiredChain: ['l1_finance_employee', 'l2_finance_head', 'cfo'],
    priority: 90, isActive: true, createdAt: '2026-01-01'
  },
  {
    id: 'pol3', tenantId: TENANT, name: 'Enterprise — above ₹50L',
    minAmountBase: 5000000,
    requiredChain: ['l1_finance_employee', 'l2_finance_head', 'cfo'],
    priority: 80, isActive: true, createdAt: '2026-01-01'
  }
]

export const mockAuditLog: AuditLogEntry[] = [
  {
    id: 3041, tenantId: TENANT, actorId: 'mock-l2_finance_head', actorName: 'Rohan Iyer', actorRole: 'l2_finance_head',
    entityType: 'invoice', entityId: 'i3', action: 'approve',
    diff: { status: { from: 'l2_review', to: 'cfo_review' } },
    rowHash: 'e1d7...', prevHash: 'a990...', createdAt: '2026-04-02T16:40:00Z'
  },
  {
    id: 3040, tenantId: TENANT, actorId: 'mock-l1_finance_employee', actorName: 'Neha Sharma', actorRole: 'l1_finance_employee',
    entityType: 'invoice', entityId: 'i3', action: 'approve',
    diff: { status: { from: 'l1_review', to: 'l2_review' } },
    rowHash: 'a990...', prevHash: '82b6...', createdAt: '2026-04-01T10:20:00Z'
  },
  {
    id: 3039, tenantId: TENANT, actorId: 'v3', actorName: 'AWS India (vendor portal)', actorRole: 'vendor',
    entityType: 'invoice', entityId: 'i3', action: 'create',
    diff: { invoiceNumber: 'AWSIN-2026-0315', totalAmount: 52000 },
    rowHash: '82b6...', prevHash: '59ec...', createdAt: '2026-03-31T23:15:00Z'
  }
]

export const mockCashflow: CashflowProjection[] = [
  { date: '2026-04-20', inflow: 6800000, outflow: 2100000, net: 4700000, cumulative: 4700000 },
  { date: '2026-04-27', inflow: 4200000, outflow: 3100000, net: 1100000, cumulative: 5800000 },
  { date: '2026-05-04', inflow: 7100000, outflow: 5400000, net: 1700000, cumulative: 7500000 },
  { date: '2026-05-11', inflow: 5300000, outflow: 4200000, net: 1100000, cumulative: 8600000 },
  { date: '2026-05-18', inflow: 6400000, outflow: 7800000, net: -1400000, cumulative: 7200000 },
  { date: '2026-05-25', inflow: 5900000, outflow: 3800000, net: 2100000, cumulative: 9300000 }
]

export const mockAgeing: AgeingBucket[] = [
  { label: '0-30', count: 42, amountBase: 8420000 },
  { label: '31-60', count: 18, amountBase: 3240000 },
  { label: '61-90', count: 6, amountBase: 1180000 },
  { label: '90+', count: 2, amountBase: 410000 }
]

export const mockFxExposure: FxExposure[] = [
  { currency: 'USD', exposure: 118000, exposureBase: 9841200, invoiceCount: 6 },
  { currency: 'EUR', exposure: 22000, exposureBase: 2004860, invoiceCount: 2 },
  { currency: 'GBP', exposure: 8400, exposureBase: 892640, invoiceCount: 1 }
]
