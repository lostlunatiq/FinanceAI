import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridFilterModel,
  GridSortModel,
  GridPaginationModel
} from '@mui/x-data-grid'
import {
  Search,
  FilterList,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Download,
  CheckCircle,
  Cancel,
  Receipt
} from '@mui/icons-material'
import { formatCurrency, formatDate } from '@finance-ai/core'
import { Invoice, InvoiceStatus } from '../types'
import { StatusChip } from '@finance-ai/ui'

interface InvoiceListProps {
  invoices: Invoice[]
  loading?: boolean
  onView?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onApprove?: (invoice: Invoice) => void
  onReject?: (invoice: Invoice) => void
  onFilterChange?: (filters: any) => void
  onSortChange?: (sort: any) => void
  onPageChange?: (page: number, pageSize: number) => void
  page?: number
  pageSize?: number
  total?: number
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onFilterChange,
  onSortChange,
  onPageChange,
  page = 0,
  pageSize = 10,
  total = 0
}) => {
  const [search, setSearch] = useState('')
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus[]>([])

  const columns: GridColDef<Invoice>[] = [
    {
      field: 'invoiceNumber',
      headerName: 'Invoice #',
      width: 150,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Receipt fontSize="small" color="action" />
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Stack>
      )
    },
    {
      field: 'vendorName',
      headerName: 'Vendor',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'invoiceDate',
      headerName: 'Date',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      )
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      )
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          {formatCurrency(params.row.amount, params.row.currency)}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      )
    },
    {
      field: 'fraudScore',
      headerName: 'Risk',
      width: 120,
      renderCell: (params) => {
        if (!params.value) return null
        
        let color: 'success' | 'warning' | 'error' | 'info'
        if (params.value <= 30) color = 'success'
        else if (params.value <= 60) color = 'warning'
        else if (params.value <= 85) color = 'error'
        else color = 'info'
        
        return (
          <Chip
            label={`${params.value}%`}
            size="small"
            color={color}
            variant="outlined"
          />
        )
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
        const invoice = params.row

        const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
          event.stopPropagation()
          setAnchorEl(event.currentTarget)
        }

        const handleMenuClose = () => {
          setAnchorEl(null)
        }

        const handleView = () => {
          handleMenuClose()
          onView?.(invoice)
        }

        const handleEdit = () => {
          handleMenuClose()
          onEdit?.(invoice)
        }

        const handleDelete = () => {
          handleMenuClose()
          onDelete?.(invoice)
        }

        const handleApprove = () => {
          handleMenuClose()
          onApprove?.(invoice)
        }

        const handleReject = () => {
          handleMenuClose()
          onReject?.(invoice)
        }

        return (
          <>
            <Stack direction="row" spacing={1}>
              <Tooltip title="View">
                <IconButton size="small" onClick={handleView}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
              
              {invoice.status === 'pending' && (
                <>
                  <Tooltip title="Approve">
                    <IconButton size="small" onClick={handleApprove} color="success">
                      <CheckCircle fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton size="small" onClick={handleReject} color="error">
                      <Cancel fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Stack>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem onClick={handleView}>
                <Visibility fontSize="small" sx={{ mr: 1 }} />
                View Details
              </MenuItem>
              <MenuItem onClick={handleEdit}>
                <Edit fontSize="small" sx={{ mr: 1 }} />
                Edit
              </MenuItem>
              <MenuItem onClick={handleDelete}>
                <Delete fontSize="small" sx={{ mr: 1 }} />
                Delete
              </MenuItem>
              <MenuItem onClick={() => console.log('Download')}>
                <Download fontSize="small" sx={{ mr: 1 }} />
                Download
              </MenuItem>
            </Menu>
          </>
        )
      }
    }
  ]

  const handleFilterChange = (model: GridFilterModel) => {
    onFilterChange?.(model)
  }

  const handleSortChange = (model: GridSortModel) => {
    onSortChange?.(model)
  }

  const handlePaginationChange = (model: GridPaginationModel) => {
    onPageChange?.(model.page, model.pageSize)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    // Implement search logic
  }

  const handleStatusFilter = (status: InvoiceStatus) => {
    const newStatus = selectedStatus.includes(status)
      ? selectedStatus.filter(s => s !== status)
      : [...selectedStatus, status]
    
    setSelectedStatus(newStatus)
    // Apply filter
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            Invoices
          </Typography>
          
          <Stack direction="row" spacing={2}>
            <TextField
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              sx={{ width: 300 }}
            />
            
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            >
              Filter
            </Button>
            
            <Button variant="contained">
              New Invoice
            </Button>
          </Stack>
        </Stack>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
        >
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            Status
          </Typography>
          {(['draft', 'pending', 'under_review', 'approved', 'rejected', 'paid', 'cancelled'] as InvoiceStatus[]).map((status) => (
            <MenuItem key={status} onClick={() => handleStatusFilter(status)}>
              <StatusChip status={status} size="small" />
            </MenuItem>
          ))}
        </Menu>

        {/* Data Grid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={invoices}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            paginationModel={{ page, pageSize }}
            rowCount={total}
            paginationMode="server"
            filterMode="server"
            sortingMode="server"
            onPaginationModelChange={handlePaginationChange}
            onFilterModelChange={handleFilterChange}
            onSortModelChange={handleSortChange}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: false,
                printOptions: { disableToolbarButton: true },
                csvOptions: { disableToolbarButton: true }
              }
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #e2e8f0'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f8fafc',
                borderBottom: '2px solid #e2e8f0'
              }
            }}
          />
        </Box>

        {/* Summary Stats */}
        {invoices.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ mt: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(
                  invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
                  'USD'
                )}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Pending Approval
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {invoices.filter(i => i.status === 'pending').length}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                High Risk
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                {invoices.filter(i => (i.fraudScore || 0) > 60).length}
              </Typography>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}