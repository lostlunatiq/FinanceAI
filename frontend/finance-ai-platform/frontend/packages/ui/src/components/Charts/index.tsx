import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter
} from 'recharts'
import { Card, CardContent, Typography, Box, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { styled } from '@mui/material/styles'
import { TrendingUp, TrendingDown, Equalizer, BarChart as BarChartIcon } from '@mui/icons-material'
import { chartColors } from '../../theme'

interface ChartContainerProps {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  height?: number
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  actions,
  height = 300
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          {actions && <Box>{actions}</Box>}
        </Stack>
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

interface TimeSeriesChartProps {
  data: Array<{
    date: string
    value: number
    comparison?: number
  }>
  title: string
  valueLabel?: string
  comparisonLabel?: string
  height?: number
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  valueLabel = 'Value',
  comparisonLabel = 'Comparison',
  height = 300
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {formatDate(label)}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </Typography>
          ))}
        </Card>
      )
    }
    return null
  }

  return (
    <ChartContainer title={title} height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          name={valueLabel}
          stroke={chartColors[0]}
          strokeWidth={2}
          dot={{ strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        {data[0]?.comparison !== undefined && (
          <Line
            type="monotone"
            dataKey="comparison"
            name={comparisonLabel}
            stroke={chartColors[1]}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </LineChart>
    </ChartContainer>
  )
}

interface BarChartComponentProps {
  data: Array<{
    name: string
    value: number
    target?: number
  }>
  title: string
  valueLabel?: string
  targetLabel?: string
  height?: number
}

export const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  title,
  valueLabel = 'Value',
  targetLabel = 'Target',
  height = 300
}) => {
  return (
    <ChartContainer title={title} height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="value"
          name={valueLabel}
          fill={chartColors[0]}
          radius={[4, 4, 0, 0]}
        />
        {data[0]?.target !== undefined && (
          <Line
            type="monotone"
            dataKey="target"
            name={targetLabel}
            stroke={chartColors[1]}
            strokeWidth={2}
            dot={false}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}

interface PieChartComponentProps {
  data: Array<{
    name: string
    value: number
  }>
  title: string
  height?: number
}

export const PieChartComponent: React.FC<PieChartComponentProps> = ({
  data,
  title,
  height = 300
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const percentage = ((item.value / total) * 100).toFixed(1)
      return (
        <Card sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ color: payload[0].color }}>
            {item.name}
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {item.value.toLocaleString()} ({percentage}%)
          </Typography>
        </Card>
      )
    }
    return null
  }

  return (
    <ChartContainer title={title} height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ChartContainer>
  )
}

interface AreaChartComponentProps {
  data: Array<{
    date: string
    value: number
    forecast?: number
  }>
  title: string
  height?: number
}

export const AreaChartComponent: React.FC<AreaChartComponentProps> = ({
  data,
  title,
  height = 300
}) => {
  return (
    <ChartContainer title={title} height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColors[0]}
          fill={chartColors[0]}
          fillOpacity={0.3}
        />
        {data[0]?.forecast !== undefined && (
          <Area
            type="monotone"
            dataKey="forecast"
            stroke={chartColors[1]}
            fill={chartColors[1]}
            fillOpacity={0.1}
            strokeDasharray="5 5"
          />
        )}
      </AreaChart>
    </ChartContainer>
  )
}

interface SparklineChartProps {
  data: number[]
  trend: 'up' | 'down' | 'neutral'
  height?: number
  width?: number
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  trend,
  height = 40,
  width = 100
}) => {
  const chartData = data.map((value, index) => ({ index, value }))
  const color = trend === 'up' ? chartColors[1] : trend === 'down' ? chartColors[2] : chartColors[4]

  return (
    <Box sx={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

interface ComparisonChartProps {
  currentPeriod: Array<{
    name: string
    value: number
  }>
  previousPeriod: Array<{
    name: string
    value: number
  }>
  title: string
  height?: number
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  currentPeriod,
  previousPeriod,
  title,
  height = 300
}) => {
  const data = currentPeriod.map((item, index) => ({
    name: item.name,
    current: item.value,
    previous: previousPeriod[index]?.value || 0
  }))

  return (
    <ChartContainer title={title} height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="current"
          name="Current Period"
          fill={chartColors[0]}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="previous"
          name="Previous Period"
          fill={chartColors[1]}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}