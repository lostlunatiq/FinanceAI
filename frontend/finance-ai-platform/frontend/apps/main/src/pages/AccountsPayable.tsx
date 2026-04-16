import React, { useMemo, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Stack,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Tabs,
  Tab
} from '@mui/material'
import {
  Search,
  Add,
  Upload,
  Visibility,
  Receipt,
  Warning,
  Schedule,
  Assessment,
  Inbox
} from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens, getFraudColor, statusColors } from '@finance-ai/ui'
import {
  formatCurrency,
  formatDate,
  INVOICE_STATUS_LABELS,
  FRAUD_FLAG_LABELS
} from '@finance-ai/core'
import type { Invoice, InvoiceStatus } from '@finance-ai/core'
import { mockInvoices } from '../mocks/data'
import InvoiceDetail from './InvoiceDetail'
import Approvals from './Approvals'

const PrimaryButton = styled(Button)(() => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 22px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: `0 4px 16px ${alpha(tokens.colors.primary, 0.25)}`,
  '&:hover': { boxShadow: `0 6px 24px ${alpha(tokens.colors.primary, 0.35)}` }
}))

const StatusChip = styled(Chip, { shouldForwardProp: p => p !== 'statusColor' })<{ statusColor: string }>(
  ({ statusColor }) => ({
    backgroundColor: alpha(statusColor, 0.12),
    color: statusColor,
    fontWeight: 600,
    fontSize: '0.75rem',
    height: 26,
    border: 'none'
  })
)

const TAB_FILTERS: { label: string; statuses?: InvoiceStatus[]; highRisk?: boolean }[] = [
  { label: 'All' },
  { label: 'In Review', statuses: ['l1_review', 'l2_review', 'cfo_review'] },
  { label: 'Approved', statuses: ['approved'] },
  { label: 'High Risk', highRisk: true },
  { label: 'Paid', statuses: ['paid'] },
  { label: 'Rejected / On Hold', statuses: ['rejected', 'on_hold'] }
]

const AccountsPayableList: React.FC = () => {
  const navigate = useNavigate()
  const [tabIndex, setTabIndex] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filter = TAB_FILTERS[tabIndex]
    return mockInvoices.filter(inv => {
      const matchesQuery =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.vendorName || '').toLowerCase().includes(q)
      if (!matchesQuery) return false
      if (filter.statuses && !filter.statuses.includes(inv.status)) return false
      if (filter.highRisk && (inv.fraudScore ?? 0) < 60) return false
      return true
    })
  }, [tabIndex, query])

  const stats = useMemo(() => {
    return {
      total: mockInvoices.length,
      baseTotal: mockInvoices.reduce((s, i) => s + i.baseTotal, 0),
      inReview: mockInvoices.filter(i =>
        (['l1_review', 'l2_review', 'cfo_review'] as InvoiceStatus[]).includes(i.status)
      ).length,
      highRisk: mockInvoices.filter(i => (i.fraudScore ?? 0) >= 60).length
    }
  }, [])

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: { xs: '1.75rem', lg: '2.25rem' },
              fontWeight: 700,
              color: tokens.colors.primary,
              letterSpacing: '-0.02em'
            }}
          >
            Accounts Payable
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
            {stats.total} invoices · {formatCurrency(stats.baseTotal, 'INR')} base · {stats.inReview} in review
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Inbox />} onClick={() => navigate('/ap/approvals')} sx={{ textTransform: 'none' }}>
            Approvals Queue
          </Button>
          <Button variant="outlined" startIcon={<Upload />} sx={{ textTransform: 'none' }}>
            Import
          </Button>
          <PrimaryButton startIcon={<Add />}>New Invoice</PrimaryButton>
        </Stack>
      </Stack>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Kpi icon={<Receipt />} label="Total Invoices" value={stats.total.toString()} tint={tokens.colors.primary} />
        <Kpi icon={<Assessment />} label="Base (INR)" value={formatCurrency(stats.baseTotal, 'INR')} tint={tokens.colors.secondary} />
        <Kpi icon={<Schedule />} label="In Review" value={stats.inReview.toString()} tint={tokens.colors.warning} />
        <Kpi icon={<Warning />} label="High Risk" value={stats.highRisk.toString()} tint={tokens.colors.error} />
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setPage(0) }} variant="scrollable" scrollButtons="auto">
            {TAB_FILTERS.map(f => <Tab key={f.label} label={f.label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
          </Tabs>
          <TextField
            placeholder="Search invoice # or vendor..."
            size="small"
            value={query}
            onChange={e => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: tokens.colors.onSurfaceVariant }} />
                </InputAdornment>
              )
            }}
            sx={{ width: 320 }}
          />
        </Box>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Base (INR)</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Fraud</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(inv => (
                <InvoiceRow key={inv.id} invoice={inv} onOpen={() => navigate(`/ap/invoice/${inv.id}`)} />
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: tokens.colors.onSurfaceVariant }}>
                    No invoices match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
        />
      </Card>
    </Box>
  )
}

