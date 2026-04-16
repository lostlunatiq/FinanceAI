import { ERROR_CODES } from '../constants'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(ERROR_CODES.UNAUTHORIZED, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(ERROR_CODES.FORBIDDEN, message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found') {
    super(ERROR_CODES.NOT_FOUND, message)
    this.name = 'NotFoundError'
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Server Error') {
    super(ERROR_CODES.SERVER_ERROR, message)
    this.name = 'ServerError'
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network Error') {
    super(ERROR_CODES.NETWORK_ERROR, message)
    this.name = 'NetworkError'
  }
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError || (error && typeof error.code === 'string')
}

export function createApiError(error: any): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (error?.response?.data) {
    const { code, message, details } = error.response.data
    return new ApiError(code || ERROR_CODES.SERVER_ERROR, message || 'Unknown error', details)
  }

  if (error?.request) {
    return new NetworkError('Network error occurred')
  }

  return new ServerError('An unexpected error occurred')
}