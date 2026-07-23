'use strict';

const jwt = require('jsonwebtoken');

/**
 * Protect – verifies JWT from Authorization header or cookie.
 * Attach the decoded payload to req.user for downstream use.
 * Implement after User model is created.
 */
const protect = async (_req, _res, next) => {
  // TODO: Implement authentication guard
  // 1. Extract token from `Authorization: Bearer <token>` or cookie
  // 2. Verify token signature
  // 3. Fetch user from DB and attach to req.user
  // 4. Call next() if valid, else pass AppError to next()
  next();
};

/**
 * restrictTo – role-based access control middleware factory.
 * @param {...string} roles – allowed roles (e.g. 'admin', 'provider', 'customer')
 */
const restrictTo = (...roles) => {
  return (_req, _res, next) => {
    // TODO: Check req.user.role against allowed roles
    // If not allowed, call next(new AppError('Forbidden', 403))
    void roles;
    next();
  };
};

module.exports = { protect, restrictTo };
