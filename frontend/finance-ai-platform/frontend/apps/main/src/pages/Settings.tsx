import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Modal,
  Paper,
  IconButton,
  Tab,
  Tabs,
  Alert,
  MenuItem
} from '@mui/material'
import {
  Person,
  Security,
  Notifications,
  Palette,
  Language,
  Storage,
  CloudSync,
  Key,
  Email,
  Phone,
  Business,
  Edit,
  Close,
  Save,
  Add,
  Delete,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Warning,
  Info
} from '@mui/icons-material'
import { styled, alpha } from '@mui/material/styles'
import { tokens, designTokens } from '@finance-ai/ui/theme'
import { Link as RouterLink } from 'react-router-dom'

// Styled components
const SettingsCard = styled(Card)(({ theme }) => ({
  borderRadius: tokens.radius.xl,
  border: 'none',
  backgroundColor: tokens.colors.surfaceContainerLowest
}))

const GlassModal = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  maxWidth: '90vw',
  backgroundColor: alpha(tokens.colors.surfaceContainerLowest, 0.95),
  backdropFilter: 'blur(24px)',
  borderRadius: tokens.radius.xl,
  boxShadow: tokens.shadows.ambient
}))

const SettingsSection = styled(Box)(({ theme }) => ({
  padding: 24,
  borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}`,
  '&:last-child': {
    borderBottom: 'none'
  }
}))

const PrimaryButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryContainer} 100%)`,
  color: tokens.colors.onPrimary,
  borderRadius: tokens.radius.full,
  padding: '10px 24px',
  fontFamily: '"Manrope", sans-serif',
  fontWeight: 600,
  fontSize: '0.875rem',
  boxShadow: `0 4px 16px ${alpha(tokens.colors.primary, 0.25)}`,
  textTransform: 'none',
  '&:hover': {
    boxShadow: `0 6px 24px ${alpha(tokens.colors.primary, 0.35)}`,
  }
}))

