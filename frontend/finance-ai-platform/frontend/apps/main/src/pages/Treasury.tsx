import React from 'react'
import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { tokens, chartColors } from '@finance-ai/ui'
import { formatCurrency, formatCurrencyCompact, formatDate } from '@finance-ai/core'
import { mockCashflow, mockAgeing, mockFxExposure } from '../mocks/data'

const Treasury: React.FC = () => {
  const totalInflow = mockCashflow.reduce((s, c) => s + c.inflow, 0)
  const totalOutflow = mockCashflow.reduce((s, c) => s + c.outflow, 0)
  const netProjection = totalInflow - totalOutflow
  const totalFxExposure = mockFxExposure.reduce((s, f) => s + f.exposureBase, 0)
  const totalAgeing = mockAgeing.reduce((s, b) => s + b.amountBase, 0)

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: { xs: '1.75rem', lg: '2.25rem' },
            fontWeight: 700,
            color: tokens.colors.primary,
            letterSpacing: '-0.02em'
          }}
        >
          Treasury
        </Typography>
        <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
          12-week cashflow projection, ageing, and FX exposure
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Metric label="Projected Inflow" value={formatCurrencyCompact(totalInflow, 'INR')} tint={tokens.colors.success} />
        <Metric label="Projected Outflow" value={formatCurrencyCompact(totalOutflow, 'INR')} tint={tokens.colors.error} />
        <Metric label="Net Projection" value={formatCurrencyCompact(netProjection, 'INR')} tint={netProjection > 0 ? tokens.colors.success : tokens.colors.error} />
        <Metric label="FX Exposure" value={formatCurrencyCompact(totalFxExposure, 'INR')} tint={tokens.colors.secondary} />
      </Box>

      {/* Cashflow chart */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography sx={{ fontWeight: 600, mb: 2 }}>6-Week Cashflow Projection</Typography>
        <Box sx={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockCashflow}>
              <defs>
                <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tokens.colors.success} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tokens.colors.success} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tokens.colors.error} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tokens.colors.error} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(tokens.colors.outlineVariant, 0.25)} />
              <XAxis dataKey="date" tickFormatter={d => formatDate(d)} stroke={tokens.colors.onSurfaceVariant} style={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => formatCurrencyCompact(v as number, 'INR')} stroke={tokens.colors.onSurfaceVariant} style={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v: any) => formatCurrency(v, 'INR')}
                labelFormatter={d => formatDate(d as string)}
                contentStyle={{ borderRadius: tokens.radius.lg, border: 'none', boxShadow: tokens.shadows.ambient }}
              />
              <Legend />
              <Area type="monotone" dataKey="inflow" stroke={tokens.colors.success} fill="url(#inflow)" name="Inflow" />
              <Area type="monotone" dataKey="outflow" stroke={tokens.colors.error} fill="url(#outflow)" name="Outflow" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 3 }}>
        {/* Ageing */}
        <Card sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>Receivables Ageing</Typography>
          <Box sx={{ height: 260, mb: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAgeing}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(tokens.colors.outlineVariant, 0.25)} />
                <XAxis dataKey="label" stroke={tokens.colors.onSurfaceVariant} style={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => formatCurrencyCompact(v as number, 'INR')} stroke={tokens.colors.onSurfaceVariant} style={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(v, 'INR')}
                  contentStyle={{ borderRadius: tokens.radius.lg, border: 'none', boxShadow: tokens.shadows.ambient }}
                />
                <Bar dataKey="amountBase" fill={tokens.colors.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={1}>
            {mockAgeing.map(b => {
              const pct = totalAgeing ? (b.amountBase / totalAgeing) * 100 : 0
              const color = b.label === '90+' ? tokens.colors.error : b.label === '61-90' ? tokens.colors.warning : tokens.colors.primary
              return (
                <Stack key={b.label} direction="row" alignItems="center" spacing={2}>
                  <Typography sx={{ minWidth: 60, fontWeight: 600 }}>{b.label}d</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 6,
                        borderRadius: tokens.radius.full,
                        backgroundColor: alpha(color, 0.1),
                        '& .MuiLinearProgress-bar': { backgroundColor: color }
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', color: tokens.colors.onSurfaceVariant, minWidth: 120, textAlign: 'right' }}>
                    {b.count} · {formatCurrency(b.amountBase, 'INR')}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
        </Card>

        {/* FX Exposure */}
        <Card sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>FX Exposure</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Currency</TableCell>
                <TableCell align="right">Exposure</TableCell>
                <TableCell align="right">Base (INR)</TableCell>
                <TableCell align="right">#</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockFxExposure.map((fx, i) => (
                <TableRow key={fx.currency}>
                  <TableCell>
                    <Chip
                      label={fx.currency}
                      size="small"
                      sx={{
                        backgroundColor: alpha(chartColors[i % chartColors.length], 0.12),
                        color: chartColors[i % chartColors.length],
                        fontWeight: 700
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(fx.exposure, fx.currency)}</TableCell>
                  <TableCell align="right"><b>{formatCurrencyCompact(fx.exposureBase, 'INR')}</b></TableCell>
                  <TableCell align="right">{fx.invoiceCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Box>
    </Box>
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

export default Treasury
