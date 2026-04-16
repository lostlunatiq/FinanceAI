import React, { useState } from 'react'
import { styled, alpha } from '@mui/material/styles'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  InputBase,
  Modal,
  Paper,
  Stack,
  Chip
} from '@mui/material'
import {
  Search,
  Dashboard,
  Receipt,
  AccountBalance,
  People,
  Assessment,
  Settings,
  Notifications,
  Logout,
  HelpOutline,
  Close,
  Keyboard,
  AutoAwesome,
  InsertChart,
  TrendingUp,
  VerifiedUser,
  Inbox,
  Business,
  Payments as PaymentsIcon,
  Rule
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@finance-ai/auth'
import { ROLE_LABELS } from '@finance-ai/core'
import type { UserRole } from '@finance-ai/core'
import { tokens, glassStyle, designTokens } from '../../theme'

const drawerWidth = 256

// Styled components following "Architectural Ledger" design
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  marginLeft: `-${drawerWidth}px`,
  minHeight: '100vh',
  backgroundColor: tokens.colors.background,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    }),
    marginLeft: 0
  })
}))

const GlassAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: alpha(tokens.colors.surface, 0.85),
  backdropFilter: 'blur(24px)',
  borderBottom: 'none',
  boxShadow: tokens.shadows.subtle,
  color: tokens.colors.onSurface
}))

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: tokens.colors.surface,
    borderRight: 'none',
    paddingTop: '80px'
  }
}))

const CommandPalette = styled(Paper)(({ theme }) => ({
  ...glassStyle,
  width: 640,
  maxWidth: '90vw',
  margin: 'auto',
  marginTop: '15vh',
  borderRadius: tokens.radius.xl,
  padding: 0,
  overflow: 'hidden'
}))

const NavItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active?: boolean }>(({ theme, active }) => ({
  borderRadius: tokens.radius.lg,
  margin: '2px 12px',
  padding: '12px 16px',
  backgroundColor: active ? tokens.colors.surfaceContainerLowest : 'transparent',
  color: active ? tokens.colors.primary : tokens.colors.onSurfaceVariant,
  boxShadow: active ? tokens.shadows.subtle : 'none',
  transition: 'all 0.2s ease-out',
  '&:hover': {
    backgroundColor: active 
      ? tokens.colors.surfaceContainerLowest 
      : alpha(tokens.colors.primary, 0.05)
  },
  '& .MuiListItemIcon-root': {
    color: active ? tokens.colors.primary : tokens.colors.onSurfaceVariant,
    minWidth: 36
  },
  '& .MuiListItemText-primary': {
    fontFamily: '"Manrope", sans-serif',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 500
  }
}))

const SearchBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: tokens.colors.surfaceContainerLow,
  borderRadius: tokens.radius.xl,
  padding: '8px 16px',
  gap: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease-out',
  '&:hover': {
    backgroundColor: tokens.colors.surfaceContainer
  }
}))

