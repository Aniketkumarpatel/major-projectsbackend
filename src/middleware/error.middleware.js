'use strict';

/**
 * Global Error Handling Middleware
 * Catches all errors passed via next(err) and formats them into a consistent JSON response.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // 1. Mongoose Bad ObjectId Cast Error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found. Invalid ID format for field '${err.path}'`;
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    statusCode = 409;
    message = `Duplicate field value for '${field}'. A record with this ${field} already exists.`;
  }

  // 3. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = 'Validation Error: Please check your input fields';
  }

  // 4. JWT JsonWebToken Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token signature. Please log in again.';
  }

  // 5. JWT Token Expired Error
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session token has expired. Please log in again.';
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'development') {
    console.error('SERVER ERROR 💥:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: {
      ...(errors.length > 0 && { errors }),
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
