import React from 'react'
import {
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
  Switch,
  InputAdornment,
  IconButton,
  FormHelperText,
  Autocomplete
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  CalendarToday,
  Search,
  AttachFile,
  Delete,
  Add,
  CloudUpload
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { Controller, useForm, useFormContext } from 'react-hook-form'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'

interface FormFieldProps {
  name: string
  label: string
  required?: boolean
  helperText?: string
  fullWidth?: boolean
}

export const TextInput: React.FC<FormFieldProps & {
  type?: string
  multiline?: boolean
  rows?: number
  disabled?: boolean
  placeholder?: string
  prefix?: string
  suffix?: string
  showPasswordToggle?: boolean
}> = ({
  name,
  label,
  type = 'text',
  required = false,
  helperText,
  fullWidth = true,
  multiline = false,
  rows = 4,
  disabled = false,
  placeholder,
  prefix,
  suffix,
  showPasswordToggle = false
}) => {
  const { control } = useFormContext()
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          label={label}
          type={showPasswordToggle && showPassword ? 'text' : type}
          required={required}
          error={!!error}
          helperText={error?.message || helperText}
          fullWidth={fullWidth}
          multiline={multiline}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          InputProps={{
            startAdornment: prefix ? (
              <InputAdornment position="start">{prefix}</InputAdornment>
            ) : undefined,
            endAdornment: showPasswordToggle ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ) : suffix ? (
              <InputAdornment position="end">{suffix}</InputAdornment>
            ) : undefined
          }}
        />
      )}
    />
  )
}

export const SelectInput: React.FC<FormFieldProps & {
  options: Array<{ value: string; label: string }>
  multiple?: boolean
  disabled?: boolean
}> = ({
  name,
  label,
  options,
  required = false,
  helperText,
  fullWidth = true,
  multiple = false,
  disabled = false
}) => {
  const { control } = useFormContext()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth={fullWidth} error={!!error} disabled={disabled}>
          <InputLabel>{label}</InputLabel>
          <Select
            {...field}
            label={label}
            multiple={multiple}
            value={field.value || (multiple ? [] : '')}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{error?.message || helperText}</FormHelperText>
        </FormControl>
      )}
    />
  )
}

export const DateInput: React.FC<FormFieldProps & {
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
}> = ({
  name,
  label,
  required = false,
  helperText,
  fullWidth = true,
  minDate,
  maxDate,
  disabled = false
}) => {
  const { control } = useFormContext()

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <DatePicker
            label={label}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            slotProps={{
              textField: {
                fullWidth,
                error: !!error,
                helperText: error?.message || helperText,
                required,
                InputProps: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarToday />
                    </InputAdornment>
                  )
                }
              }
            }}
          />
        )}
      />
    </LocalizationProvider>
  )
}

export const CheckboxInput: React.FC<{
  name: string
  label: string
  required?: boolean
  disabled?: boolean
}> = ({
  name,
  label,
  required = false,
  disabled = false
}) => {
  const { control } = useFormContext()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!field.value}
              onChange={field.onChange}
              required={required}
              disabled={disabled}
            />
          }
          label={label}
        />
      )}
    />
  )
}

export const RadioInput: React.FC<{
  name: string
  label: string
  options: Array<{ value: string; label: string }>
  required?: boolean
  disabled?: boolean
  row?: boolean
}> = ({
  name,
  label,
  options,
  required = false,
  disabled = false,
  row = false
}) => {
  const { control } = useFormContext()

  return (
    <FormControl component="fieldset">
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup {...field} row={row}>
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio disabled={disabled} />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        )}
      />
    </FormControl>
  )
}

export const SliderInput: React.FC<{
  name: string
  label: string
  min: number
  max: number
  step?: number
  marks?: Array<{ value: number; label: string }>
  valueLabelDisplay?: 'on' | 'auto' | 'off'
  disabled?: boolean
}> = ({
  name,
  label,
  min,
  max,
  step = 1,
  marks,
  valueLabelDisplay = 'auto',
  disabled = false
}) => {
  const { control } = useFormContext()

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Slider
            {...field}
            min={min}
            max={max}
            step={step}
            marks={marks}
            valueLabelDisplay={valueLabelDisplay}
            disabled={disabled}
            sx={{ mt: 2 }}
          />
        )}
      />
    </Box>
  )
}

export const SwitchInput: React.FC<{
  name: string
  label: string
  disabled?: boolean
}> = ({
  name,
  label,
  disabled = false
}) => {
  const { control } = useFormContext()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch
              checked={!!field.value}
              onChange={field.onChange}
              disabled={disabled}
            />
          }
          label={label}
        />
      )}
    />
  )
}

export const FileUploadInput: React.FC<{
  name: string
  label: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number // in bytes
  disabled?: boolean
}> = ({
  name,
  label,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  multiple = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false
}) => {
  const { control, setValue, watch } = useFormContext()
  const files = watch(name) || []
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || [])
    
    // Validate file size
    const oversizedFiles = newFiles.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed the maximum size of ${maxSize / 1024 / 1024}MB`)
      return
    }

    // Validate number of files
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    setValue(name, [...files, ...newFiles], { shouldValidate: true })
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_: any, i: number) => i !== index)
    setValue(name, newFiles, { shouldValidate: true })
  }

  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1
  })

  return (
    <Controller
      name={name}
      control={control}
      render={({ fieldState: { error } }) => (
        <Box>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUpload />}
            disabled={disabled}
            sx={{ mb: 2 }}
          >
            {label}
            <VisuallyHiddenInput
              type="file"
              ref={inputRef}
              accept={accept}
              multiple={multiple}
              onChange={handleFileChange}
            />
          </Button>
          
          {error && (
            <FormHelperText error>{error.message}</FormHelperText>
          )}

          {files.length > 0 && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              {files.map((file: File, index: number) => (
                <Stack
                  key={index}
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                >
                  <AttachFile fontSize="small" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    disabled={disabled}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      )}
    />
  )
}

export const SearchInput: React.FC<{
  placeholder?: string
  onSearch: (value: string) => void
  disabled?: boolean
}> = ({
  placeholder = 'Search...',
  onSearch,
  disabled = false
}) => {
  const [value, setValue] = React.useState('')

  const handleSearch = () => {
    onSearch(value)
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <TextField
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyPress={handleKeyPress}
      disabled={disabled}
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleSearch} disabled={disabled}>
              <Search />
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  )
}

export const AutocompleteInput: React.FC<{
  name: string
  label: string
  options: Array<{ value: string; label: string }>
  required?: boolean
  helperText?: string
  fullWidth?: boolean
  disabled?: boolean
}> = ({
  name,
  label,
  options,
  required = false,
  helperText,
  fullWidth = true,
  disabled = false
}) => {
  const { control } = useFormContext()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          options={options}
          getOptionLabel={(option) => 
            typeof option === 'string' 
              ? options.find(o => o.value === option)?.label || option 
              : option.label
          }
          isOptionEqualToValue={(option, value) => 
            typeof option === 'string' 
              ? option === value 
              : option.value === value?.value
          }
          onChange={(_, newValue) => field.onChange(newValue?.value || newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              required={required}
              error={!!error}
              helperText={error?.message || helperText}
              disabled={disabled}
              fullWidth={fullWidth}
            />
          )}
          disabled={disabled}
        />
      )}
    />
  )
}