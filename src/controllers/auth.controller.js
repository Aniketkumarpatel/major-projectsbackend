'use strict';

/**
 * Auth Controller – handles registration, login, logout, and password flows.
 * Stub implementations – replace with business logic in the next phase.
 */

// const User = require('../models/user.model');
// const AppError = require('../utils/AppError');

const register = async (_req, res) => {
  res.status(501).json({ success: false, message: 'register – not implemented' });
};

const login = async (_req, res) => {
  res.status(501).json({ success: false, message: 'login – not implemented' });
};

const logout = async (_req, res) => {
  res.status(501).json({ success: false, message: 'logout – not implemented' });
};

const forgotPassword = async (_req, res) => {
  res.status(501).json({ success: false, message: 'forgotPassword – not implemented' });
};

const resetPassword = async (_req, res) => {
  res.status(501).json({ success: false, message: 'resetPassword – not implemented' });
};

const verifyEmail = async (_req, res) => {
  res.status(501).json({ success: false, message: 'verifyEmail – not implemented' });
};

const refreshToken = async (_req, res) => {
  res.status(501).json({ success: false, message: 'refreshToken – not implemented' });
};

module.exports = { register, login, logout, forgotPassword, resetPassword, verifyEmail, refreshToken };
