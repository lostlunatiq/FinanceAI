import React, { useState } from 'react'
import { Box, Typography, Button, TextField, Stack, Link, Alert, CircularProgress } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { styled } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui/theme'
import { useAuth } from '@finance-ai/auth'

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

const Register: React.FC = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('All fields are required.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    try {
      await register({ firstName, lastName, email, password })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.')
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
          Create Account
        </Typography>
        <Typography
          sx={{
            textAlign: 'center',
            color: tokens.colors.onSurfaceVariant,
            mb: 4
          }}
        >
          Get started with FinanceAI
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: tokens.radius.lg }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="First Name"
              fullWidth
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
            />
            <TextField
              label="Last Name"
              fullWidth
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
            />
          </Stack>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
          />
          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword.length > 0 && password !== confirmPassword}
            helperText={confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match' : ''}
            InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
              background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
              borderRadius: tokens.radius.lg,
              padding: '14px',
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              mt: 1
            }}
          >
            {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
          </Button>
        </Stack>

        <Typography sx={{ textAlign: 'center', mt: 3 }}>
          <Link
            component={RouterLink}
            to="/login"
            sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '0.875rem' }}
          >
            Already have an account? Sign in
          </Link>
        </Typography>
      </Card>
    </Container>
  )
}

export default Register
