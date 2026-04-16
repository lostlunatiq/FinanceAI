import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Button,
  Alert
} from '@mui/material'
import { Visibility, Warning } from '@mui/icons-material'
import { alpha } from '@mui/material/styles'
import { tokens, getFraudColor, statusColors } from '@finance-ai/ui'
import {
  formatCurrency,
  formatDate,
  INVOICE_STATUS_LABELS,
  canActOnInvoice,
  FRAUD_FLAG_LABELS
} from '@finance-ai/core'
import type { InvoiceStatus, UserRole } from '@finance-ai/core'
import { useAuth } from '@finance-ai/auth'
import { mockInvoices } from '../mocks/data'

/**
 * Approvals queue — shows invoices currently awaiting action by the user's role.
 * Mock: filter by status + role. Production: use /invoices/assigned endpoint.
 */

const STATUS_BY_ROLE: Record<UserRole, InvoiceStatus[]> = {
  l1_finance_employee: ['l1_review'],
  l2_finance_head: ['l1_review', 'l2_review'],
  cfo: ['l2_review', 'cfo_review'],
  admin: ['l1_review', 'l2_review', 'cfo_review'],
  vendor: []
}

const Approvals: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role as UserRole | undefined
  const [tab, setTab] = useState(0)

  const relevantStatuses = role ? STATUS_BY_ROLE[role] : []
  const myQueue = useMemo(
    () =>
      mockInvoices
        .filter(inv => relevantStatuses.includes(inv.status))
        .filter(inv => canActOnInvoice(role, inv.status, inv.currentAssignee === user?.id))
        .sort((a, b) => (a.fraudScore ?? 0) < (b.fraudScore ?? 0) ? 1 : -1),
    [role, user?.id]
  )

  const teamQueue = useMemo(
    () => mockInvoices.filter(inv => relevantStatuses.includes(inv.status)),
    [role]
  )

  const stuckQueue = useMemo(
    () => mockInvoices.filter(inv => inv.status === 'on_hold'),
    []
  )

  const activeList = tab === 0 ? myQueue : tab === 1 ? teamQueue : stuckQueue

  if (!role || role === 'vendor') {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="info">Approvals queue is not available for your role.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            fontWeight: 700,
            color: tokens.colors.primary,
            letterSpacing: '-0.02em'
          }}
        >
          Approvals
        </Typography>
        <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1 }}>
          Invoices awaiting action at your level — {myQueue.length} in your personal queue
        </Typography>
      </Box>

      {/* Summary tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <SummaryTile label="My Queue" count={myQueue.length} amount={sumBase(myQueue)} color={tokens.colors.primary} />
        <SummaryTile label="Team Queue" count={teamQueue.length} amount={sumBase(teamQueue)} color={tokens.colors.secondary} />
        <SummaryTile label="On Hold" count={stuckQueue.length} amount={sumBase(stuckQueue)} color={tokens.colors.warning} />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}`, px: 2 }}>
          <Tab label={`Mine (${myQueue.length})`} />
          <Tab label={`Team (${teamQueue.length})`} />
          <Tab label={`On Hold (${stuckQueue.length})`} />
        </Tabs>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell align="right">Amount (INR)</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Fraud</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeList.map(inv => {
              const stageColor = statusColors[inv.status] || tokens.colors.onSurfaceVariant
              return (
                <TableRow key={inv.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{inv.invoiceNumber}</Typography>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      {formatDate(inv.issueDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                        {(inv.vendorName || '?').charAt(0)}
                      </Avatar>
                      <Typography>{inv.vendorName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 600 }}>{formatCurrency(inv.baseTotal, 'INR')}</Typography>
                    {inv.currency !== 'INR' && (
                      <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(inv.dueDate)}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: alpha(getFraudColor(inv.fraudScore), 0.15),
                          color: getFraudColor(inv.fraudScore),
                          fontWeight: 700,
                          fontSize: '0.7rem'
                        }}
                      >
                        {inv.fraudScore}
                      </Box>
                      {inv.fraudFlags && inv.fraudFlags.length > 0 && (
                        <Warning fontSize="small" sx={{ color: getFraudColor(inv.fraudScore) }} titleAccess={inv.fraudFlags.map(f => FRAUD_FLAG_LABELS[f] || f).join(', ')} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={INVOICE_STATUS_LABELS[inv.status]}
                      size="small"
                      sx={{ backgroundColor: alpha(stageColor, 0.12), color: stageColor, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/ap/invoice/${inv.id}`)}
                      sx={{ textTransform: 'none' }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {activeList.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: tokens.colors.onSurfaceVariant }}>
                  Nothing awaits your action. Good inbox zero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}

const sumBase = (rows: { baseTotal: number }[]) => rows.reduce((s, r) => s + r.baseTotal, 0)

const SummaryTile: React.FC<{ label: string; count: number; amount: number; color: string }> = ({ label, count, amount, color }) => (
  <Card sx={{ p: 3 }}>
    <Typography variant="overline" sx={{ color: tokens.colors.onSurfaceVariant }}>{label}</Typography>
    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1 }}>
      <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, color }}>
        {count}
      </Typography>
      <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontSize: '0.875rem' }}>
        invoices
      </Typography>
    </Stack>
    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
      {formatCurrency(amount, 'INR')} total exposure
    </Typography>
  </Card>
)

export default Approvals
