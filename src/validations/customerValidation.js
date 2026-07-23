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
      message: 'Validation Error: Please check your input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Update Customer Profile Validation Rules
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\s-]{8,20}$/)
    .withMessage('Please enter a valid phone number'),

  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid image URL'),

  body('address.street')
    .optional()
    .trim(),

  body('address.city')
    .optional()
    .trim(),

  body('address.state')
    .optional()
    .trim(),

  body('address.pincode')
    .optional()
    .trim(),

  validate,
];

module.exports = {
  updateProfileValidation,
  validate,
};
