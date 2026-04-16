import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  LinearProgress,
  Chip,
  TextField,
  InputAdornment,
  Modal,
  Paper,
  Divider,
  Grid,
  Avatar,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import {
  Add,
  Search,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Edit,
  Close,
  FilterList,
  ShowChart,
  PieChart,
  BarChart
} from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens, designTokens } from '@finance-ai/ui/theme'
import { formatCurrency, formatPercentage } from '@finance-ai/core'
import {
  AreaChartComponent,
  BarChartComponent,
  PieChartComponent
} from '@finance-ai/ui'

// Styled components
const HeaderSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  marginBottom: 32,
  '@media (min-width: 768px)': {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  }
}))

const PrimaryButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '12px 24px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  fontSize: '0.875rem',
  boxShadow: `0 4px 16px ${alpha(tokens.colors.primary, 0.25)}`,
  textTransform: 'none',
  '&:hover': {
    boxShadow: `0 6px 24px ${alpha(tokens.colors.primary, 0.35)}`,
  }
}))

const GlassModal = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto',
  backgroundColor: alpha(tokens.colors.surfaceContainerLowest, 0.95),
  backdropFilter: 'blur(24px)',
  borderRadius: tokens.radius.xl,
  boxShadow: tokens.shadows.ambient
}))

const BudgetCard = styled(Card)(({ theme }) => ({
  borderRadius: tokens.radius.xl,
  border: 'none',
  backgroundColor: tokens.colors.surfaceContainerLowest,
  transition: 'box-shadow 0.2s',
  '&:hover': {
    boxShadow: tokens.shadows.ambient
  }
}))

const GuardrailChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'severity'
})<{ severity: 'normal' | 'warning' | 'critical' }>(({ severity }) => ({
  height: 24,
  fontSize: '0.625rem',
  fontWeight: 600,
  backgroundColor: severity === 'critical' 
    ? alpha(tokens.colors.error, 0.1)
    : severity === 'warning'
    ? alpha(tokens.colors.warning, 0.1)
    : alpha(tokens.colors.success, 0.1),
  color: severity === 'critical'
    ? tokens.colors.error
    : severity === 'warning'
    ? tokens.colors.warning
    : tokens.colors.success,
  border: 'none'
}))

// Mock budget data
const mockBudgets = [
  {
    id: '1',
    department: 'Engineering',
    allocated: 2000000,
    spent: 1450000,
    remaining: 550000,
    utilization: 72.5,
    status: 'active',
    guardrails: { maxTransaction: 50000, dailyLimit: 200000, alertThreshold: 80 },
    trend: 'up' as const,
    monthlyData: [
      { date: 'Jan', value: 180000 },
      { date: 'Feb', value: 220000 },
      { date: 'Mar', value: 195000 },
      { date: 'Apr', value: 240000 },
      { date: 'May', value: 210000 },
      { date: 'Jun', value: 205000 }
    ]
  },
  {
    id: '2',
    department: 'Marketing',
    allocated: 850000,
    spent: 765000,
    remaining: 85000,
    utilization: 90,
    status: 'warning',
    guardrails: { maxTransaction: 25000, dailyLimit: 75000, alertThreshold: 85 },
    trend: 'down' as const,
    monthlyData: [
      { date: 'Jan', value: 95000 },
      { date: 'Feb', value: 120000 },
      { date: 'Mar', value: 150000 },
      { date: 'Apr', value: 135000 },
      { date: 'May', value: 145000 },
      { date: 'Jun', value: 120000 }
    ]
  },
  {
    id: '3',
    department: 'Sales',
    allocated: 1200000,
    spent: 720000,
    remaining: 480000,
    utilization: 60,
    status: 'active',
    guardrails: { maxTransaction: 30000, dailyLimit: 100000, alertThreshold: 85 },
    trend: 'up' as const,
    monthlyData: [
      { date: 'Jan', value: 100000 },
      { date: 'Feb', value: 110000 },
      { date: 'Mar', value: 125000 },
      { date: 'Apr', value: 130000 },
      { date: 'May', value: 140000 },
      { date: 'Jun', value: 115000 }
    ]
  },
  {
    id: '4',
    department: 'Operations',
    allocated: 600000,
    spent: 590000,
    remaining: 10000,
    utilization: 98.3,
    status: 'critical',
    guardrails: { maxTransaction: 15000, dailyLimit: 50000, alertThreshold: 90 },
    trend: 'down' as const,
    monthlyData: [
      { date: 'Jan', value: 85000 },
      { date: 'Feb', value: 95000 },
      { date: 'Mar', value: 110000 },
      { date: 'Apr', value: 120000 },
      { date: 'May', value: 100000 },
      { date: 'Jun', value: 80000 }
    ]
  },
  {
    id: '5',
    department: 'HR',
    allocated: 400000,
    spent: 280000,
    remaining: 120000,
    utilization: 70,
    status: 'active',
    guardrails: { maxTransaction: 20000, dailyLimit: 40000, alertThreshold: 85 },
    trend: 'up' as const,
    monthlyData: [
      { date: 'Jan', value: 40000 },
      { date: 'Feb', value: 45000 },
      { date: 'Mar', value: 50000 },
      { date: 'Apr', value: 48000 },
      { date: 'May', value: 52000 },
      { date: 'Jun', value: 45000 }
    ]
  },
  {
    id: '6',
    department: 'Finance',
    allocated: 550000,
    spent: 385000,
    remaining: 165000,
    utilization: 70,
    status: 'active',
    guardrails: { maxTransaction: 25000, dailyLimit: 75000, alertThreshold: 85 },
    trend: 'up' as const,
    monthlyData: [
      { date: 'Jan', value: 55000 },
      { date: 'Feb', value: 60000 },
      { date: 'Mar', value: 65000 },
      { date: 'Apr', value: 70000 },
      { date: 'May', value: 75000 },
      { date: 'Jun', value: 60000 }
    ]
  }
]

const BudgetManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Summary stats
  const stats = {
    totalAllocated: mockBudgets.reduce((sum, b) => sum + b.allocated, 0),
    totalSpent: mockBudgets.reduce((sum, b) => sum + b.spent, 0),
    totalRemaining: mockBudgets.reduce((sum, b) => sum + b.remaining, 0),
    avgUtilization: mockBudgets.reduce((sum, b) => sum + b.utilization, 0) / mockBudgets.length,
    warningCount: mockBudgets.filter(b => b.status === 'warning' || b.status === 'critical').length
  }

  const filteredBudgets = mockBudgets.filter(b =>
    b.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getUtilizationColor = (utilization: number): string => {
    if (utilization >= 95) return tokens.colors.error
    if (utilization >= 85) return tokens.colors.warning
    return tokens.colors.success
  }

  const getGuardrailSeverity = (utilization: number, threshold: number): 'normal' | 'warning' | 'critical' => {
    if (utilization >= threshold + 10) return 'critical'
    if (utilization >= threshold) return 'warning'
    return 'normal'
  }

  // Chart data for spending distribution
  const spendingData = mockBudgets.map(b => ({
    name: b.department,
    value: b.spent
  }))

  // Monthly trend data
  const monthlyTrend = mockBudgets[0].monthlyData.map((d, i) => ({
    date: d.date,
    value: mockBudgets.reduce((sum, b) => sum + (b.monthlyData[i]?.value || 0), 0),
    forecast: mockBudgets.reduce((sum, b) => sum + (b.monthlyData[i]?.value || 0), 0) * 1.05
  }))

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <HeaderSection>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: { xs: '2rem', lg: '2.5rem' },
              fontWeight: 700,
              color: tokens.colors.primary,
              letterSpacing: '-0.02em'
            }}
          >
            Budgetary Guardrails
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1 }}>
            {mockBudgets.length} departments • {formatCurrency(stats.totalSpent)} spent • {stats.warningCount} alerts
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            placeholder="Search departments..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: tokens.colors.onSurfaceVariant }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: tokens.radius.xl,
                backgroundColor: tokens.colors.surfaceContainerLow,
                border: 'none',
                '& fieldset': { border: 'none' }
              }
            }}
            sx={{ width: 280 }}
          />
          <PrimaryButton startIcon={<Add />} onClick={() => setCreateModalOpen(true)}>
            New Budget
          </PrimaryButton>
        </Stack>
      </HeaderSection>

      {/* Summary Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Total Allocated
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1 }}>
                {formatCurrency(stats.totalAllocated)}
              </Typography>
            </Box>
            <AccountBalance sx={{ fontSize: 32, color: tokens.colors.primary }} />
          </Stack>
        </Card>

        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Total Spent
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1 }}>
                {formatCurrency(stats.totalSpent)}
              </Typography>
            </Box>
            <TrendingUp sx={{ fontSize: 32, color: tokens.colors.secondary }} />
          </Stack>
        </Card>

        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Remaining
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1, color: tokens.colors.success }}>
                {formatCurrency(stats.totalRemaining)}
              </Typography>
            </Box>
            <TrendingDown sx={{ fontSize: 32, color: tokens.colors.success }} />
          </Stack>
        </Card>

        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Avg Utilization
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1 }}>
                {stats.avgUtilization.toFixed(1)}%
              </Typography>
            </Box>
            <ShowChart sx={{ fontSize: 32, color: tokens.colors.info }} />
          </Stack>
        </Card>
      </Box>

      {/* Charts Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
        <AreaChartComponent
          data={monthlyTrend}
          title="Monthly Spending Trend"
          height={280}
        />
        <PieChartComponent
          data={spendingData}
          title="Spending by Department"
          height={280}
        />
      </Box>

      {/* Budget Cards */}
      <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 3 }}>
        Department Budgets
      </Typography>

      <Grid container spacing={3}>
        {filteredBudgets.map((budget) => (
          <Grid item xs={12} md={6} lg={4} key={budget.id}>
            <BudgetCard
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedBudget(budget)
                setDetailModalOpen(true)
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: budget.status === 'critical'
                          ? tokens.colors.error
                          : budget.status === 'warning'
                          ? tokens.colors.warning
                          : tokens.colors.primary,
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      {budget.department.substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                        {budget.department}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                        Fiscal Year 2024
                      </Typography>
                    </Box>
                  </Stack>
                  <GuardrailChip
                    label={budget.status === 'critical' ? 'Critical' : budget.status === 'warning' ? 'Warning' : 'Active'}
                    severity={getGuardrailSeverity(budget.utilization, budget.guardrails.alertThreshold)}
                    size="small"
                  />
                </Stack>

                {/* Utilization Progress */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      Budget Utilization
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: getUtilizationColor(budget.utilization) }}
                    >
                      {budget.utilization.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={budget.utilization}
                    sx={{
                      height: 8,
                      borderRadius: tokens.radius.full,
                      backgroundColor: alpha(getUtilizationColor(budget.utilization), 0.15),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getUtilizationColor(budget.utilization),
                        borderRadius: tokens.radius.full
                      }
                    }}
                  />
                </Box>

                {/* Amount Details */}
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      Allocated
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      {formatCurrency(budget.allocated)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      Spent
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      {formatCurrency(budget.spent)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      Remaining
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, color: tokens.colors.success }}
                    >
                      {formatCurrency(budget.remaining)}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), my: 2 }} />

                {/* Guardrails */}
                <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, display: 'block', mb: 1 }}>
                  Guardrails
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Max: ${formatCurrency(budget.guardrails.maxTransaction)}`}
                    size="small"
                    sx={{ fontSize: '0.625rem', height: 20, bgcolor: tokens.colors.surfaceContainer, border: 'none' }}
                  />
                  <Chip
                    label={`Daily: ${formatCurrency(budget.guardrails.dailyLimit)}`}
                    size="small"
                    sx={{ fontSize: '0.625rem', height: 20, bgcolor: tokens.colors.surfaceContainer, border: 'none' }}
                  />
                  <Chip
                    label={`Alert: ${budget.guardrails.alertThreshold}%`}
                    size="small"
                    sx={{ fontSize: '0.625rem', height: 20, bgcolor: tokens.colors.surfaceContainer, border: 'none' }}
                  />
                </Stack>
              </CardContent>
            </BudgetCard>
          </Grid>
        ))}
      </Grid>

      {/* Create Budget Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <GlassModal>
          <Box sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
                Create Budget
              </Typography>
              <IconButton onClick={() => setCreateModalOpen(false)}>
                <Close />
              </IconButton>
            </Stack>

            <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), mb: 3 }} />

            <Stack spacing={3}>
              <TextField
                label="Department"
                fullWidth
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
              <TextField
                label="Allocated Amount"
                type="number"
                fullWidth
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
              <TextField
                label="Fiscal Year"
                type="number"
                fullWidth
                defaultValue={2024}
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />

              <Typography variant="subtitle2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                Guardrails
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Max Transaction"
                  type="number"
                  fullWidth
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
                <TextField
                  label="Daily Limit"
                  type="number"
                  fullWidth
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Stack>
              <TextField
                label="Alert Threshold"
                type="number"
                fullWidth
                defaultValue={85}
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
                helperText="Alert when utilization exceeds this percentage"
              />
            </Stack>

            <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), my: 3 }} />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                onClick={() => setCreateModalOpen(false)}
                sx={{
                  borderRadius: tokens.radius.lg,
                  fontFamily: '"Manrope", sans-serif',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Cancel
              </Button>
              <PrimaryButton onClick={() => setCreateModalOpen(false)}>
                Create Budget
              </PrimaryButton>
            </Stack>
          </Box>
        </GlassModal>
      </Modal>

      {/* Budget Detail Modal */}
      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)}>
        <GlassModal sx={{ width: 800 }}>
          <Box sx={{ p: 4 }}>
            {selectedBudget && (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
                    {selectedBudget.department} Budget
                  </Typography>
                  <IconButton onClick={() => setDetailModalOpen(false)}>
                    <Close />
                  </IconButton>
                </Stack>

                <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                          Allocated Budget
                        </Typography>
                        <Typography variant="h4" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700, mt: 1 }}>
                          {formatCurrency(selectedBudget.allocated)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                          Spent
                        </Typography>
                        <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mt: 1 }}>
                          {formatCurrency(selectedBudget.spent)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                          Remaining
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontFamily: '"Manrope", sans-serif',
                            fontWeight: 600,
                            mt: 1,
                            color: tokens.colors.success
                          }}
                        >
                          {formatCurrency(selectedBudget.remaining)}
                        </Typography>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2">Utilization</Typography>
                          <Typography sx={{ fontWeight: 600, color: getUtilizationColor(selectedBudget.utilization) }}>
                            {selectedBudget.utilization.toFixed(1)}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={selectedBudget.utilization}
                          sx={{
                            height: 12,
                            borderRadius: tokens.radius.full,
                            backgroundColor: alpha(getUtilizationColor(selectedBudget.utilization), 0.15),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getUtilizationColor(selectedBudget.utilization),
                              borderRadius: tokens.radius.full
                            }
                          }}
                        />
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      Guardrails
                    </Typography>
                    <Card sx={{ borderRadius: tokens.radius.lg, bgcolor: tokens.colors.surfaceContainerLow, border: 'none', mb: 3 }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                              Max Transaction
                            </Typography>
                            <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                              {formatCurrency(selectedBudget.guardrails.maxTransaction)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                              Daily Limit
                            </Typography>
                            <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                              {formatCurrency(selectedBudget.guardrails.dailyLimit)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                              Alert Threshold
                            </Typography>
                            <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                              {selectedBudget.guardrails.alertThreshold}%
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Typography variant="subtitle2" sx={{ mb: 2, fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      Monthly Trend
                    </Typography>
                    <Box sx={{ height: 200 }}>
                      <BarChartComponent
                        data={selectedBudget.monthlyData.map((d: any) => ({
                          name: d.date,
                          value: d.value,
                          target: selectedBudget.allocated / 12
                        }))}
                        title=""
                        height={180}
                      />
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), my: 3 }} />

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    startIcon={<Edit />}
                    sx={{
                      borderRadius: tokens.radius.lg,
                      fontFamily: '"Manrope", sans-serif',
                      fontWeight: 600,
                      textTransform: 'none'
                    }}
                  >
                    Edit Budget
                  </Button>
                  <PrimaryButton onClick={() => setDetailModalOpen(false)}>
                    Close
                  </PrimaryButton>
                </Stack>
              </>
            )}
          </Box>
        </GlassModal>
      </Modal>
    </Box>
  )
}

export default BudgetManagement
