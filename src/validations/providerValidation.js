'use strict';

const { body, validationResult } = require('express-validator');

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
      message: 'Validation Error: Please check your provider profile input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Update Provider Profile Validation Rules
 */
const updateProviderProfileValidation = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Business name must be between 2 and 150 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),

  body('experienceYears')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Experience years must be a positive number'),

  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),

  body('serviceAreas')
    .optional()
    .isArray()
    .withMessage('Service areas must be an array of strings'),

  body('availabilityStatus')
    .optional()
    .isIn(['available', 'busy', 'offline'])
    .withMessage('Availability status must be available, busy, or offline'),

  validate,
];

module.exports = {
  updateProviderProfileValidation,
  validate,
};
