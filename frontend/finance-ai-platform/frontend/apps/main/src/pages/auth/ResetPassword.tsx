import React from 'react'
import { Box, Typography, Button, TextField, Stack, Link } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
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

const ResetPassword: React.FC = () => {
  const { token } = useParams()

  return (
    <Container>
      <Card>
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
          Create New Password
        </Typography>
        <Typography
          sx={{
            textAlign: 'center',
            color: tokens.colors.onSurfaceVariant,
            mb: 4
          }}
        >
          Enter your new password below
        </Typography>

        <Stack spacing={3}>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
          />
          <Button
            fullWidth
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
              borderRadius: tokens.radius.lg,
              padding: '14px',
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Reset Password
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

export default ResetPassword
