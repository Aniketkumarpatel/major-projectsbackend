'use strict';

const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('../validations/authValidation');

const { protect } = require('../middleware/authMiddleware');

// ─── Public Auth Routes ──────────────────────────────────────────────────────
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// ─── Protected Auth Routes ───────────────────────────────────────────────────
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