const KeyboardShortcut = styled('kbd')(({ theme }) => ({
  padding: '4px 8px',
  borderRadius: tokens.radius.md,
  backgroundColor: tokens.colors.surfaceContainerHigh,
  fontSize: '10px',
  fontWeight: 700,
  color: tokens.colors.outline,
  fontFamily: 'monospace'
}))

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const role = (user?.role || 'l1_finance_employee') as UserRole

  type NavEntry = { text: string; icon: React.ReactNode; path: string; roles?: UserRole[] }
  const allNavItems: NavEntry[] = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Accounts Payable', icon: <Receipt />, path: '/ap' },
    { text: 'Approvals', icon: <Inbox />, path: '/ap/approvals', roles: ['l1_finance_employee', 'l2_finance_head', 'cfo', 'admin'] },
    { text: 'Vendors', icon: <Business />, path: '/vendor' },
    { text: 'Payments', icon: <PaymentsIcon />, path: '/payments', roles: ['l2_finance_head', 'cfo', 'admin'] },
    { text: 'Treasury', icon: <TrendingUp />, path: '/treasury', roles: ['l2_finance_head', 'cfo', 'admin'] },
    { text: 'Budget', icon: <AccountBalance />, path: '/budget', roles: ['l1_finance_employee', 'l2_finance_head', 'cfo', 'admin'] },
    { text: 'Policies', icon: <Rule />, path: '/policies', roles: ['cfo', 'admin'] },
    { text: 'Audit Log', icon: <VerifiedUser />, path: '/audit', roles: ['cfo', 'admin'] },
    { text: 'Settings', icon: <Settings />, path: '/settings' }
  ]

  const menuItems = allNavItems.filter(i => !i.roles || role === 'admin' || i.roles.includes(role))

  const handleDrawerToggle = () => setOpen(!open)
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => setNotificationAnchorEl(event.currentTarget)
  const handleMenuClose = () => {
    setAnchorEl(null)
    setNotificationAnchorEl(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavigation = (path: string) => navigate(path)

  // Command palette keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const notifications = [
    { id: 1, title: 'Invoice Approved', message: 'Invoice #INV-2024-001 for $15,000 approved', time: '2h ago', type: 'success' },
    { id: 2, title: 'Fraud Alert', message: 'High-risk invoice detected - Score: 82', time: '4h ago', type: 'warning' },
    { id: 3, title: 'Budget Alert', message: 'Marketing budget at 90% utilization', time: '1d ago', type: 'info' }
  ]

  const commandPaletteActions = [
    { id: 'dashboard', label: 'Go to Dashboard', shortcut: 'G D', action: () => navigate('/dashboard') },
    { id: 'invoices', label: 'View Invoices', shortcut: 'G I', action: () => navigate('/ap') },
    { id: 'budget', label: 'Budget Management', shortcut: 'G B', action: () => navigate('/budget') },
    { id: 'vendors', label: 'Vendor Portal', shortcut: 'G V', action: () => navigate('/vendor') },
    { id: 'new-invoice', label: 'Create New Invoice', shortcut: 'N I', action: () => console.log('New invoice') },
    { id: 'search', label: 'Search invoices...', shortcut: '/', action: () => console.log('Search') },
  ]

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Top Navigation - Glassmorphism */}
      <GlassAppBar
        position="fixed"
        sx={{
          width: open ? `calc(100% - ${drawerWidth}px)` : '100%',
          ml: open ? `${drawerWidth}px` : 0,
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen
            })
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
          {/* Logo */}
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: tokens.colors.primary
            }}
          >
            FinanceAI
          </Typography>

          {/* Navigation Tabs (hidden on mobile) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4, alignItems: 'center' }}>
            {['Dashboard', 'Analytics', 'Treasury', 'Audit'].map((item) => (
              <Typography
                key={item}
                sx={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: item === 'Dashboard' ? tokens.colors.primary : tokens.colors.onSurfaceVariant,
                  cursor: 'pointer',
                  borderBottom: item === 'Dashboard' ? `2px solid ${tokens.colors.primary}` : 'none',
                  pb: 0.5,
                  transition: 'color 0.2s',
                  '&:hover': { color: tokens.colors.primary }
                }}
              >
                {item}
              </Typography>
            ))}
          </Box>

          {/* Right Section */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Command Palette Trigger */}
            <SearchBox
              onClick={() => setCommandPaletteOpen(true)}
              sx={{ display: { xs: 'none', lg: 'flex' }, width: 384 }}
            >
              <Search sx={{ fontSize: 18, color: tokens.colors.outline }} />
              <Typography sx={{ fontSize: '0.875rem', color: tokens.colors.onSurfaceVariant, flexGrow: 1 }}>
                Ask Your Data...
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <KeyboardShortcut>⌘</KeyboardShortcut>
                <KeyboardShortcut>K</KeyboardShortcut>
              </Stack>
            </SearchBox>

            {/* Notifications */}
            <IconButton onClick={handleNotificationMenuOpen} sx={{ color: tokens.colors.onSurfaceVariant }}>
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            {/* Profile */}
            <IconButton onClick={handleProfileMenuOpen}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: tokens.colors.primary,
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </IconButton>
          </Stack>
        </Toolbar>
      </GlassAppBar>

      {/* Side Navigation */}
      <StyledDrawer variant="permanent" open={open}>
        <Box sx={{ px: 2, py: 3 }}>
          <List sx={{ pt: 0 }}>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <NavItemButton
                  active={location.pathname.startsWith(item.path)}
                  onClick={() => handleNavigation(item.path)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </NavItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Bottom Section */}
        <Box sx={{ mt: 'auto', px: 2, pb: 3, borderTop: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}` }}>
          <List>
            <ListItem disablePadding>
              <NavItemButton onClick={() => console.log('Support')}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <HelpOutline />
                </ListItemIcon>
                <ListItemText primary="Support" />
              </NavItemButton>
            </ListItem>
            <ListItem disablePadding>
              <NavItemButton onClick={handleLogout}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Logout />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </NavItemButton>
            </ListItem>
          </List>
        </Box>
      </StyledDrawer>

      {/* Main Content */}
      <Main open={open}>
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
          {children}
        </Box>
      </Main>

      {/* Command Palette Modal */}
      <Modal
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
      >
        <CommandPalette>
          {/* Search Input */}
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.15)}` }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Search sx={{ color: tokens.colors.onSurfaceVariant }} />
              <InputBase
                placeholder="Search commands, invoices, vendors..."
                autoFocus
                fullWidth
                sx={{
                  fontSize: '1rem',
                  fontFamily: '"Manrope", sans-serif',
                  '& input::placeholder': {
                    color: tokens.colors.onSurfaceVariant
                  }
                }}
              />
              <IconButton size="small" onClick={() => setCommandPaletteOpen(false)}>
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Actions List */}
          <List sx={{ p: 1, maxHeight: 400, overflow: 'auto' }}>
            {commandPaletteActions.map((action) => (
              <MenuItem
                key={action.id}
                onClick={() => {
                  action.action()
                  setCommandPaletteOpen(false)
                }}
                sx={{
                  borderRadius: tokens.radius.lg,
                  m: 0.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  '&:hover': {
                    backgroundColor: alpha(tokens.colors.primary, 0.05)
                  }
                }}
              >
                <Typography sx={{ fontFamily: '"Manrope", sans-serif', fontSize: '0.875rem' }}>
                  {action.label}
                </Typography>
                <KeyboardShortcut>{action.shortcut}</KeyboardShortcut>
              </MenuItem>
            ))}
          </List>
        </CommandPalette>
      </Modal>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 400,
            ...glassStyle,
            mt: 1
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}>
            Notifications
          </Typography>
        </Box>
        <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15) }} />
        {notifications.map((notification) => (
          <MenuItem key={notification.id} onClick={handleMenuClose} sx={{ py: 2 }}>
            <Box sx={{ width: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: '"Manrope", sans-serif' }}>
                  {notification.title}
                </Typography>
                <Chip
                  label={notification.time}
                  size="small"
                  sx={{ fontSize: '0.625rem', height: 20 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {notification.message}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15) }} />
        <MenuItem onClick={handleMenuClose} sx={{ justifyContent: 'center' }}>
          <Typography color="primary" sx={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600, fontSize: '0.875rem' }}>
            View All Notifications
          </Typography>
        </MenuItem>
      </Menu>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...glassStyle,
            mt: 1,
            minWidth: 200
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role ? ROLE_LABELS[user.role] : ''}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15) }} />
        <MenuItem onClick={() => { navigate('/profile'); handleMenuClose() }}>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleMenuClose() }}>
          Settings
        </MenuItem>
        <Divider sx={{ borderColor: alpha(tokens.colors.outlineVariant, 0.15) }} />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Logout fontSize="small" color="error" />
          </ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default AppLayout
