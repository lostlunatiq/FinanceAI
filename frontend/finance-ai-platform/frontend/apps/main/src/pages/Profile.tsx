import React from 'react'
import { Box, Typography, Card, CardContent, Stack, Button, Avatar, Chip, Divider, Grid, TextField } from '@mui/material'
import { Edit, Lock, Security } from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { tokens } from '@finance-ai/ui/theme'
import { useAuth } from '@finance-ai/auth'

const ProfileCard = styled(Card)(({ theme }) => ({
  borderRadius: tokens.radius.xl,
  border: 'none',
  backgroundColor: tokens.colors.surfaceContainerLowest
}))

const Profile: React.FC = () => {
  const { user } = useAuth()

  return (
    <Box sx={{ py: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography
        sx={{
          fontFamily: '"Manrope", sans-serif',
          fontSize: '2rem',
          fontWeight: 700,
          color: tokens.colors.primary,
          mb: 4
        }}
      >
        Profile
      </Typography>

      <ProfileCard sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: tokens.colors.primary,
                fontSize: '2.5rem',
                fontWeight: 600
              }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant }}>
                {user?.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={user?.role?.replace('_', ' ')} size="small" />
                <Chip label={user?.department} size="small" variant="outlined" />
              </Stack>
            </Box>
            <Button startIcon={<Edit />} sx={{ borderRadius: tokens.radius.lg, textTransform: 'none' }}>
              Edit Profile
            </Button>
          </Stack>

          <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="First Name"
                fullWidth
                defaultValue={user?.firstName}
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Last Name"
                fullWidth
                defaultValue={user?.lastName}
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                defaultValue={user?.email}
                disabled
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Department"
                fullWidth
                defaultValue={user?.department}
                disabled
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </ProfileCard>

      <ProfileCard>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 3 }}>
            Security
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Lock sx={{ color: tokens.colors.primary }} />
                <Box>
                  <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                    Password
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                    Last changed: 30 days ago
                  </Typography>
                </Box>
              </Stack>
              <Button sx={{ borderRadius: tokens.radius.lg, textTransform: 'none' }}>
                Change
              </Button>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Security sx={{ color: tokens.colors.success }} />
                <Box>
                  <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                    Two-Factor Authentication
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.colors.success }}>
                    Enabled
                  </Typography>
                </Box>
              </Stack>
              <Button sx={{ borderRadius: tokens.radius.lg, textTransform: 'none' }}>
                Manage
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </ProfileCard>
    </Box>
  )
}

import { alpha } from '@mui/material/styles'
export default Profile
