'use strict';

const crypto = require('crypto');
const User = require('../models/user.model');
const Provider = require('../models/provider.model');
const { sendTokenResponse } = require('../utils/generateToken');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Register a new user (Customer, Provider, or Admin)
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = catchAsync(async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  // 1. Check if user with this email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'An account with this email address already exists',
      data: {},
    });
  }

  // 2. Create new user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'customer',
    phone: phone || null,
    address: address || null,
  });

  // 3. If registered role is 'provider', automatically initialize a Provider profile record
  if (user.role === 'provider') {
    await Provider.create({
      user: user._id,
      businessName: `${user.name}'s Services`,
      location: {
        city: address?.city || 'Default City',
      },
    });
  }

  // 4. Send response with JWT token
  sendTokenResponse(user, 201, res, 'Account registered successfully');
});

/**
 * @desc    Login existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // 1. Find user by email and include password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      data: {},
    });
  }

  // 2. Check if user account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.',
      data: {},
    });
  }

  // 3. Compare password using instance method
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      data: {},
    });
  }

  // 4. Update last login timestamp
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // 5. Send response with JWT token
  sendTokenResponse(user, 200, res, 'Logged in successfully');
});

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000), // expire in 5s
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    data: {},
  });
});

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res) => {
  let providerProfile = null;

  // If user is a provider, fetch associated Provider profile details
  if (req.user.role === 'provider') {
    providerProfile = await Provider.findOne({ user: req.user._id });
  }

  res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        avatar: req.user.avatar,
        address: req.user.address,
        isEmailVerified: req.user.isEmailVerified,
        isActive: req.user.isActive,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
      },
      ...(providerProfile && { providerProfile }),
    },
  });
});

/**
 * @desc    Forgot Password (Placeholder for sending reset email)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No registered user found with that email address',
      data: {},
    });
  }

  // Generate password reset token via User method
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Placeholder for email service (e.g. Nodemailer/SendGrid)
  res.status(200).json({
    success: true,
    message: 'Password reset token generated. (Email sending will be implemented in email service)',
    data: {
      email: user.email,
      resetToken, // Returned for testing placeholder
      expiresIn: '10 minutes',
    },
  });
});

/**
 * @desc    Reset Password using token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  const resetTokenInput = token || req.params.token;

  if (!resetTokenInput) {
    return res.status(400).json({
      success: false,
      message: 'Reset token is required',
      data: {},
    });
  }

  // Hash provided token to compare with hashed token in DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetTokenInput)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired password reset token',
      data: {},
    });
  }

  // Update password and clear reset fields
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successfully. You are now logged in.');
});

module.exports = {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
