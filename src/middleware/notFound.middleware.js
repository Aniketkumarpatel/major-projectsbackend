'use strict';

/**
 * 404 Not Found handler.
 * Catches requests to undefined routes and forwards a structured error.
 */
const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = notFound;
