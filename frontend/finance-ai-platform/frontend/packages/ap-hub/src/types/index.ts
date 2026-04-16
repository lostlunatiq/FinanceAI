// Re-export canonical types from @finance-ai/core so existing imports keep working.
// The old custom shape in this file has been removed — single source of truth is core.
export type {
  Invoice,
  InvoiceStatus,
  InvoiceAction,
  InvoiceLineItem,
  Vendor,
  VendorStatus,
  VendorBankAccount,
  VendorDocument,
  Payment,
  PaymentStatus,
  PaymentRail,
  ApprovalStep,
  ApprovalPolicy
} from '@finance-ai/core'
