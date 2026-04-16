import { createTheme, ThemeOptions, alpha } from '@mui/material/styles'

/**
 * "Architectural Ledger" Design System
 * 
 * Philosophy: Finance automation reimagined as a high-end editorial experience.
 * Uses tonal depth and editorial typography rather than rigid borders.
 * 
 * Key Rules:
 * 1. NO 1px solid borders - use tonal transitions instead
 * 2. Glassmorphism for floating elements
 * 3. Primary CTAs use gradient
 * 4. Ambient shadows tinted with primary teal
 */

// Design Tokens from Strategic Zenith
export const designTokens = {
  colors: {
    // Primary - Deep Teal (Authority & Trust)
    primary: '#00535b',
    primaryContainer: '#006d77',
    primaryFixed: '#9ff0fb',
    primaryFixedDim: '#82d3de',
    onPrimary: '#ffffff',
    onPrimaryFixed: '#001f23',
    onPrimaryContainer: '#9becf7',
    
    // Secondary - Navy (Professional Depth)
    secondary: '#495f84',
    secondaryContainer: '#bcd2fe',
    secondaryFixed: '#d6e3ff',
    secondaryFixedDim: '#b1c7f2',
    onSecondary: '#ffffff',
    onSecondaryFixed: '#001b3d',
    onSecondaryContainer: '#445a7f',
    
    // Tertiary - Purple (Alerts & Highlights)
    tertiary: '#6300c9',
    tertiaryContainer: '#7d30e6',
    tertiaryFixed: '#ecdcff',
    tertiaryFixedDim: '#d5baff',
    onTertiary: '#ffffff',
    onTertiaryFixed: '#270057',
    onTertiaryContainer: '#e9d7ff',
    
    // Surface System - Warm Neutrals
    surface: '#fbf9f9',
    surfaceDim: '#dbdad9',
    surfaceBright: '#fbf9f9',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f5f3f3',
    surfaceContainer: '#efeded',
    surfaceContainerHigh: '#e9e8e7',
    surfaceContainerHighest: '#e3e2e2',
    surfaceVariant: '#e3e2e2',
    surfaceTint: '#006972',
    
    // Content Colors
    onSurface: '#1b1c1c',
    onSurfaceVariant: '#3e494a',
    background: '#fbf9f9',
    onBackground: '#1b1c1c',
    
    // Outlines (Ghost Borders)
    outline: '#6f797a',
    outlineVariant: '#bec8ca',
    
    // Inverse
    inverseSurface: '#303031',
    inverseOnSurface: '#f2f0f0',
    inversePrimary: '#82d3de',
    
    // Semantic Colors
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',
    
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  
  // Typography Scale
  typography: {
    // Display - Manrope (Editorial Prestige)
    displayLg: '3.5rem',    // 56px - Signature headlines
    displayMd: '2.75rem',   // 44px
    displaySm: '2.25rem',    // 36px
    
    // Headlines - Manrope (Modern Authority)
    headlineLg: '2rem',     // 32px
    headlineMd: '1.75rem',  // 28px
    headlineSm: '1.5rem',   // 24px
    
    // Titles
    titleLg: '1.375rem',    // 22px
    titleMd: '1rem',        // 16px
    titleSm: '0.875rem',    // 14px
    
    // Body - Inter (Data Legibility)
    bodyLg: '1rem',         // 16px
    bodyMd: '0.875rem',     // 14px
    bodySm: '0.75rem',      // 12px
    
    // Labels
    labelLg: '0.875rem',    // 14px
    labelMd: '0.75rem',     // 12px
    labelSm: '0.6875rem',   // 11px
  },
  
  // Border Radius (Soft, Premium Feel)
  radius: {
    xs: '0.125rem',  // 2px
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },
  
  // Shadows (Tinted with Primary)
  shadows: {
    ambient: '0 12px 40px rgba(0, 83, 91, 0.06)',
    elevated: '0 4px 24px rgba(0, 83, 91, 0.08)',
    subtle: '0 2px 8px rgba(0, 83, 91, 0.04)',
  },
}

// MUI Theme Configuration
export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: designTokens.colors.primary,
      light: designTokens.colors.primaryFixed,
      dark: designTokens.colors.primaryContainer,
      contrastText: designTokens.colors.onPrimary,
    },
    secondary: {
      main: designTokens.colors.secondary,
      light: designTokens.colors.secondaryFixed,
      dark: designTokens.colors.secondaryContainer,
      contrastText: designTokens.colors.onSecondary,
    },
    error: {
      main: designTokens.colors.error,
      light: designTokens.colors.errorContainer,
      contrastText: designTokens.colors.onError,
    },
    warning: {
      main: designTokens.colors.warning,
    },
    success: {
      main: designTokens.colors.success,
    },
    info: {
      main: designTokens.colors.info,
    },
    background: {
      default: designTokens.colors.background,
      paper: designTokens.colors.surfaceContainerLowest,
    },
    text: {
      primary: designTokens.colors.onSurface,
      secondary: designTokens.colors.onSurfaceVariant,
    },
    grey: {
      50: '#fbf9f9',
      100: '#f5f3f3',
      200: '#efeded',
      300: '#e9e8e7',
      400: '#e3e2e2',
      500: '#bec8ca',
      600: '#6f797a',
      700: '#3e494a',
      800: '#1b1c1c',
      900: '#0f1212',
    },
    divider: alpha(designTokens.colors.outlineVariant, 0.15), // Ghost border
  },
  
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // Display (Manrope for headlines)
    h1: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.displayLg,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      color: designTokens.colors.primary,
    },
    h2: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.displayMd,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.headlineLg,
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.headlineMd,
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.headlineSm,
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.titleLg,
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: designTokens.typography.titleMd,
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontFamily: '"Inter", sans-serif',
      fontSize: designTokens.typography.titleSm,
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: designTokens.typography.bodyLg,
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
      fontSize: designTokens.typography.bodyMd,
      lineHeight: 1.6,
    },
    caption: {
      fontFamily: '"Inter", sans-serif',
      fontSize: designTokens.typography.labelSm,
      lineHeight: 1.4,
      color: designTokens.colors.onSurfaceVariant,
    },
    overline: {
      fontFamily: '"Inter", sans-serif',
      fontSize: designTokens.typography.labelMd,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: designTokens.colors.onSurfaceVariant,
    },
    button: {
      fontFamily: '"Manrope", sans-serif',
      fontSize: designTokens.typography.labelLg,
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '-0.01em',
    },
  },
  
  shape: {
    borderRadius: 8,
  },
  
  components: {
    // Buttons - Gradient Primary, No Borders
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.xl,
          padding: '12px 24px',
          fontWeight: 600,
          fontFamily: '"Manrope", sans-serif',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryContainer} 100%)`,
          color: designTokens.colors.onPrimary,
          '&:hover': {
            background: `linear-gradient(135deg, ${designTokens.colors.primaryContainer} 0%, ${designTokens.colors.primary} 100%)`,
          },
        },
        containedSecondary: {
          background: designTokens.colors.surfaceContainerHigh,
          color: designTokens.colors.primary,
          border: 'none',
          '&:hover': {
            background: designTokens.colors.surfaceContainerHighest,
          },
        },
        outlined: {
          border: 'none',
          background: designTokens.colors.surfaceContainer,
          color: designTokens.colors.primary,
          '&:hover': {
            background: designTokens.colors.surfaceContainerHigh,
            border: 'none',
          },
        },
        outlinedPrimary: {
          border: 'none',
          background: alpha(designTokens.colors.primary, 0.08),
          '&:hover': {
            background: alpha(designTokens.colors.primary, 0.12),
            border: 'none',
          },
        },
      },
    },
    
    // Cards - No Borders, Tonal Depth
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.xl,
          backgroundColor: designTokens.colors.surfaceContainerLowest,
          border: 'none',
          boxShadow: designTokens.shadows.subtle,
          '&:hover': {
            boxShadow: designTokens.shadows.ambient,
          },
        },
      },
    },
    
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px',
          },
        },
      },
    },
    
    // Paper - Tonal Surfaces
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.lg,
          border: 'none',
          backgroundImage: 'none',
        },
        elevation0: {
          backgroundColor: designTokens.colors.surfaceContainerLow,
        },
        elevation1: {
          backgroundColor: designTokens.colors.surfaceContainerLowest,
          boxShadow: designTokens.shadows.subtle,
        },
      },
    },
    
    // Tables - Clean, Minimal
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(designTokens.colors.outlineVariant, 0.15)}`,
          padding: '16px 20px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: designTokens.colors.surfaceContainerLow,
          color: designTokens.colors.onSurfaceVariant,
          fontSize: designTokens.typography.labelMd,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        },
      },
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          backgroundColor: designTokens.colors.surfaceContainerLowest,
          '&:hover': {
            backgroundColor: designTokens.colors.surfaceContainerLow,
          },
          '&:last-child td': {
            borderBottom: 'none',
          },
        },
      },
    },
    
    // Inputs - Subtle, Premium
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: designTokens.radius.lg,
            backgroundColor: designTokens.colors.surfaceContainerLow,
            '& fieldset': {
              border: 'none',
            },
            '&:hover fieldset': {
              border: 'none',
            },
            '&.Mui-focused fieldset': {
              border: `2px solid ${designTokens.colors.primary}`,
            },
          },
        },
      },
    },
    
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.lg,
          backgroundColor: designTokens.colors.surfaceContainerLow,
          '& fieldset': {
            border: 'none',
          },
        },
      },
    },
    
    // Chips - Status Indicators
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.lg,
          fontWeight: 500,
          border: 'none',
        },
      },
    },
    
    // Alerts - Rounded
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.lg,
          border: 'none',
        },
        standardSuccess: {
          backgroundColor: alpha('#10b981', 0.1),
          color: '#059669',
        },
        standardWarning: {
          backgroundColor: alpha('#f59e0b', 0.1),
          color: '#d97706',
        },
        standardError: {
          backgroundColor: alpha('#ef4444', 0.1),
          color: '#dc2626',
        },
        standardInfo: {
          backgroundColor: alpha(designTokens.colors.primary, 0.1),
          color: designTokens.colors.primary,
        },
      },
    },
    
    // Tabs - Minimal
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: designTokens.radius.full,
        },
      },
    },
    
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 48,
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: '"Manrope", sans-serif',
          '&.Mui-selected': {
            color: designTokens.colors.primary,
          },
        },
      },
    },
    
    // Dialog - Glassmorphism
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: designTokens.radius.xl,
          backgroundColor: alpha(designTokens.colors.surfaceContainerLowest, 0.85),
          backdropFilter: 'blur(24px)',
          boxShadow: designTokens.shadows.ambient,
        },
      },
    },
    
    // Menu - Glass Effect
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: designTokens.radius.lg,
          backgroundColor: alpha(designTokens.colors.surfaceContainerLowest, 0.95),
          backdropFilter: 'blur(24px)',
          boxShadow: designTokens.shadows.ambient,
          border: 'none',
        },
      },
    },
    
    // Tooltip
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: designTokens.radius.md,
          backgroundColor: alpha(designTokens.colors.inverseSurface, 0.9),
          backdropFilter: 'blur(12px)',
        },
      },
    },
    
    // AppBar - Transparent with blur
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(designTokens.colors.surface, 0.85),
          backdropFilter: 'blur(24px)',
          borderBottom: 'none',
          boxShadow: 'none',
        },
      },
    },
    
    // Drawer
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: designTokens.colors.surface,
          borderRight: 'none',
        },
      },
    },
    
    // FAB
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.full,
          background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryContainer} 100%)`,
          boxShadow: designTokens.shadows.ambient,
          '&:hover': {
            boxShadow: designTokens.shadows.elevated,
          },
        },
      },
    },
    
    // Progress
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.full,
          backgroundColor: alpha(designTokens.colors.primary, 0.1),
        },
        bar: {
          borderRadius: designTokens.radius.full,
          background: `linear-gradient(90deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryContainer} 100%)`,
        },
      },
    },
    
    // Avatar
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: designTokens.colors.primary,
          fontWeight: 600,
        },
      },
    },
    
    // Badge
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
        },
      },
    },
  },
}

export const theme = createTheme(themeOptions)

// Export design tokens for custom components
export const tokens = designTokens

// Fraud Score Colors
export const fraudScoreColors = {
  low: '#10b981',      // Green - Low risk
  medium: '#f59e0b',   // Yellow - Medium risk
  high: '#ef4444',    // Red - High risk
  critical: '#7c3aed', // Purple - Critical risk
}

// Status Colors
export const statusColors: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#0ea5e9',
  pending: '#f59e0b',
  under_review: '#f59e0b',
  l1_review: '#f59e0b',
  l2_review: '#f59e0b',
  cfo_review: '#8b5cf6',
  approved: '#10b981',
  rejected: '#ef4444',
  on_hold: '#94a3b8',
  paid: designTokens.colors.primary,
  cancelled: '#64748b',
  active: '#10b981',
  pending_verification: '#f59e0b',
  inactive: '#94a3b8',
  suspended: '#ef4444',
  archived: '#94a3b8',
  locked: '#f59e0b',
  scheduled: '#0ea5e9',
  processing: '#f59e0b',
  failed: '#ef4444',
  reconciled: '#10b981',
}

// Chart Colors (coordinated with palette)
export const chartColors = [
  designTokens.colors.primary,       // Teal
  designTokens.colors.secondary,     // Navy
  designTokens.colors.tertiary,      // Purple
  '#10b981',                         // Green
  '#f59e0b',                         // Yellow
  '#ef4444',                         // Red
  '#06b6d4',                         // Cyan
  '#ec4899',                         // Pink
]

// Glassmorphism utility
export const glassStyle = {
  background: alpha(designTokens.colors.surfaceContainerLowest, 0.85),
  backdropFilter: 'blur(24px)',
  boxShadow: designTokens.shadows.ambient,
}

// Gradient button utility
export const gradientButtonStyle = {
  background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryContainer} 100%)`,
}

// Ghost border utility (for accessibility when needed)
export const ghostBorderStyle = {
  border: `1px solid ${alpha(designTokens.colors.outlineVariant, 0.15)}`,
}

// Export helper functions
export const getFraudColor = (score: number): string => {
  if (score <= 30) return fraudScoreColors.low
  if (score <= 60) return fraudScoreColors.medium
  if (score <= 85) return fraudScoreColors.high
  return fraudScoreColors.critical
}

export const getStatusColor = (status: string): string => {
  return statusColors[status.toLowerCase() as keyof typeof statusColors] || '#94a3b8'
}
