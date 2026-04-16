import React from 'react'
import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button
} from '@mui/material'
import { Add, DragIndicator } from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui'
import { formatCurrency, ROLE_LABELS } from '@finance-ai/core'
import { RoleGate } from '@finance-ai/rbac'
import { mockPolicies } from '../mocks/data'

const PrimaryButton = styled(Button)(() => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 22px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  textTransform: 'none'
}))

const Policies: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: { xs: '1.75rem', lg: '2.25rem' }, fontWeight: 700, color: tokens.colors.primary, letterSpacing: '-0.02em' }}>
            Approval Policies
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
            Policies are evaluated by priority (highest first) — the first match determines the approval chain.
          </Typography>
        </Box>
        <RoleGate roles={['cfo', 'admin']}>
          <PrimaryButton startIcon={<Add />}>New Policy</PrimaryButton>
        </RoleGate>
      </Stack>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Policy Name</TableCell>
              <TableCell>Amount Range (INR)</TableCell>
              <TableCell>Approval Chain</TableCell>
              <TableCell align="center">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...mockPolicies].sort((a, b) => b.priority - a.priority).map(p => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <DragIndicator sx={{ color: tokens.colors.outlineVariant }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={p.priority}
                    size="small"
                    sx={{ backgroundColor: alpha(tokens.colors.primary, 0.1), color: tokens.colors.primary, fontWeight: 700 }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                <TableCell>
                  {formatCurrency(p.minAmountBase, 'INR')}
                  {p.maxAmountBase ? ` — ${formatCurrency(p.maxAmountBase, 'INR')}` : ' and above'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {p.requiredChain.map((role, idx) => (
                      <React.Fragment key={`${p.id}-${role}-${idx}`}>
                        <Chip
                          size="small"
                          label={ROLE_LABELS[role]}
                          sx={{ backgroundColor: alpha(tokens.colors.secondary, 0.1), color: tokens.colors.secondary, fontWeight: 600 }}
                        />
                        {idx < p.requiredChain.length - 1 && (
                          <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontSize: '0.75rem', lineHeight: 2 }}>→</Typography>
                        )}
                      </React.Fragment>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Switch checked={p.isActive} disabled />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}

export default Policies
