import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material'
import {
  Search,
  Assessment,
  Shield,
  Warning,
  CheckCircle,
  FilterList,
  Download,
  Refresh,
  Visibility,
  Person,
  Receipt,
  AccountBalance,
  Settings,
  Lock,
  Schedule,
  TrendingUp,
  Info
} from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens, designTokens } from '@finance-ai/ui/theme'
import { formatCurrency, formatDate, formatDateTime } from '@finance-ai/core'

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

const AuditCard = styled(Card)(({ theme }) => ({
  borderRadius: tokens.radius.xl,
  border: 'none',
  backgroundColor: tokens.colors.surfaceContainerLowest
}))

const SeverityChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'severity'
})<{ severity: 'info' | 'warning' | 'error' | 'success' }>(({ severity }) => ({
  height: 24,
  fontSize: '0.625rem',
  fontWeight: 600,
  backgroundColor: severity === 'error'
    ? alpha(tokens.colors.error, 0.1)
    : severity === 'warning'
    ? alpha(tokens.colors.warning, 0.1)
    : severity === 'success'
    ? alpha(tokens.colors.success, 0.1)
    : alpha(tokens.colors.info, 0.1),
  color: severity === 'error'
    ? tokens.colors.error
    : severity === 'warning'
    ? tokens.colors.warning
    : severity === 'success'
    ? tokens.colors.success
    : tokens.colors.info,
  border: 'none'
}))

// Mock audit log data
const mockAuditLogs = [
  { id: '1', timestamp: '2024-01-20T14:30:00Z', user: { name: 'John Doe', role: 'Finance Manager' }, action: 'invoice_approved', resource: 'Invoice #INV-2024-001', details: 'Approved payment for $15,000 to Cloud Services Inc.', severity: 'success' as const, category: 'AP' },
  { id: '2', timestamp: '2024-01-20T14:25:00Z', user: { name: 'Sarah Smith', role: 'Fraud Analyst' }, action: 'fraud_alert_created', resource: 'Invoice #INV-2024-005', details: 'High-risk invoice flagged with fraud score of 82', severity: 'warning' as const, category: 'Fraud' },
  { id: '3', timestamp: '2024-01-20T14:20:00Z', user: { name: 'Mike Johnson', role: 'Admin' }, action: 'user_role_changed', resource: 'User: Emma Wilson', details: 'Role changed from "Viewer" to "Finance Manager"', severity: 'info' as const, category: 'Auth' },
  { id: '4', timestamp: '2024-01-20T14:15:00Z', user: { name: 'System', role: 'Automated' }, action: 'budget_limit_exceeded', resource: 'Budget: Marketing', details: 'Marketing budget exceeded 90% threshold. Alert triggered.', severity: 'warning' as const, category: 'Budget' },
  { id: '5', timestamp: '2024-01-20T14:10:00Z', user: { name: 'Emma Wilson', role: 'Budget Analyst' }, action: 'budget_created', resource: 'Budget: Q1 2024', details: 'Created new budget allocation for Engineering department', severity: 'success' as const, category: 'Budget' },
  { id: '6', timestamp: '2024-01-20T14:05:00Z', user: { name: 'John Doe', role: 'Finance Manager' }, action: 'payment_processed', resource: 'Payment #PAY-2024-089', details: 'Wire transfer of $45,000 to Vendor ABC completed', severity: 'success' as const, category: 'AP' },
  { id: '7', timestamp: '2024-01-20T14:00:00Z', user: { name: 'Sarah Smith', role: 'Fraud Analyst' }, action: 'invoice_rejected', resource: 'Invoice #INV-2024-003', details: 'Rejected due to suspicious vendor activity patterns', severity: 'error' as const, category: 'AP' },
  { id: '8', timestamp: '2024-01-20T13:55:00Z', user: { name: 'Mike Johnson', role: 'Admin' }, action: 'vendor_blocked', resource: 'Vendor: Marketing Agency XYZ', details: 'Vendor blocked due to compliance concerns', severity: 'error' as const, category: 'Vendor' },
  { id: '9', timestamp: '2024-01-20T13:50:00Z', user: { name: 'Emma Wilson', role: 'Budget Analyst' }, action: 'guardrail_updated', resource: 'Budget: Operations', details: 'Daily limit changed from $40,000 to $50,000', severity: 'info' as const, category: 'Budget' },
  { id: '10', timestamp: '2024-01-20T13:45:00Z', user: { name: 'John Doe', role: 'Finance Manager' }, action: 'login_success', resource: 'Session', details: 'Successful login from 192.168.1.100', severity: 'info' as const, category: 'Auth' },
  { id: '11', timestamp: '2024-01-20T13:40:00Z', user: { name: 'System', role: 'Automated' }, action: 'compliance_check_failed', resource: 'Invoice #INV-2024-002', details: 'W-9 document missing from vendor profile', severity: 'warning' as const, category: 'Compliance' },
  { id: '12', timestamp: '2024-01-20T13:35:00Z', user: { name: 'Sarah Smith', role: 'Fraud Analyst' }, action: 'fraud_model_updated', resource: 'Model: Invoice Anomaly', details: 'Updated fraud detection model v2.3.1 deployed', severity: 'info' as const, category: 'ML' },
]

