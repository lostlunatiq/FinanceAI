import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  Stack,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material'
import {
  TrendingUp,
  Receipt,
  Inbox,
  Warning,
  CheckCircle,
  ArrowForward
} from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from 'recharts'
import { tokens } from '@finance-ai/ui'
import { useAuth } from '@finance-ai/auth'
import { RoleGate } from '@finance-ai/rbac'
import {
  formatCurrency,
  formatCurrencyCompact,
  INVOICE_STATUS_LABELS,
  ROLE_LABELS,
  canActOnInvoice
} from '@finance-ai/core'
import type { UserRole, InvoiceStatus } from '@finance-ai/core'
import {
  mockInvoices,
  mockCashflow,
  mockAgeing,
  mockBudgets,
  mockBudgetUtilization,
  mockFxExposure,
  mockPayments
} from '../mocks/data'

const PrimaryButton = styled(Button)(() => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 22px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  textTransform: 'none'
}))

const REVIEW_STATUSES: InvoiceStatus[] = ['l1_review', 'l2_review', 'cfo_review']

const STATUS_TONE: Record<string, { bg: string; color: string }> = {
  l1_review: { bg: alpha(tokens.colors.warning, 0.12), color: tokens.colors.warning },
  l2_review: { bg: alpha(tokens.colors.warning, 0.12), color: tokens.colors.warning },
  cfo_review: { bg: alpha(tokens.colors.secondary, 0.12), color: tokens.colors.secondary },
  approved: { bg: alpha(tokens.colors.success, 0.12), color: tokens.colors.success },
  paid: { bg: alpha(tokens.colors.success, 0.12), color: tokens.colors.success },
  rejected: { bg: alpha(tokens.colors.error, 0.12), color: tokens.colors.error },
  on_hold: { bg: alpha(tokens.colors.onSurfaceVariant, 0.15), color: tokens.colors.onSurfaceVariant }
}

