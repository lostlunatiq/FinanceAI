import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  Stack,
  Button,
  Chip,
  Divider,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Alert
} from '@mui/material'
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  PauseCircleOutline,
  RestartAlt,
  EditNote,
  History,
  Warning
} from '@mui/icons-material'
import { alpha } from '@mui/material/styles'
import { tokens, getFraudColor, statusColors } from '@finance-ai/ui'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  canActOnInvoice,
  INVOICE_STATUS_LABELS,
  INVOICE_TRANSITIONS,
  FRAUD_FLAG_LABELS,
  ROLE_LABELS
} from '@finance-ai/core'
import type { InvoiceAction, UserRole } from '@finance-ai/core'
import { useAuth } from '@finance-ai/auth'
import { RoleGate } from '@finance-ai/rbac'
import { mockInvoices, mockApprovalTrail, mockAuditLog } from '../mocks/data'

const ACTION_META: Record<
  string,
  { label: string; color: 'success' | 'error' | 'warning' | 'info'; icon: React.ReactNode; requiresComment?: boolean }
> = {
  approve: { label: 'Approve', color: 'success', icon: <CheckCircle fontSize="small" /> },
  reject: { label: 'Reject', color: 'error', icon: <Cancel fontSize="small" />, requiresComment: true },
  request_changes: { label: 'Request Changes', color: 'warning', icon: <EditNote fontSize="small" />, requiresComment: true },
  hold: { label: 'Hold', color: 'warning', icon: <PauseCircleOutline fontSize="small" />, requiresComment: true },
  resume: { label: 'Resume', color: 'info', icon: <RestartAlt fontSize="small" /> },
  submit: { label: 'Submit for Review', color: 'info', icon: <CheckCircle fontSize="small" /> },
  mark_paid: { label: 'Mark Paid', color: 'success', icon: <CheckCircle fontSize="small" /> }
}

