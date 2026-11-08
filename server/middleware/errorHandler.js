/**
 * Centralized Error Handler Middleware
 * 
 * Standardizes error responses across all API endpoints:
 * {
 *   error: "ErrorCode",
 *   message: "Human-readable error message",
 *   details: { ... optional details ... }
 * }
 */

const ERROR_CODES = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

/**
 * Custom Error Class
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Error Handler Middleware
 * Must be the LAST middleware in the stack
 */
export const errorHandler = (err, req, res, next) => {
  const logger = req.logger || console;
  
  // Log error
  if (err.statusCode >= 500) {
    logger.error('Server error:', err);
  } else {
    logger.warn('Client error:', err.message);
  }

  // Handle AppError (known error)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle validation errors (from middleware)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: err.details || err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Invalid or expired token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Token expired, please login again',
    });
  }

  // Handle database errors
  if (err.name === 'PostgresError' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'Database connection error, please try again later',
    });
  }

  // Default: Internal Server Error
  return res.status(500).json({
    error: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { debug: err.message }),
  });
};

/**
 * Async Route Wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { ERROR_CODES };
