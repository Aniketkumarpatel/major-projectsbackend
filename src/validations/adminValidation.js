'use strict';

const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Helper middleware to check validation result
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
      message: 'Validation Error: Please check your input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Generic Mongo ID parameter validation
 */
const idParamValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ID format'),

  validate,
];

/**
 * Create Category Validation Rules
 */
const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 80 })
    .withMessage('Category name must be between 2 and 80 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('icon')
    .optional()
    .trim(),

  body('color')
    .optional()
    .trim(),

  validate,
];

/**
 * Update Category Validation Rules
 */
const updateCategoryValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Category ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Category name must be between 2 and 80 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  validate,
];

/**
 * Verify Provider Status Validation Rules
 */
const verifyProviderValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Provider ID format'),

  body('verificationStatus')
    .notEmpty()
    .withMessage('Verification status is required')
    .isIn(['pending', 'approved', 'rejected', 'suspended'])
    .withMessage('Status must be approved, rejected, pending, or suspended'),

  validate,
];

module.exports = {
  idParamValidation,
  createCategoryValidation,
  updateCategoryValidation,
  verifyProviderValidation,
  validate,
};
