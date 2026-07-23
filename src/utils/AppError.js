'use strict';

/**
 * Custom application error class.
 * Extends native Error with an HTTP status code and operational flag.
 * Pass instances to next() in route handlers for centralized error handling.
 *
 * @example
 *   throw new AppError('User not found', 404);
 *   next(new AppError('Unauthorized', 401));
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // distinguishes from unexpected programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
