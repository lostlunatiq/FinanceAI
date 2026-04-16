import React, { useState } from 'react'
import { Box, Typography, Button, TextField, Stack, Link, Alert, CircularProgress } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { styled } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui/theme'

const Container = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: tokens.colors.background,
  padding: 24
}))

const Card = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  padding: 40,
  borderRadius: tokens.radius.xl,
  backgroundColor: tokens.colors.surfaceContainerLowest,
  boxShadow: tokens.shadows.ambient
}))

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Email is required.')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      // Mock: in production, call authApi.forgotPassword(email)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container>
      <Card component="form" onSubmit={handleSubmit}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 800,
            color: tokens.colors.primary,
            textAlign: 'center',
            mb: 1
          }}
        >
          Reset Password
        </Typography>
        <Typography
          sx={{
            textAlign: 'center',
            color: tokens.colors.onSurfaceVariant,
            mb: 4
          }}
        >
          Enter your email to receive reset instructions
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: tokens.radius.lg }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: tokens.radius.lg }}>
            Reset link sent — check your inbox.
          </Alert>
        )}

        <Stack spacing={3}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={success}
            InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading || success}
            sx={{
              background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
              borderRadius: tokens.radius.lg,
              padding: '14px',
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
          </Button>
        </Stack>

        <Typography sx={{ textAlign: 'center', mt: 3 }}>
          <Link
            component={RouterLink}
            to="/login"
            sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '0.875rem' }}
          >
            Back to Sign In
          </Link>
        </Typography>
      </Card>
    </Container>
  )
}

export default ForgotPassword
