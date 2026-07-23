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
      message: 'Validation Error: Please check your review input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

/**
 * Review ID parameter validation
 */
const reviewIdValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid review ID format'),

  validate,
];

/**
 * Provider ID parameter validation
 */
const providerIdParamValidation = [
  param('providerId')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Provider ID format'),

  validate,
];

/**
 * Service ID parameter validation
 */
const serviceIdParamValidation = [
  param('serviceId')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Service ID format'),

  validate,
];

/**
 * Create Review Validation Rules
 */
const createReviewValidation = [
  body('booking')
    .notEmpty()
    .withMessage('Booking ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Booking ID format'),

  body('rating')
    .notEmpty()
    .withMessage('Rating score is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ min: 3, max: 1000 })
    .withMessage('Comment must be between 3 and 1000 characters'),

  validate,
];

/**
 * Update Review Validation Rules
 */
const updateReviewValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid review ID format'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Comment must be between 3 and 1000 characters'),

  validate,
];

module.exports = {
  reviewIdValidation,
  providerIdParamValidation,
  serviceIdParamValidation,
  createReviewValidation,
  updateReviewValidation,
  validate,
};
