'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Protect Middleware
 * Verifies JWT token from Authorization header or HttpOnly cookie.
 * Attaches authenticated user object to req.user.
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check for token in Authorization Header (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check for token in Cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in to continue.',
        data: {},
      });
    }

    // 3. Verify JWT token signature
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_local_service_booking_2026'
    );

    // 4. Check if user still exists in database
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
        data: {},
      });
    }

    // 5. Check if user account is active
    if (!currentUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
        data: {},
      });
    }

    // 6. Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password. Please log in again.',
        data: {},
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token. Please log in again.',
        data: {},
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        data: {},
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error.',
      data: { error: error.message },
    });
  }
};

module.exports = {
  protect,
};