const InvoiceDetail: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const invoice = useMemo(() => mockInvoices.find(i => i.id === invoiceId), [invoiceId])
  const approvalTrail = invoiceId ? mockApprovalTrail[invoiceId] || [] : []
  const auditEntries = useMemo(
    () => mockAuditLog.filter(e => e.entityType === 'invoice' && e.entityId === invoiceId),
    [invoiceId]
  )

  const [tabValue, setTabValue] = useState(0)
  const [actionDialog, setActionDialog] = useState<{ action: InvoiceAction; nextStatus: string } | null>(null)
  const [comment, setComment] = useState('')

  if (!invoice) {
    return (
      <Box sx={{ py: 6 }}>
        <Alert severity="error">Invoice not found.</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBack />} onClick={() => navigate('/ap')}>
          Back to Accounts Payable
        </Button>
      </Box>
    )
  }

  const statusColor = statusColors[invoice.status] || tokens.colors.onSurfaceVariant
  const assigneeMatches = invoice.currentAssignee === user?.id
  const availableTransitions = INVOICE_TRANSITIONS[invoice.status] || []
  const canAct = canActOnInvoice(user?.role as UserRole, invoice.status, assigneeMatches)

  const onSelectAction = (action: InvoiceAction, nextStatus: string) => {
    setActionDialog({ action, nextStatus })
    setComment('')
  }

  const onConfirmAction = () => {
    // In the mock build, we just log. Real impl: invoicesApi[action](invoice.id, { comment }).
    console.log('[mock] invoice action', invoice.id, actionDialog, { comment })
    setActionDialog(null)
    setComment('')
  }

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: tokens.colors.onSurfaceVariant }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 700,
              color: tokens.colors.primary,
              letterSpacing: '-0.02em'
            }}
          >
            {invoice.invoiceNumber}
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
            {invoice.vendorName} · Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
          </Typography>
        </Box>
        <Chip
          label={INVOICE_STATUS_LABELS[invoice.status]}
          sx={{
            backgroundColor: alpha(statusColor, 0.12),
            color: statusColor,
            fontWeight: 600,
            px: 1
          }}
        />
      </Stack>

      {/* Action bar */}
      {availableTransitions.length > 0 && (
        <Card sx={{ p: 2.5, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 600, color: tokens.colors.onSurfaceVariant, mr: 1 }}>
            Actions
          </Typography>
          {availableTransitions.map(t => {
            const meta = ACTION_META[t.action] || { label: t.action, color: 'info' as const, icon: null }
            const allowed = canAct || t.action === 'resume' || t.action === 'submit'
            return (
              <RoleGate
                key={t.action}
                roles={
                  t.action === 'mark_paid'
                    ? ['cfo', 'admin']
                    : ['l1_finance_employee', 'l2_finance_head', 'cfo', 'admin']
                }
              >
                <Button
                  variant={meta.color === 'success' ? 'contained' : 'outlined'}
                  color={meta.color}
                  startIcon={meta.icon}
                  disabled={!allowed}
                  onClick={() => onSelectAction(t.action as InvoiceAction, t.next)}
                  sx={{ textTransform: 'none' }}
                >
                  {meta.label}
                </Button>
              </RoleGate>
            )
          })}
          {!canAct && (
            <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, ml: 'auto' }}>
              Your role cannot act on this invoice at its current stage.
            </Typography>
          )}
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        {/* LEFT: Invoice body */}
        <Box>
          {/* Amount summary */}
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between">
              <Box>
                <Typography variant="overline" sx={{ color: tokens.colors.onSurfaceVariant }}>
                  Invoice Total
                </Typography>
                <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </Typography>
                {invoice.currency !== 'INR' && (
                  <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                    ≈ {formatCurrency(invoice.baseTotal, 'INR')} @ FX {invoice.fxRateToBase.toFixed(2)}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Stack spacing={0.5}>
                  <Row label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
                  <Row label="Tax" value={formatCurrency(invoice.taxAmount, invoice.currency)} />
                  <Row label="Base (INR)" value={formatCurrency(invoice.baseTotal, 'INR')} strong />
                </Stack>
              </Box>
            </Stack>
          </Card>

          {/* Fraud score */}
          {invoice.fraudScore !== undefined && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 600 }}>Fraud Risk</Typography>
                <Typography sx={{ fontWeight: 700, color: getFraudColor(invoice.fraudScore) }}>
                  {invoice.fraudScore} /100
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={invoice.fraudScore}
                sx={{
                  height: 8,
                  borderRadius: tokens.radius.full,
                  backgroundColor: alpha(getFraudColor(invoice.fraudScore), 0.15),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getFraudColor(invoice.fraudScore),
                    borderRadius: tokens.radius.full
                  }
                }}
              />
              {invoice.fraudFlags && invoice.fraudFlags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                  {invoice.fraudFlags.map(flag => (
                    <Chip
                      key={flag}
                      icon={<Warning sx={{ fontSize: 14 }} />}
                      label={FRAUD_FLAG_LABELS[flag] || flag}
                      size="small"
                      sx={{
                        backgroundColor: alpha(getFraudColor(invoice.fraudScore!), 0.12),
                        color: getFraudColor(invoice.fraudScore!),
                        fontWeight: 500
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Card>
          )}

          {/* Tabs: line items / audit */}
          <Card>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{ borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}`, px: 2 }}
            >
              <Tab label="Line Items" />
              <Tab label={`Audit Trail (${auditEntries.length})`} />
            </Tabs>

            {tabValue === 0 && (
              <Box sx={{ p: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Tax %</TableCell>
                      <TableCell align="right">Line Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(invoice.lineItems || []).map(li => (
                      <TableRow key={li.id}>
                        <TableCell>{li.lineNo}</TableCell>
                        <TableCell>{li.description}</TableCell>
                        <TableCell align="right">{li.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(li.unitPrice, invoice.currency)}</TableCell>
                        <TableCell align="right">{li.taxRate}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(li.lineTotal, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!invoice.lineItems || invoice.lineItems.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ color: tokens.colors.onSurfaceVariant, py: 4 }}>
                          No line items captured.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}

            {tabValue === 1 && (
              <Box sx={{ p: 3 }}>
                {auditEntries.length === 0 ? (
                  <Typography sx={{ color: tokens.colors.onSurfaceVariant }}>
                    No audit entries for this invoice yet.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {auditEntries.map(entry => (
                      <Stack key={entry.id} direction="row" spacing={2} alignItems="flex-start">
                        <History sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {entry.actorName || entry.actorId} · {entry.action}
                          </Typography>
                          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                            {formatDateTime(entry.createdAt)} · {entry.actorRole && ROLE_LABELS[entry.actorRole]}
                          </Typography>
                          {entry.diff && (
                            <Box
                              component="pre"
                              sx={{
                                mt: 1,
                                p: 1.5,
                                backgroundColor: tokens.colors.surfaceContainerLow,
                                borderRadius: tokens.radius.md,
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                overflow: 'auto'
                              }}
                            >
                              {JSON.stringify(entry.diff, null, 2)}
                            </Box>
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Card>
        </Box>

        {/* RIGHT: Approval trail + meta */}
        <Box>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Approval Trail</Typography>
            {approvalTrail.length === 0 ? (
              <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                No approval steps yet — invoice is still in {INVOICE_STATUS_LABELS[invoice.status]}.
              </Typography>
            ) : (
              <Stepper orientation="vertical" nonLinear>
                {approvalTrail.map(step => {
                  const completed = !!step.actedAt
                  const active = !completed
                  return (
                    <Step key={step.id} completed={completed} active={active}>
                      <StepLabel
                        optional={
                          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                            {ROLE_LABELS[step.requiredRole]}
                            {step.slaDueAt && !completed && ` · SLA ${formatDate(step.slaDueAt)}`}
                          </Typography>
                        }
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {(step.assigneeName || '?').charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 600 }}>
                            {step.assigneeName || 'Unassigned'}
                          </Typography>
                        </Stack>
                      </StepLabel>
                      <StepContent>
                        {completed ? (
                          <Box>
                            <Chip
                              size="small"
                              label={step.action}
                              color={step.action === 'approve' ? 'success' : step.action === 'reject' ? 'error' : 'default'}
                              sx={{ mb: 1 }}
                            />
                            {step.comments && (
                              <Typography variant="body2" sx={{ color: tokens.colors.onSurface }}>
                                "{step.comments}"
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                              {step.actedAt && formatDateTime(step.actedAt)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                            Awaiting action.
                          </Typography>
                        )}
                      </StepContent>
                    </Step>
                  )
                })}
              </Stepper>
            )}
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Invoice Metadata</Typography>
            <Stack spacing={1.5}>
              <Row label="PO Number" value={invoice.poNumber || '—'} />
              <Row label="Vendor" value={invoice.vendorName || invoice.vendorId} />
              <Row label="Currency" value={invoice.currency} />
              <Row label="Submitted" value={invoice.submittedAt ? formatDateTime(invoice.submittedAt) : '—'} />
              <Row label="Submitted By" value={invoice.submittedBy || '—'} />
              <Divider />
              <Row label="Created" value={formatDate(invoice.createdAt)} />
              <Row label="Updated" value={formatDate(invoice.updatedAt)} />
            </Stack>
          </Card>
        </Box>
      </Box>

      {/* Action confirmation dialog */}
      <Dialog open={!!actionDialog} onClose={() => setActionDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
          {actionDialog && (ACTION_META[actionDialog.action]?.label || actionDialog.action)}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: tokens.colors.onSurfaceVariant }}>
            Invoice <b>{invoice.invoiceNumber}</b> will move to{' '}
            <b>{actionDialog && INVOICE_STATUS_LABELS[actionDialog.nextStatus]}</b>.
          </Typography>
          <TextField
            label={
              actionDialog && ACTION_META[actionDialog.action]?.requiresComment
                ? 'Comment (required)'
                : 'Comment (optional)'
            }
            fullWidth
            multiline
            minRows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActionDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionDialog ? ACTION_META[actionDialog.action]?.color || 'primary' : 'primary'}
            disabled={
              !!actionDialog && !!ACTION_META[actionDialog.action]?.requiresComment && comment.trim() === ''
            }
            onClick={onConfirmAction}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

const Row: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 500 }}>
      {value}
    </Typography>
  </Stack>
)

export default InvoiceDetail
