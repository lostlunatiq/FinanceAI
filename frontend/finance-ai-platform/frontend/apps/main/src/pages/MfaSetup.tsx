import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Stack,
  Button,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip
} from '@mui/material'
import { Security, CheckCircle, QrCode2 } from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui'
import { useAuth } from '@finance-ai/auth'

const PrimaryButton = styled(Button)(() => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 22px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  textTransform: 'none'
}))

/**
 * MFA enrolment flow:
 *   1. user clicks "Begin setup" → backend POST /auth/mfa/setup returns { secret, qrUri }
 *   2. user scans QR in authenticator app (Google/Authy/1Password)
 *   3. user submits a TOTP code → POST /auth/mfa/enable
 *
 * In the mock build, the QR content is stubbed; code "123456" "enables" the flow.
 */

const MOCK_SECRET = 'JBSWY3DPEHPK3PXP'
const MOCK_QR = `otpauth://totp/FinanceAI:neha.sharma@financeai.co?secret=${MOCK_SECRET}&issuer=FinanceAI`

const MfaSetup: React.FC = () => {
  const { user } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [totp, setTotp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(user?.mfaEnabled ?? false)

  const onEnable = async () => {
    setError(null)
    if (!/^\d{6}$/.test(totp)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    // Mock: accept 123456; real impl: await authApi.enableMfa(totp)
    if (totp !== '123456') {
      setError('Invalid code. In mock mode, use 123456.')
      return
    }
    setEnabled(true)
    setActiveStep(3)
  }

  if (enabled && activeStep !== 3) {
    return (
      <Box sx={{ py: 4 }}>
        <Card sx={{ p: 4, maxWidth: 640 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <CheckCircle sx={{ color: tokens.colors.success, fontSize: 32 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem' }}>MFA is enabled</Typography>
          </Stack>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 2 }}>
            Your account is protected by TOTP. To disable it (not recommended), contact an administrator.
          </Typography>
          <Chip icon={<Security fontSize="small" />} label="TOTP active" color="success" />
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: { xs: '1.75rem', lg: '2.25rem' }, fontWeight: 700, color: tokens.colors.primary, letterSpacing: '-0.02em' }}>
          Two-Factor Authentication
        </Typography>
        <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
          Required for CFO and administrator accounts. Recommended for everyone.
        </Typography>
      </Box>

      <Card sx={{ p: 4, maxWidth: 720 }}>
        <Stepper orientation="vertical" activeStep={activeStep}>
          <Step>
            <StepLabel>Begin setup</StepLabel>
            <StepContent>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 2 }}>
                We'll generate a secret key that links your authenticator app to your FinanceAI account.
              </Typography>
              <PrimaryButton onClick={() => setActiveStep(1)} startIcon={<Security />}>
                Generate secret
              </PrimaryButton>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Scan the QR code</StepLabel>
            <StepContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
                <Box
                  sx={{
                    width: 200,
                    height: 200,
                    backgroundColor: alpha(tokens.colors.primary, 0.05),
                    borderRadius: tokens.radius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <QrCode2 sx={{ fontSize: 120, color: tokens.colors.primary }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>Or enter the key manually:</Typography>
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '1.125rem',
                      letterSpacing: '0.1em',
                      p: 1.5,
                      backgroundColor: tokens.colors.surfaceContainerLow,
                      borderRadius: tokens.radius.md,
                      mb: 2
                    }}
                  >
                    {MOCK_SECRET}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, display: 'block', mb: 2, wordBreak: 'break-all' }}>
                    {MOCK_QR}
                  </Typography>
                  <Button variant="outlined" onClick={() => setActiveStep(2)} sx={{ textTransform: 'none' }}>
                    I've scanned the code
                  </Button>
                </Box>
              </Stack>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Enter verification code</StepLabel>
            <StepContent>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 2 }}>
                Enter the 6-digit code from your authenticator app to finish enrolment.
              </Typography>
              <TextField
                label="Verification code"
                value={totp}
                onChange={e => { setTotp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
                inputProps={{ maxLength: 6, inputMode: 'numeric', style: { fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' } }}
                sx={{ width: 240 }}
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button onClick={() => setActiveStep(1)}>Back</Button>
                <PrimaryButton onClick={onEnable}>Enable MFA</PrimaryButton>
              </Stack>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircle sx={{ color: tokens.colors.success, fontSize: 20 }} />
                <span>Enabled</span>
              </Stack>
            </StepLabel>
            <StepContent>
              <Alert severity="success">
                Two-factor authentication is now active on your account. You'll be prompted for a code on each login.
              </Alert>
            </StepContent>
          </Step>
        </Stepper>
      </Card>
    </Box>
  )
}

export default MfaSetup
