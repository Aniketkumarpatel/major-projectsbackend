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
      message: 'Validation Error: Please check your booking inputs',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Booking ID URL parameter validation
 */
const bookingIdValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid booking ID format'),

  validate,
];

/**
 * Create Booking Validation Rules
 */
const createBookingValidation = [
  body('service')
    .notEmpty()
    .withMessage('Service ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Service ID format'),

  body('bookingDate')
    .notEmpty()
    .withMessage('Booking date is required')
    .isISO8601()
    .withMessage('Booking date must be a valid ISO Date (YYYY-MM-DD)'),

  body('timeSlot')
    .trim()
    .notEmpty()
    .withMessage('Time slot is required'),

  body('address.line1')
    .trim()
    .notEmpty()
    .withMessage('Address line 1 is required'),

  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('address.pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  validate,
];

/**
 * Reason Validation (for cancellation or rejection)
 */
const reasonValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid booking ID format'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),

  validate,
];

module.exports = {
  bookingIdValidation,
  createBookingValidation,
  reasonValidation,
  validate,
};