const InvoiceRow: React.FC<{ invoice: Invoice; onOpen: () => void }> = ({ invoice, onOpen }) => {
  const statusColor = statusColors[invoice.status] || tokens.colors.onSurfaceVariant
  return (
    <TableRow hover>
      <TableCell>
        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
          {invoice.invoiceNumber}
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
          {formatDate(invoice.issueDate)}
        </Typography>
      </TableCell>
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
            {(invoice.vendorName || '?').charAt(0)}
          </Avatar>
          <Typography>{invoice.vendorName}</Typography>
        </Stack>
      </TableCell>
      <TableCell align="right">
        <Typography sx={{ fontWeight: 600 }}>
          {formatCurrency(invoice.totalAmount, invoice.currency)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography sx={{ fontWeight: 600 }}>
          {formatCurrency(invoice.baseTotal, 'INR')}
        </Typography>
        {invoice.currency !== 'INR' && (
          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
            @ {invoice.fxRateToBase.toFixed(2)}
          </Typography>
        )}
      </TableCell>
      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
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
              backgroundColor: alpha(getFraudColor(invoice.fraudScore), 0.15),
              color: getFraudColor(invoice.fraudScore),
              fontWeight: 700,
              fontSize: '0.7rem'
            }}
          >
            {invoice.fraudScore}
          </Box>
          {invoice.fraudFlags && invoice.fraudFlags.length > 0 && (
            <Warning
              fontSize="small"
              sx={{ color: getFraudColor(invoice.fraudScore) }}
              titleAccess={invoice.fraudFlags.map(f => FRAUD_FLAG_LABELS[f] || f).join(', ')}
            />
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <StatusChip label={INVOICE_STATUS_LABELS[invoice.status]} statusColor={statusColor} size="small" />
      </TableCell>
      <TableCell align="right">
        <IconButton size="small" onClick={onOpen} sx={{ color: tokens.colors.primary }}>
          <Visibility fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  )
}

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; tint: string }> = ({ icon, label, value, tint }) => (
  <Card sx={{ p: 3 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="overline" sx={{ color: tokens.colors.onSurfaceVariant }}>{label}</Typography>
        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.5rem', fontWeight: 700, mt: 0.5 }}>
          {value}
        </Typography>
      </Box>
      <Box sx={{ color: tint, fontSize: 32, display: 'flex' }}>{icon}</Box>
    </Stack>
  </Card>
)

/**
 * Nested routing: /ap renders list; /ap/approvals and /ap/invoice/:id render
 * specialised views. Keeping them under the same route prefix makes Layout's
 * active-nav detection work without additional changes.
 */
const AccountsPayable: React.FC = () => (
  <Routes>
    <Route index element={<AccountsPayableList />} />
    <Route path="approvals" element={<Approvals />} />
    <Route path="invoice/:invoiceId" element={<InvoiceDetail />} />
  </Routes>
)

export default AccountsPayable
