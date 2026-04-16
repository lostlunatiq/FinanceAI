import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { formatCurrency, formatPercentage, formatDate } from '@finance-ai/core'
import { fraudScoreColors, statusColors } from '../../theme'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down'
  icon?: React.ReactNode
  color?: string
  subtitle?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  color = 'primary',
  subtitle
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {typeof value === 'number' && title.includes('$') ? formatCurrency(value) : value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ color }}>
              {icon}
            </Box>
          )}
        </Stack>
        
        {change !== undefined && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            {trend === 'up' ? (
              <TrendingUp sx={{ color: 'success.main' }} fontSize="small" />
            ) : (
              <TrendingDown sx={{ color: 'error.main' }} fontSize="small" />
            )}
            <Typography
              variant="caption"
              color={trend === 'up' ? 'success.main' : 'error.main'}
              fontWeight="medium"
            >
              {change > 0 ? '+' : ''}{formatPercentage(change)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              from last period
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

interface StatusChipProps {
  status: string
  size?: 'small' | 'medium'
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'medium' }) => {
  const getStatusConfig = (status: string) => {
    const lowerStatus = status.toLowerCase()
    const color = statusColors[lowerStatus as keyof typeof statusColors] || '#94a3b8'
    
    const icons: Record<string, React.ReactNode> = {
      approved: <CheckCircle fontSize="small" />,
      paid: <CheckCircle fontSize="small" />,
      active: <CheckCircle fontSize="small" />,
      pending: <Warning fontSize="small" />,
      rejected: <Error fontSize="small" />,
      cancelled: <Error fontSize="small" />,
      draft: <Info fontSize="small" />
    }
    
    return {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color,
      icon: icons[lowerStatus]
    }
  }

  const config = getStatusConfig(status)

  return (
    <Chip
      label={config.label}
      size={size}
      icon={config.icon as any}
      sx={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
        fontWeight: 'medium'
      }}
    />
  )
}

interface FraudScoreIndicatorProps {
  score: number
  showLabel?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const FraudScoreIndicator: React.FC<FraudScoreIndicatorProps> = ({
  score,
  showLabel = true,
  size = 'medium'
}) => {
  const getFraudLevel = (score: number) => {
    if (score <= 30) return { level: 'Low', color: fraudScoreColors.low }
    if (score <= 60) return { level: 'Medium', color: fraudScoreColors.medium }
    if (score <= 85) return { level: 'High', color: fraudScoreColors.high }
    return { level: 'Critical', color: fraudScoreColors.critical }
  }

  const { level, color } = getFraudLevel(score)
  const sizeMap = {
    small: 80,
    medium: 100,
    large: 120
  }

  const ProgressCircle = styled(Box)({
    width: sizeMap[size],
    height: sizeMap[size],
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `conic-gradient(${color} ${score}%, #e2e8f0 ${score}% 100%)`,
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      width: sizeMap[size] - 20,
      height: sizeMap[size] - 20,
      borderRadius: '50%',
      backgroundColor: 'white'
    }
  })

  return (
    <Stack alignItems="center" spacing={1}>
      <ProgressCircle>
        <Typography
          variant={size === 'small' ? 'h6' : size === 'medium' ? 'h5' : 'h4'}
          fontWeight="bold"
          sx={{ position: 'relative', zIndex: 1 }}
        >
          {score}
        </Typography>
      </ProgressCircle>
      {showLabel && (
        <Stack alignItems="center">
          <Typography variant="caption" fontWeight="bold" color={color}>
            {level} Risk
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Fraud Score
          </Typography>
        </Stack>
      )}
    </Stack>
  )
}

interface ProgressCardProps {
  title: string
  current: number
  total: number
  label?: string
  color?: string
  showPercentage?: boolean
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  current,
  total,
  label,
  color = 'primary',
  showPercentage = true
}) => {
  const percentage = (current / total) * 100

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            {showPercentage && (
              <Typography variant="h6" fontWeight="bold">
                {Math.round(percentage)}%
              </Typography>
            )}
          </Stack>
          
          <Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: `${color}20`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: color
                }
              }}
            />
          </Box>
          
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {label || `${formatCurrency(current)} of ${formatCurrency(total)}`}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(current)}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

interface UserAvatarProps {
  user: {
    firstName: string
    lastName: string
    avatar?: string
    role?: string
  }
  size?: number
  showName?: boolean
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 40,
  showName = false
}) => {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Avatar
        src={user.avatar}
        sx={{
          width: size,
          height: size,
          bgcolor: 'primary.main',
          fontSize: size * 0.4
        }}
      >
        {initials}
      </Avatar>
      {showName && (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {user.firstName} {user.lastName}
          </Typography>
          {user.role && (
            <Typography variant="caption" color="text.secondary">
              {user.role.replace('_', ' ')}
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  )
}

export { Card, CardContent, Typography, Box, Stack, Chip, Avatar }