const actionLabels: Record<string, string> = {
  invoice_approved: 'Invoice Approved',
  invoice_rejected: 'Invoice Rejected',
  fraud_alert_created: 'Fraud Alert Created',
  payment_processed: 'Payment Processed',
  budget_created: 'Budget Created',
  budget_limit_exceeded: 'Budget Limit Exceeded',
  guardrail_updated: 'Guardrail Updated',
  user_role_changed: 'User Role Changed',
  vendor_blocked: 'Vendor Blocked',
  login_success: 'Login Success',
  compliance_check_failed: 'Compliance Check Failed',
  fraud_model_updated: 'ML Model Updated',
}

const actionIcons: Record<string, React.ReactNode> = {
  invoice_approved: <CheckCircle sx={{ fontSize: 18 }} />,
  invoice_rejected: <Warning sx={{ fontSize: 18 }} />,
  fraud_alert_created: <Shield sx={{ fontSize: 18 }} />,
  payment_processed: <Receipt sx={{ fontSize: 18 }} />,
  budget_created: <AccountBalance sx={{ fontSize: 18 }} />,
  budget_limit_exceeded: <Warning sx={{ fontSize: 18 }} />,
  guardrail_updated: <Settings sx={{ fontSize: 18 }} />,
  user_role_changed: <Person sx={{ fontSize: 18 }} />,
  vendor_blocked: <Lock sx={{ fontSize: 18 }} />,
  login_success: <CheckCircle sx={{ fontSize: 18 }} />,
  compliance_check_failed: <Info sx={{ fontSize: 18 }} />,
  fraud_model_updated: <TrendingUp sx={{ fontSize: 18 }} />,
}

