'use strict';

const { body, param, query, validationResult } = require('express-validator');
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
      message: 'Validation Error: Please check your service input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Service ID URL parameter validation
 */
const serviceIdValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid service ID format'),

  validate,
];

/**
 * Create Service Validation Rules
 */
const createServiceValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Service title is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Title must be between 3 and 150 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Service description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Category ID format'),

  body('price.amount')
    .notEmpty()
    .withMessage('Price amount is required')
    .isFloat({ min: 0 })
    .withMessage('Price amount must be a positive number'),

  body('price.unit')
    .optional()
    .isIn(['fixed', 'per_hour', 'per_day', 'quote'])
    .withMessage('Price unit must be fixed, per_hour, per_day, or quote'),

  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City location is required'),

  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array of strings'),

  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array of image URLs'),

  validate,
];

/**
 * Update Service Validation Rules
 */
const updateServiceValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid service ID format'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Title must be between 3 and 150 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('category')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Category ID format'),

  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be a positive number'),

  body('price.unit')
    .optional()
    .isIn(['fixed', 'per_hour', 'per_day', 'quote'])
    .withMessage('Price unit must be fixed, per_hour, per_day, or quote'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  validate,
];

module.exports = {
  serviceIdValidation,
  createServiceValidation,
  updateServiceValidation,
  validate,
};
