'use strict';

const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return formatted error response
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation Error: Please check your inputs',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Signup Validation Rules
 */
const signupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\s-]{8,20}$/)
    .withMessage('Please enter a valid phone number'),

  body('role')
    .optional()
    .isIn(['customer', 'provider', 'admin'])
    .withMessage('Role must be one of: customer, provider, admin'),

  validate,
];

/**
 * Login Validation Rules
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validate,
];

/**
 * Forgot Password Validation Rules
 */
const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  validate,
];

/**
 * Reset Password Validation Rules
 */
const resetPasswordValidation = [
  body('password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('token')
    .optional()
    .notEmpty()
    .withMessage('Reset token is required'),

  validate,
];

module.exports = {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  validate,
};