const AuditLog: React.FC = () => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  // Filter logs
  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter
    return matchesSearch && matchesCategory && matchesSeverity
  })

  // Summary stats
  const stats = {
    total: mockAuditLogs.length,
    warnings: mockAuditLogs.filter(l => l.severity === 'warning').length,
    errors: mockAuditLogs.filter(l => l.severity === 'error').length,
    today: mockAuditLogs.filter(l => {
      const logDate = new Date(l.timestamp).toDateString()
      return logDate === new Date().toDateString()
    }).length
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'error': return tokens.colors.error
      case 'warning': return tokens.colors.warning
      case 'success': return tokens.colors.success
      default: return tokens.colors.info
    }
  }

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
            Audit & Compliance
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1 }}>
            {stats.total} events recorded • {stats.warnings} warnings • {stats.errors} errors
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            sx={{
              borderRadius: tokens.radius.full,
              border: 'none',
              backgroundColor: tokens.colors.surfaceContainer,
              color: tokens.colors.primary,
              '&:hover': { backgroundColor: tokens.colors.surfaceContainerHigh, border: 'none' }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{
              borderRadius: tokens.radius.full,
              border: 'none',
              backgroundColor: tokens.colors.surfaceContainer,
              color: tokens.colors.primary,
              '&:hover': { backgroundColor: tokens.colors.surfaceContainerHigh, border: 'none' }
            }}
          >
            Export Report
          </Button>
        </Stack>
      </HeaderSection>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Total Events
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1 }}>
                {stats.total}
              </Typography>
            </Box>
            <Assessment sx={{ fontSize: 32, color: tokens.colors.primary }} />
          </Stack>
        </Card>

        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Warnings
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1, color: tokens.colors.warning }}>
                {stats.warnings}
              </Typography>
            </Box>
            <Warning sx={{ fontSize: 32, color: tokens.colors.warning }} />
          </Stack>
        </Card>

        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Errors
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1, color: tokens.colors.error }}>
                {stats.errors}
              </Typography>
            </Box>
            <Shield sx={{ fontSize: 32, color: tokens.colors.error }} />
          </Stack>
        </Card>

        <Card sx={{ borderRadius: tokens.radius.xl, p: 3, border: 'none', bgcolor: tokens.colors.surfaceContainerLowest }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase', fontWeight: 500 }}>
                Today
              </Typography>
              <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '1.75rem', fontWeight: 700, mt: 1 }}>
                {stats.today}
              </Typography>
            </Box>
            <Schedule sx={{ fontSize: 32, color: tokens.colors.info }} />
          </Stack>
        </Card>
      </Box>

      {/* Filters */}
      <AuditCard sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                placeholder="Search events..."
                fullWidth
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
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontFamily: '"Manrope", sans-serif' }}>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{
                    borderRadius: tokens.radius.lg,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    backgroundColor: tokens.colors.surfaceContainerLow
                  }}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="AP">AP</MenuItem>
                  <MenuItem value="Fraud">Fraud</MenuItem>
                  <MenuItem value="Budget">Budget</MenuItem>
                  <MenuItem value="Auth">Auth</MenuItem>
                  <MenuItem value="Vendor">Vendor</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                  <MenuItem value="ML">ML</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontFamily: '"Manrope", sans-serif' }}>Severity</InputLabel>
                <Select
                  value={severityFilter}
                  label="Severity"
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  sx={{
                    borderRadius: tokens.radius.lg,
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    backgroundColor: tokens.colors.surfaceContainerLow
                  }}
                >
                  <MenuItem value="all">All Severity</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                startIcon={<FilterList />}
                onClick={() => { setCategoryFilter('all'); setSeverityFilter('all'); setSearchQuery('') }}
                sx={{
                  borderRadius: tokens.radius.lg,
                  fontFamily: '"Manrope", sans-serif',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </AuditCard>

      {/* Audit Log Table */}
      <AuditCard>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: tokens.colors.surfaceContainerLow }}>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Timestamp
                </TableCell>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  User
                </TableCell>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Action
                </TableCell>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Resource
                </TableCell>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Details
                </TableCell>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Severity
                </TableCell>
                <TableCell sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Category
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                  <TableRow
                    key={log.id}
                    sx={{
                      backgroundColor: tokens.colors.surfaceContainerLowest,
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: tokens.colors.surfaceContainerLow
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                        {formatDateTime(log.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, bgcolor: tokens.colors.primary, fontSize: '0.625rem' }}>
                          {log.user.name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {log.user.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                            {log.user.role}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ color: getSeverityColor(log.severity) }}>
                          {actionIcons[log.action] || <Info sx={{ fontSize: 18 }} />}
                        </Box>
                        <Typography variant="body2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                          {actionLabels[log.action] || log.action}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.resource}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant, maxWidth: 300 }}>
                        {log.details}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <SeverityChip
                        label={log.severity.toUpperCase()}
                        severity={log.severity}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.category}
                        size="small"
                        sx={{
                          fontSize: '0.625rem',
                          backgroundColor: tokens.colors.surfaceContainer,
                          border: 'none'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredLogs.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            borderTop: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}`,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontFamily: '"Manrope", sans-serif'
            }
          }}
        />
      </AuditCard>
    </Box>
  )
}

export default AuditLog
