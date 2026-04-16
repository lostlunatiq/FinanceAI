import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Link,
  Alert,
  CircularProgress,
  MenuItem,
  Divider
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { styled } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui'
import { useAuth, MOCK_USERS, ROLE_LABELS } from '@finance-ai/auth'
import type { UserRole } from '@finance-ai/core'

const LoginContainer = styled(Box)(() => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: tokens.colors.background,
  padding: 24
}))

const LoginCard = styled(Box)(() => ({
  width: '100%',
  maxWidth: 440,
  padding: 40,
  borderRadius: tokens.radius.xl,
  backgroundColor: tokens.colors.surfaceContainerLowest,
  boxShadow: tokens.shadows.ambient
}))

/**
 * Dev login supports two flows:
 *  (a) "mock" quick-switch — pick a role from the dropdown and sign in.
 *      Uses AuthContext.setMockRole() and skips the credentials form.
 *  (b) classic email+password flow — kept so the form works once backend is
 *      wired up. Calls login() which in the mock provider just resolves.
 */
const Login: React.FC = () => {
  const [email, setEmail] = useState('neha.sharma@financeai.co')
  const [password, setPassword] = useState('demo')
  const [mockRole, setMockRoleState] = useState<UserRole>('l1_finance_employee')
  const [totp, setTotp] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')
  const { login, verifyMfa, isLoading, setMockRole } = useAuth() as any
  const navigate = useNavigate()

  const handleMockLogin = () => {
    setError('')
    if (setMockRole) setMockRole(mockRole)
    navigate('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    setError('')
    try {
      const result = await login(email, password)
      if (result === 'mfa_required') {
        setMfaRequired(true)
        return
      }
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Login failed.')
    }
  }

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(totp)) {
      setError('Enter a 6-digit code.')
      return
    }
    try {
      await verifyMfa(totp)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Invalid code.')
    }
  }

  return (
    <LoginContainer>
      <LoginCard component="form" onSubmit={mfaRequired ? handleMfa : handleSubmit}>
        <Typography
          variant="h4"
          sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 800, color: tokens.colors.primary, textAlign: 'center', mb: 1 }}
        >
          FinanceAI
        </Typography>
        <Typography sx={{ textAlign: 'center', color: tokens.colors.onSurfaceVariant, mb: 3 }}>
          {mfaRequired ? 'Enter your verification code' : 'Welcome back. Sign in to continue.'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: tokens.radius.lg }}>{error}</Alert>}

        {!mfaRequired && setMockRole && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Demo mode — pick a role to preview the platform from that perspective.
            </Alert>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField select label="Demo Role" value={mockRole} onChange={e => setMockRoleState(e.target.value as UserRole)} fullWidth>
                {(Object.keys(MOCK_USERS) as UserRole[]).map(r => (
                  <MenuItem key={r} value={r}>{ROLE_LABELS[r]} — {MOCK_USERS[r].firstName} {MOCK_USERS[r].lastName}</MenuItem>
                ))}
              </TextField>
              <Button
                fullWidth
                variant="contained"
                onClick={handleMockLogin}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
                  borderRadius: tokens.radius.lg,
                  py: 1.5,
                  fontFamily: '"Manrope", sans-serif',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Continue as {ROLE_LABELS[mockRole]}
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }}>or sign in with credentials</Divider>
          </>
        )}

        {!mfaRequired ? (
          <Stack spacing={2}>
            <TextField label="Email" type="email" fullWidth value={email} onChange={e => setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth value={password} onChange={e => setPassword(e.target.value)} />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{
                background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
                borderRadius: tokens.radius.lg,
                py: 1.5,
                fontFamily: '"Manrope", sans-serif',
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="6-digit code"
              value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ maxLength: 6, inputMode: 'numeric', style: { fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.3em', textAlign: 'center' } }}
              autoFocus
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{
                background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
                borderRadius: tokens.radius.lg,
                py: 1.5,
                fontFamily: '"Manrope", sans-serif',
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Verify'}
            </Button>
            <Button onClick={() => { setMfaRequired(false); setTotp('') }} sx={{ textTransform: 'none' }}>
              Back
            </Button>
          </Stack>
        )}

        {!mfaRequired && (
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Link component={RouterLink} to="/forgot-password" sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '0.875rem' }}>
              Forgot password?
            </Link>
          </Stack>
        )}
      </LoginCard>
    </LoginContainer>
  )
}

export default Login
