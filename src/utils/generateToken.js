'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate JWT Access Token
 * @param {string} userId - Mongoose User ObjectId
 * @param {string} role - User role ('customer' | 'provider' | 'admin')
 * @returns {string} Signed JWT Token
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_local_service_booking_2026',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Generate Refresh Token (Structure ready for production expansion)
 * @param {string} userId - Mongoose User ObjectId
 * @returns {string} Signed Refresh Token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'super_secret_refresh_jwt_key_2026',
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );
};

/**
 * Send Token via HttpOnly Cookie and return response data object
 * @param {object} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {object} res - Express response object
 * @param {string} message - Response message
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Cookie expiration options
  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res.cookie('token', token, cookieOptions);

  // Sanitize user object for response (hide password and sensitive fields)
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    avatar: user.avatar || null,
    isEmailVerified: user.isEmailVerified || false,
    address: user.address || null,
    createdAt: user.createdAt,
  };

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: userData,
      token,
      refreshToken,
    },
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse,
};
