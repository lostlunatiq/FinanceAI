import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material'
import { AccountBalanceWallet, Check, Pending, Cancel, Error as ErrorIcon } from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui'
import {
  formatCurrency,
  formatDate,
  PAYMENT_RAIL_LABELS
} from '@finance-ai/core'
import type { PaymentStatus, PaymentRail, Payment } from '@finance-ai/core'
import { RoleGate } from '@finance-ai/rbac'
import { mockPayments } from '../mocks/data'

const PrimaryButton = styled(Button)(() => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 22px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  textTransform: 'none'
}))

const STATUS_STYLES: Record<PaymentStatus, { color: string; icon: React.ReactNode }> = {
  scheduled: { color: tokens.colors.warning, icon: <Pending fontSize="small" /> },
  processing: { color: tokens.colors.info, icon: <Pending fontSize="small" /> },
  paid: { color: tokens.colors.success, icon: <Check fontSize="small" /> },
  reconciled: { color: tokens.colors.primary, icon: <Check fontSize="small" /> },
  failed: { color: tokens.colors.error, icon: <ErrorIcon fontSize="small" /> },
  cancelled: { color: '#94a3b8', icon: <Cancel fontSize="small" /> }
}

const TAB_FILTERS: { label: string; statuses?: PaymentStatus[] }[] = [
  { label: 'All' },
  { label: 'Scheduled', statuses: ['scheduled'] },
  { label: 'Processing', statuses: ['processing'] },
  { label: 'Paid', statuses: ['paid', 'reconciled'] },
  { label: 'Failed', statuses: ['failed'] }
]

const Payments: React.FC = () => {
  const [tab, setTab] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const filtered = useMemo(() => {
    const f = TAB_FILTERS[tab]
    if (!f.statuses) return mockPayments
    return mockPayments.filter(p => f.statuses!.includes(p.status))
  }, [tab])

  const metrics = useMemo(() => {
    return {
      totalBase: mockPayments.reduce((s, p) => s + p.baseAmount, 0),
      pendingBase: mockPayments.filter(p => p.status === 'scheduled' || p.status === 'processing').reduce((s, p) => s + p.baseAmount, 0),
      paidBase: mockPayments.filter(p => p.status === 'paid' || p.status === 'reconciled').reduce((s, p) => s + p.baseAmount, 0),
      failedCount: mockPayments.filter(p => p.status === 'failed').length
    }
  }, [])

  return (
    <Box sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: { xs: '1.75rem', lg: '2.25rem' }, fontWeight: 700, color: tokens.colors.primary, letterSpacing: '-0.02em' }}>
            Payments
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
            Schedule, track, and reconcile vendor payouts across UPI, NEFT, RTGS, ACH, and Wire rails
          </Typography>
        </Box>
        <RoleGate roles={['cfo', 'admin']}>
          <PrimaryButton onClick={() => setScheduleOpen(true)} startIcon={<AccountBalanceWallet />}>
            Schedule Payment
          </PrimaryButton>
        </RoleGate>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Metric label="Total (INR)" value={formatCurrency(metrics.totalBase, 'INR')} />
        <Metric label="Pending Settlement" value={formatCurrency(metrics.pendingBase, 'INR')} tint={tokens.colors.warning} />
        <Metric label="Paid / Reconciled" value={formatCurrency(metrics.paidBase, 'INR')} tint={tokens.colors.success} />
        <Metric label="Failed" value={metrics.failedCount.toString()} tint={tokens.colors.error} />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}` }}>
          {TAB_FILTERS.map(f => <Tab key={f.label} label={f.label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
        </Tabs>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Base (INR)</TableCell>
                <TableCell>Rail</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reference</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => <PaymentRow key={p.id} payment={p} />)}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: tokens.colors.onSurfaceVariant }}>
                    No payments match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <SchedulePaymentDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </Box>
  )
}

const PaymentRow: React.FC<{ payment: Payment }> = ({ payment }) => {
  const style = STATUS_STYLES[payment.status]
  return (
    <TableRow hover>
      <TableCell>
        <Typography sx={{ fontWeight: 600 }}>{payment.invoiceNumber}</Typography>
      </TableCell>
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{(payment.vendorName || '?').charAt(0)}</Avatar>
          <Typography>{payment.vendorName}</Typography>
        </Stack>
      </TableCell>
      <TableCell align="right">{formatCurrency(payment.amount, payment.currency)}</TableCell>
      <TableCell align="right"><b>{formatCurrency(payment.baseAmount, 'INR')}</b></TableCell>
      <TableCell>
        <Chip label={PAYMENT_RAIL_LABELS[payment.rail] || payment.rail} size="small" sx={{ backgroundColor: alpha(tokens.colors.primary, 0.08), color: tokens.colors.primary, fontWeight: 600 }} />
      </TableCell>
      <TableCell>{payment.scheduledFor ? formatDate(payment.scheduledFor) : '—'}</TableCell>
      <TableCell>
        <Chip
          icon={<Box sx={{ display: 'flex', alignItems: 'center' }}>{style.icon}</Box>}
          label={payment.status}
          size="small"
          sx={{ backgroundColor: alpha(style.color, 0.12), color: style.color, fontWeight: 600, textTransform: 'capitalize' }}
        />
      </TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant }}>
        {payment.externalRef || '—'}
      </TableCell>
    </TableRow>
  )
}

const SchedulePaymentDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [rail, setRail] = useState<PaymentRail>('neft')
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>Schedule Payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Invoice #" fullWidth />
          <TextField label="Vendor Bank Account" fullWidth select>
            <MenuItem value="primary">Primary (HDFC XXXX4521)</MenuItem>
          </TextField>
          <TextField label="Rail" select value={rail} onChange={e => setRail(e.target.value as PaymentRail)} fullWidth>
            {Object.entries(PAYMENT_RAIL_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <TextField label="Scheduled Date" type="date" InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onClose}>Schedule</Button>
      </DialogActions>
    </Dialog>
  )
}

const Metric: React.FC<{ label: string; value: string; tint?: string }> = ({ label, value, tint }) => (
  <Card sx={{ p: 3 }}>
    <Typography variant="overline" sx={{ color: tokens.colors.onSurfaceVariant }}>{label}</Typography>
    <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.5rem', fontWeight: 700, mt: 0.5, color: tint }}>
      {value}
    </Typography>
  </Card>
)

export default Payments