const greetingForRole = (role: UserRole | undefined, name: string): string => {
  if (!role) return `Welcome, ${name}`
  switch (role) {
    case 'cfo': return `Command Center — ${name}`
    case 'l2_finance_head': return `Good to see you, ${name}`
    case 'l1_finance_employee': return `Let's clear your queue, ${name}`
    case 'vendor': return `Hello, ${name}`
    case 'admin': return `Admin console — ${name}`
  }
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role
  const userId = user?.id

  const myQueue = useMemo(() => {
    if (!role) return []
    return mockInvoices.filter(inv => {
      if (!REVIEW_STATUSES.includes(inv.status as InvoiceStatus)) return false
      const assigneeMatches = !!userId && inv.currentAssignee === userId
      return canActOnInvoice(role, inv.status, assigneeMatches)
    })
  }, [role, userId])

  const totals = useMemo(() => {
    const inFlight = mockInvoices.filter(i => REVIEW_STATUSES.includes(i.status as InvoiceStatus))
    const paidYtd = mockInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.baseTotal, 0)
    const highRisk = mockInvoices.filter(i => i.fraudScore >= 60)
    const queueExposure = myQueue.reduce((s, i) => s + i.baseTotal, 0)
    return {
      inFlightCount: inFlight.length,
      inFlightValue: inFlight.reduce((s, i) => s + i.baseTotal, 0),
      paidYtd,
      highRiskCount: highRisk.length,
      highRiskValue: highRisk.reduce((s, i) => s + i.baseTotal, 0),
      queueExposure
    }
  }, [myQueue])

  const cashflowData = useMemo(
    () => mockCashflow.map(c => ({
      week: c.date.slice(5),
      inflow: c.inflow,
      outflow: c.outflow,
      net: c.net
    })),
    []
  )

  const topHighRisk = useMemo(
    () => [...mockInvoices].filter(i => i.fraudScore >= 50).sort((a, b) => b.fraudScore - a.fraudScore).slice(0, 3),
    []
  )

  const nextPayments = useMemo(
    () => mockPayments.filter(p => p.status === 'scheduled' || p.status === 'processing').slice(0, 3),
    []
  )

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: { xs: '1.75rem', lg: '2.75rem' }, fontWeight: 800, color: tokens.colors.primary, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {greetingForRole(role, user?.firstName ?? 'there')}
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
            {role ? ROLE_LABELS[role] : ''} — Friday, 17 April 2026
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<Inbox />} onClick={() => navigate('/ap/approvals')} sx={{ borderRadius: tokens.radius.full, textTransform: 'none', border: 'none', backgroundColor: tokens.colors.surfaceContainer, '&:hover': { border: 'none', backgroundColor: tokens.colors.surfaceContainerHigh } }}>
            My Queue
          </Button>
          <RoleGate roles={['cfo', 'admin']}>
            <PrimaryButton startIcon={<TrendingUp />} onClick={() => navigate('/treasury')}>
              Treasury
            </PrimaryButton>
          </RoleGate>
        </Stack>
      </Stack>

      {/* KPI tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        <Card sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
              My Queue
            </Typography>
            <Inbox sx={{ color: tokens.colors.primary, fontSize: 20 }} />
          </Stack>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '2.25rem', fontWeight: 700, mt: 1 }}>
            {myQueue.length}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
            {formatCurrencyCompact(totals.queueExposure, 'INR')} exposure
          </Typography>
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
              Invoices in Flight
            </Typography>
            <Receipt sx={{ color: tokens.colors.primary, fontSize: 20 }} />
          </Stack>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '2.25rem', fontWeight: 700, mt: 1 }}>
            {totals.inFlightCount}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
            {formatCurrencyCompact(totals.inFlightValue, 'INR')} pending
          </Typography>
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
              Paid YTD
            </Typography>
            <CheckCircle sx={{ color: tokens.colors.success, fontSize: 20 }} />
          </Stack>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '2.25rem', fontWeight: 700, mt: 1 }}>
            {formatCurrencyCompact(totals.paidYtd, 'INR')}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
            across {mockInvoices.filter(i => i.status === 'paid').length} invoices
          </Typography>
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
              High Risk
            </Typography>
            <Warning sx={{ color: tokens.colors.error, fontSize: 20 }} />
          </Stack>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '2.25rem', fontWeight: 700, mt: 1, color: totals.highRiskCount ? tokens.colors.error : tokens.colors.onSurface }}>
            {totals.highRiskCount}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
            {formatCurrencyCompact(totals.highRiskValue, 'INR')} flagged
          </Typography>
        </Card>
      </Box>

      {/* Cashflow + Queue preview */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
        <RoleGate
          roles={['l2_finance_head', 'cfo', 'admin']}
          fallback={
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, fontSize: '1.125rem', mb: 2 }}>
                Budget utilisation
              </Typography>
              <Stack spacing={2.5}>
                {mockBudgets.map(b => {
                  const pct = Math.round((mockBudgetUtilization[b.id] ?? 0) * 100)
                  const over = pct > 85
                  return (
                    <Box key={b.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 600 }}>{b.costCenterName} — {b.categoryName}</Typography>
                        <Typography variant="caption" sx={{ color: over ? tokens.colors.error : tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
                          {pct}% of {formatCurrencyCompact(b.amountBase, 'INR')}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pct, 100)}
                        sx={{
                          height: 8, borderRadius: tokens.radius.full,
                          backgroundColor: alpha(tokens.colors.primary, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: tokens.radius.full,
                            backgroundColor: over ? tokens.colors.error : tokens.colors.primary
                          }
                        }}
                      />
                    </Box>
                  )
                })}
              </Stack>
            </Card>
          }
        >
          <Card sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, fontSize: '1.125rem' }}>
                  6-Week Cashflow
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                  Projected inflows vs outflows (INR, base)
                </Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/treasury')} sx={{ textTransform: 'none' }}>
                Treasury
              </Button>
            </Stack>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tokens.colors.success} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={tokens.colors.success} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tokens.colors.error} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={tokens.colors.error} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(tokens.colors.outlineVariant, 0.5)} />
                <XAxis dataKey="week" stroke={tokens.colors.onSurfaceVariant} fontSize={12} />
                <YAxis stroke={tokens.colors.onSurfaceVariant} fontSize={12} tickFormatter={(v) => formatCurrencyCompact(v, 'INR')} />
                <RechartsTooltip formatter={(v: number) => formatCurrency(v, 'INR')} />
                <Area type="monotone" dataKey="inflow" stroke={tokens.colors.success} fill="url(#inflow)" strokeWidth={2} />
                <Area type="monotone" dataKey="outflow" stroke={tokens.colors.error} fill="url(#outflow)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </RoleGate>

        {/* Queue preview */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, fontSize: '1.125rem' }}>
              Action required
            </Typography>
            <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/ap/approvals')} sx={{ textTransform: 'none' }}>
              View all
            </Button>
          </Stack>
          {myQueue.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircle sx={{ color: tokens.colors.success, fontSize: 40, mb: 1 }} />
              <Typography sx={{ color: tokens.colors.onSurfaceVariant }}>
                Nothing waiting on you.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {myQueue.slice(0, 5).map(inv => {
                const tone = STATUS_TONE[inv.status] ?? { bg: alpha(tokens.colors.primary, 0.1), color: tokens.colors.primary }
                return (
                  <Box
                    key={inv.id}
                    onClick={() => navigate(`/ap/invoice/${inv.id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: tokens.radius.lg,
                      backgroundColor: tokens.colors.surfaceContainerLow,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: tokens.colors.surfaceContainer }
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }} noWrap>
                          {inv.invoiceNumber}
                        </Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }} noWrap>
                          {inv.vendorName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {formatCurrencyCompact(inv.baseTotal, 'INR')}
                        </Typography>
                        <Chip
                          label={INVOICE_STATUS_LABELS[inv.status]}
                          size="small"
                          sx={{ mt: 0.5, height: 18, fontSize: '0.65rem', backgroundColor: tone.bg, color: tone.color, fontWeight: 600 }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          )}
        </Card>
      </Box>

      {/* Ageing + high-risk / payments */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Card sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, fontSize: '1.125rem', mb: 2 }}>
            Payables ageing
          </Typography>
          <Stack spacing={1.75}>
            {mockAgeing.map(b => {
              const max = Math.max(...mockAgeing.map(x => x.amountBase))
              const pct = (b.amountBase / max) * 100
              const overdue = b.label !== '0-30'
              return (
                <Box key={b.label}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {b.label === '0-30' ? 'Current' : `${b.label} days`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      {b.count} invoices · {formatCurrencyCompact(b.amountBase, 'INR')}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 8, borderRadius: tokens.radius.full,
                      backgroundColor: alpha(tokens.colors.primary, 0.08),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: tokens.radius.full,
                        backgroundColor: overdue ? tokens.colors.warning : tokens.colors.primary
                      }
                    }}
                  />
                </Box>
              )
            })}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
              FX exposure
            </Typography>
            <Stack direction="row" spacing={1}>
              {mockFxExposure.map(fx => (
                <Chip
                  key={fx.currency}
                  size="small"
                  label={`${fx.currency} ${formatCurrencyCompact(fx.exposureBase, 'INR')}`}
                  sx={{ backgroundColor: alpha(tokens.colors.secondary, 0.1), color: tokens.colors.secondary, fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Stack>
        </Card>

        <RoleGate
          roles={['l1_finance_employee', 'l2_finance_head', 'cfo', 'admin']}
          fallback={
            <Card sx={{ p: 3 }}>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, fontSize: '1.125rem', mb: 2 }}>
                Upcoming payments
              </Typography>
              {nextPayments.length === 0 ? (
                <Typography sx={{ color: tokens.colors.onSurfaceVariant }}>Nothing scheduled.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {nextPayments.map(p => (
                    <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, borderRadius: tokens.radius.lg, backgroundColor: tokens.colors.surfaceContainerLow }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{p.invoiceNumber}</Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                          {p.vendorName} · {p.rail.toUpperCase()}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontWeight: 700 }}>{formatCurrencyCompact(p.baseAmount, 'INR')}</Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                          {p.scheduledFor ?? '—'}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Card>
          }
        >
          <Card sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, fontSize: '1.125rem' }}>
                High-risk invoices
              </Typography>
              <Chip icon={<Warning sx={{ fontSize: 14 }} />} label="Fraud score ≥ 50" size="small" sx={{ backgroundColor: alpha(tokens.colors.error, 0.1), color: tokens.colors.error, fontWeight: 600 }} />
            </Stack>
            {topHighRisk.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <CheckCircle sx={{ color: tokens.colors.success, fontSize: 40, mb: 1 }} />
                <Typography sx={{ color: tokens.colors.onSurfaceVariant }}>No flagged invoices.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topHighRisk.map(inv => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.vendorName}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={inv.fraudScore}
                          sx={{
                            backgroundColor: inv.fraudScore >= 70 ? alpha(tokens.colors.error, 0.12) : alpha(tokens.colors.warning, 0.12),
                            color: inv.fraudScore >= 70 ? tokens.colors.error : tokens.colors.warning,
                            fontWeight: 700
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrencyCompact(inv.baseTotal, 'INR')}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Review">
                          <IconButton size="small" onClick={() => navigate(`/ap/invoice/${inv.id}`)}>
                            <ArrowForward fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </RoleGate>
      </Box>
    </Box>
  )
}

export default Dashboard