// Mock user settings
const mockUserSettings = {
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phone: '+1 (555) 123-4567',
    department: 'Finance',
    role: 'Finance Manager',
    avatar: null
  },
  security: {
    mfaEnabled: true,
    mfaMethod: 'totp',
    lastPasswordChange: '2024-01-15',
    sessions: [
      { id: '1', device: 'MacBook Pro', browser: 'Chrome', location: 'San Francisco, CA', current: true },
      { id: '2', device: 'iPhone 15', browser: 'Safari', location: 'San Francisco, CA', current: false },
    ]
  },
  notifications: {
    email: true,
    push: true,
    invoiceApproved: true,
    fraudAlerts: true,
    budgetAlerts: true,
    weeklyReports: false,
    dailyDigest: true
  },
  preferences: {
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    theme: 'light'
  }
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [settings, setSettings] = useState(mockUserSettings)
  const [saved, setSaved] = useState(false)

  const handleNotificationChange = (key: string) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key as keyof typeof prev.notifications]
      }
    }))
    showSavedAlert()
  }

  const showSavedAlert = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: { xs: '2rem', lg: '2.5rem' },
            fontWeight: 700,
            color: tokens.colors.primary,
            letterSpacing: '-0.02em'
          }}
        >
          Settings
        </Typography>
        <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1 }}>
          Manage your account, security, and preferences
        </Typography>
      </Box>

      {saved && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{
            mb: 3,
            borderRadius: tokens.radius.lg,
            backgroundColor: alpha(tokens.colors.success, 0.1),
            color: tokens.colors.success
          }}
          onClose={() => setSaved(false)}
        >
          Settings saved successfully
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ borderRadius: tokens.radius.xl, border: 'none', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            px: 2,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: tokens.radius.full
            }
          }}
        >
          <Tab icon={<Person sx={{ fontSize: 20 }} />} label="Profile" iconPosition="start" sx={{ textTransform: 'none', fontFamily: '"Manrope", sans-serif', fontWeight: 600 }} />
          <Tab icon={<Security sx={{ fontSize: 20 }} />} label="Security" iconPosition="start" sx={{ textTransform: 'none', fontFamily: '"Manrope", sans-serif', fontWeight: 600 }} />
          <Tab icon={<Notifications sx={{ fontSize: 20 }} />} label="Notifications" iconPosition="start" sx={{ textTransform: 'none', fontFamily: '"Manrope", sans-serif', fontWeight: 600 }} />
          <Tab icon={<Palette sx={{ fontSize: 20 }} />} label="Preferences" iconPosition="start" sx={{ textTransform: 'none', fontFamily: '"Manrope", sans-serif', fontWeight: 600 }} />
        </Tabs>
      </Card>

      {/* Profile Tab */}
      {tabValue === 0 && (
        <SettingsCard>
          <SettingsSection>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                Profile Information
              </Typography>
              <Button
                startIcon={<Edit />}
                onClick={() => setEditProfileModalOpen(true)}
                sx={{
                  borderRadius: tokens.radius.lg,
                  fontFamily: '"Manrope", sans-serif',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Edit Profile
              </Button>
            </Stack>

            <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: tokens.colors.primary,
                  fontSize: '2rem',
                  fontWeight: 600
                }}
              >
                {settings.profile.firstName[0]}{settings.profile.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
                  {settings.profile.firstName} {settings.profile.lastName}
                </Typography>
                <Typography sx={{ color: tokens.colors.onSurfaceVariant }}>
                  {settings.profile.role}
                </Typography>
                <Chip
                  label={settings.profile.department}
                  size="small"
                  sx={{ mt: 1, backgroundColor: alpha(tokens.colors.primary, 0.1), color: tokens.colors.primary }}
                />
              </Box>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                      Email
                    </Typography>
                    <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      {settings.profile.email}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                      Phone
                    </Typography>
                    <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      {settings.profile.phone}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                      Department
                    </Typography>
                    <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      {settings.profile.department}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                      Role
                    </Typography>
                    <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                      {settings.profile.role}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </SettingsSection>
        </SettingsCard>
      )}

      {/* Security Tab */}
      {tabValue === 1 && (
        <SettingsCard>
          <SettingsSection>
            <Typography variant="h6" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 3 }}>
              Security Settings
            </Typography>

            <Stack spacing={3}>
              <Card sx={{ borderRadius: tokens.radius.lg, bgcolor: tokens.colors.surfaceContainerLow, border: 'none' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Key sx={{ color: tokens.colors.primary }} />
                      <Box>
                        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                          Password
                        </Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                          Last changed: {settings.security.lastPasswordChange}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      onClick={() => setChangePasswordModalOpen(true)}
                      sx={{
                        borderRadius: tokens.radius.lg,
                        fontFamily: '"Manrope", sans-serif',
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      Change Password
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: tokens.radius.lg, bgcolor: tokens.colors.surfaceContainerLow, border: 'none' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Security sx={{ color: settings.security.mfaEnabled ? tokens.colors.success : tokens.colors.warning }} />
                      <Box>
                        <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                          Two-Factor Authentication
                        </Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant }}>
                          {settings.security.mfaEnabled ? 'Enabled via authenticator app' : 'Not enabled'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      component={RouterLink}
                      to="/settings/mfa"
                      variant={settings.security.mfaEnabled ? 'outlined' : 'contained'}
                      sx={{
                        borderRadius: tokens.radius.lg,
                        fontFamily: '"Manrope", sans-serif',
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      {settings.security.mfaEnabled ? 'Manage MFA' : 'Set up MFA'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              <Box>
                <Typography variant="subtitle2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 2 }}>
                  Active Sessions
                </Typography>
                <List>
                  {settings.security.sessions.map((session, index) => (
                    <ListItem
                      key={session.id}
                      sx={{
                        borderRadius: tokens.radius.lg,
                        backgroundColor: tokens.colors.surfaceContainerLow,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        {session.current ? (
                          <CheckCircle sx={{ color: tokens.colors.success }} />
                        ) : (
                          <Info sx={{ color: tokens.colors.onSurfaceVariant }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                              {session.device}
                            </Typography>
                            {session.current && (
                              <Chip label="Current" size="small" sx={{ fontSize: '0.625rem', height: 20 }} />
                            )}
                          </Stack>
                        }
                        secondary={`${session.browser} • ${session.location}`}
                      />
                      {!session.current && (
                        <ListItemSecondaryAction>
                          <IconButton edge="end" sx={{ color: tokens.colors.error }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Stack>
          </SettingsSection>
        </SettingsCard>
      )}

      {/* Notifications Tab */}
      {tabValue === 2 && (
        <SettingsCard>
          <SettingsSection>
            <Typography variant="h6" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 3 }}>
              Notification Preferences
            </Typography>

            <Stack spacing={2}>
              <Card sx={{ borderRadius: tokens.radius.lg, bgcolor: tokens.colors.surfaceContainerLow, border: 'none', p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 2 }}>
                  Delivery Methods
                </Typography>
                <List disablePadding>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><Email /></ListItemIcon>
                    <ListItemText primary="Email Notifications" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.email}
                        onChange={() => handleNotificationChange('email')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><Notifications /></ListItemIcon>
                    <ListItemText primary="Push Notifications" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.push}
                        onChange={() => handleNotificationChange('push')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Card>

              <Card sx={{ borderRadius: tokens.radius.lg, bgcolor: tokens.colors.surfaceContainerLow, border: 'none', p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 2 }}>
                  Event Notifications
                </Typography>
                <List disablePadding>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><CheckCircle /></ListItemIcon>
                    <ListItemText primary="Invoice Approved" secondary="Notify when invoices are approved" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.invoiceApproved}
                        onChange={() => handleNotificationChange('invoiceApproved')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><Warning /></ListItemIcon>
                    <ListItemText primary="Fraud Alerts" secondary="High-priority fraud detection alerts" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.fraudAlerts}
                        onChange={() => handleNotificationChange('fraudAlerts')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><Storage /></ListItemIcon>
                    <ListItemText primary="Budget Alerts" secondary="Notify when budgets reach thresholds" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.budgetAlerts}
                        onChange={() => handleNotificationChange('budgetAlerts')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Card>

              <Card sx={{ borderRadius: tokens.radius.lg, bgcolor: tokens.colors.surfaceContainerLow, border: 'none', p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 2 }}>
                  Reports & Digests
                </Typography>
                <List disablePadding>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><CloudSync /></ListItemIcon>
                    <ListItemText primary="Weekly Reports" secondary="Receive weekly summary every Monday" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.weeklyReports}
                        onChange={() => handleNotificationChange('weeklyReports')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon><Email /></ListItemIcon>
                    <ListItemText primary="Daily Digest" secondary="Daily summary of activities" />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.notifications.dailyDigest}
                        onChange={() => handleNotificationChange('dailyDigest')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Card>
            </Stack>
          </SettingsSection>
        </SettingsCard>
      )}

      {/* Preferences Tab */}
      {tabValue === 3 && (
        <SettingsCard>
          <SettingsSection>
            <Typography variant="h6" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, mb: 3 }}>
              Application Preferences
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Language"
                  fullWidth
                  value={settings.preferences.language}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: e.target.value }
                    }))
                    showSavedAlert()
                  }}
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Timezone"
                  fullWidth
                  value={settings.preferences.timezone}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, timezone: e.target.value }
                    }))
                    showSavedAlert()
                  }}
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                >
                  <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                  <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                  <MenuItem value="Europe/London">Greenwich Mean Time (GMT)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Date Format"
                  fullWidth
                  value={settings.preferences.dateFormat}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, dateFormat: e.target.value }
                    }))
                    showSavedAlert()
                  }}
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                >
                  <MenuItem value="MM/dd/yyyy">MM/DD/YYYY</MenuItem>
                  <MenuItem value="dd/MM/yyyy">DD/MM/YYYY</MenuItem>
                  <MenuItem value="yyyy-MM-dd">YYYY-MM-DD</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Currency"
                  fullWidth
                  value={settings.preferences.currency}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, currency: e.target.value }
                    }))
                    showSavedAlert()
                  }}
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                >
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                  <MenuItem value="JPY">JPY (¥)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.preferences.theme === 'dark'}
                      onChange={() => {
                        setSettings(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            theme: prev.preferences.theme === 'light' ? 'dark' : 'light'
                          }
                        }))
                        showSavedAlert()
                      }}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Palette fontSize="small" />
                      <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
                        Dark Mode
                      </Typography>
                    </Stack>
                  }
                />
              </Grid>
            </Grid>
          </SettingsSection>
        </SettingsCard>
      )}

      {/* Edit Profile Modal */}
      <Modal open={editProfileModalOpen} onClose={() => setEditProfileModalOpen(false)}>
        <GlassModal>
          <Box sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
                Edit Profile
              </Typography>
              <IconButton onClick={() => setEditProfileModalOpen(false)}>
                <Close />
              </IconButton>
            </Stack>

            <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), mb: 3 }} />

            <Stack spacing={3}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="First Name"
                  fullWidth
                  defaultValue={settings.profile.firstName}
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                />
                <TextField
                  label="Last Name"
                  fullWidth
                  defaultValue={settings.profile.lastName}
                  InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                />
              </Stack>
              <TextField
                label="Email"
                type="email"
                fullWidth
                defaultValue={settings.profile.email}
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
              <TextField
                label="Phone"
                fullWidth
                defaultValue={settings.profile.phone}
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
              />
              <TextField
                label="Department"
                fullWidth
                defaultValue={settings.profile.department}
                disabled
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                helperText="Contact admin to change department"
              />
            </Stack>

            <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), my: 3 }} />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                onClick={() => setEditProfileModalOpen(false)}
                sx={{
                  borderRadius: tokens.radius.lg,
                  fontFamily: '"Manrope", sans-serif',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Cancel
              </Button>
              <PrimaryButton onClick={() => { showSavedAlert(); setEditProfileModalOpen(false) }}>
                Save Changes
              </PrimaryButton>
            </Stack>
          </Box>
        </GlassModal>
      </Modal>

      {/* Change Password Modal */}
      <Modal open={changePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)}>
        <GlassModal>
          <Box sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 700 }}>
                Change Password
              </Typography>
              <IconButton onClick={() => setChangePasswordModalOpen(false)}>
                <Close />
              </IconButton>
            </Stack>

            <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), mb: 3 }} />

            <Stack spacing={3}>
              <TextField
                label="Current Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                InputLabelProps={{ sx: { fontFamily: '"Manrope", sans-serif' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
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
            </Stack>

            <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15), my: 3 }} />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                onClick={() => setChangePasswordModalOpen(false)}
                sx={{
                  borderRadius: tokens.radius.lg,
                  fontFamily: '"Manrope", sans-serif',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Cancel
              </Button>
              <PrimaryButton onClick={() => { showSavedAlert(); setChangePasswordModalOpen(false) }}>
                Update Password
              </PrimaryButton>
            </Stack>
          </Box>
        </GlassModal>
      </Modal>
    </Box>
  )
}

export default Settings
