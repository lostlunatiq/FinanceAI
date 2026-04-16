import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Stack,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material'
import { Search, Add, Verified, Warning, BusinessCenter, OpenInNew } from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui'
import {
  formatCurrency,
  formatDate,
  VENDOR_STATUS_LABELS,
  isValidGstin,
  isValidPan
} from '@finance-ai/core'
import type { VendorStatus } from '@finance-ai/core'
import { useAuth } from '@finance-ai/auth'
import { RoleGate } from '@finance-ai/rbac'
import { mockVendors, mockInvoices, mockPayments } from '../mocks/data'

const PrimaryButton = styled(Button)(() => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 22px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  textTransform: 'none'
}))

const STATUS_COLORS: Record<VendorStatus, string> = {
  active: '#10b981',
  pending_verification: '#f59e0b',
  suspended: '#ef4444',
  archived: '#94a3b8'
}

const VendorPortal: React.FC = () => {
  const { user } = useAuth()
  const isVendor = user?.role === 'vendor'
  const [tab, setTab] = useState(0)
  const [query, setQuery] = useState('')

  const vendors = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = isVendor ? mockVendors.filter(v => v.id === 'v3') : mockVendors
    return base.filter(v => !q || v.legalName.toLowerCase().includes(q) || v.gstin?.toLowerCase().includes(q))
  }, [query, isVendor])

  // Vendor self-view: show own invoices + payments
  if (isVendor) {
    const vendor = mockVendors.find(v => v.id === 'v3')
    const myInvoices = mockInvoices.filter(i => i.vendorId === vendor?.id)
    const myPayments = mockPayments.filter(p => p.vendorId === vendor?.id)
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '2rem', fontWeight: 700, color: tokens.colors.primary, letterSpacing: '-0.02em' }}>
          Vendor Portal
        </Typography>
        <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1, mb: 3 }}>
          Welcome, {vendor?.displayName}. Submit invoices and track payments.
        </Typography>

        {vendor && (
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
              <Avatar sx={{ width: 56, height: 56 }}>{vendor.displayName.charAt(0)}</Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{vendor.legalName}</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                    GSTIN: <b>{vendor.gstin}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                    PAN: <b>{vendor.pan}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                    Terms: <b>NET {vendor.paymentTerms}</b>
                  </Typography>
                </Stack>
              </Box>
              <Chip
                icon={<Verified fontSize="small" />}
                label={VENDOR_STATUS_LABELS[vendor.status]}
                sx={{ backgroundColor: alpha(STATUS_COLORS[vendor.status], 0.12), color: STATUS_COLORS[vendor.status], fontWeight: 600 }}
              />
            </Stack>
          </Card>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
          <MetricCard label="Invoices Submitted" value={myInvoices.length.toString()} />
          <MetricCard label="Outstanding" value={formatCurrency(myInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0), 'USD')} />
          <MetricCard label="Paid YTD" value={formatCurrency(myPayments.filter(p => p.status === 'paid' || p.status === 'reconciled').reduce((s, p) => s + p.amount, 0), 'USD')} />
        </Box>

        <Card>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}` }}>
            <Tab label={`My Invoices (${myInvoices.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Payments (${myPayments.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
          {tab === 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Issued</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myInvoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell align="right">{formatCurrency(inv.totalAmount, inv.currency)}</TableCell>
                    <TableCell>{inv.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Rail</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ref</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myPayments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.invoiceNumber}</TableCell>
                    <TableCell>{p.rail.toUpperCase()}</TableCell>
                    <TableCell align="right">{formatCurrency(p.amount, p.currency)}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.externalRef || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </Box>
    )
  }

  // Finance team view: full vendor directory
  const summary = {
    total: vendors.length,
    active: vendors.filter(v => v.status === 'active').length,
    pending: vendors.filter(v => v.status === 'pending_verification').length,
    avgRisk: vendors.length ? Math.round(vendors.reduce((s, v) => s + v.riskScore, 0) / vendors.length) : 0
  }

  return (
    <Box sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: { xs: '1.75rem', lg: '2.25rem' }, fontWeight: 700, color: tokens.colors.primary, letterSpacing: '-0.02em' }}>
            Vendor Directory
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
            {summary.total} vendors · {summary.active} active · {summary.pending} pending verification
          </Typography>
        </Box>
        <RoleGate capability={['vendor:read']}>
          <PrimaryButton startIcon={<Add />}>Onboard Vendor</PrimaryButton>
        </RoleGate>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <MetricCard label="Total Vendors" value={summary.total.toString()} icon={<BusinessCenter />} />
        <MetricCard label="Active" value={summary.active.toString()} tint="#10b981" />
        <MetricCard label="Pending Verification" value={summary.pending.toString()} tint={tokens.colors.warning} />
        <MetricCard label="Avg Risk Score" value={summary.avgRisk.toString()} tint={tokens.colors.error} />
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Search by name or GSTIN..."
            size="small"
            value={query}
            onChange={e => setQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: tokens.colors.onSurfaceVariant }} />
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>GSTIN</TableCell>
                <TableCell>PAN</TableCell>
                <TableCell>Terms</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Status</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map(v => {
                const gstinOk = v.gstin ? isValidGstin(v.gstin) : true
                const panOk = v.pan ? isValidPan(v.pan) : true
                return (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>{v.displayName.charAt(0)}</Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{v.legalName}</Typography>
                          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                            {v.category} · {v.country}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {v.gstin || '—'}
                      {!gstinOk && <Warning fontSize="small" sx={{ color: tokens.colors.error, ml: 1, verticalAlign: 'middle' }} />}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {v.pan || '—'}
                      {!panOk && <Warning fontSize="small" sx={{ color: tokens.colors.error, ml: 1, verticalAlign: 'middle' }} />}
                    </TableCell>
                    <TableCell>NET {v.paymentTerms}</TableCell>
                    <TableCell>
                      <Box sx={{ width: 80 }}>
                        <LinearProgress
                          variant="determinate"
                          value={v.riskScore}
                          sx={{
                            height: 6,
                            borderRadius: tokens.radius.full,
                            backgroundColor: alpha(tokens.colors.primary, 0.1),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: v.riskScore > 60 ? tokens.colors.error : v.riskScore > 30 ? tokens.colors.warning : tokens.colors.success
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>{v.riskScore}/100</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={VENDOR_STATUS_LABELS[v.status]}
                        sx={{ backgroundColor: alpha(STATUS_COLORS[v.status], 0.12), color: STATUS_COLORS[v.status], fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" sx={{ color: tokens.colors.primary }}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

const MetricCard: React.FC<{ label: string; value: string; tint?: string; icon?: React.ReactNode }> = ({ label, value, tint, icon }) => (
  <Card sx={{ p: 3 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="overline" sx={{ color: tokens.colors.onSurfaceVariant }}>{label}</Typography>
        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.5rem', fontWeight: 700, mt: 0.5, color: tint }}>
          {value}
        </Typography>
      </Box>
      {icon && <Box sx={{ color: tint || tokens.colors.primary, fontSize: 28, display: 'flex' }}>{icon}</Box>}
    </Stack>
  </Card>
)

export default VendorPortal
