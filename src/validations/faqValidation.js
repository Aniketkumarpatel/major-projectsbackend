'use strict';

const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation Error: Please check your FAQ input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

const faqIdValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid FAQ ID format'),

  validate,
];

const createFaqValidation = [
  body('question')
    .trim()
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ min: 5, max: 300 })
    .withMessage('Question must be between 5 and 300 characters'),

  body('answer')
    .trim()
    .notEmpty()
    .withMessage('Answer is required')
    .isLength({ min: 10, max: 3000 })
    .withMessage('Answer must be between 10 and 3000 characters'),

  body('category')
    .optional()
    .isIn([
      'General',
      'Customer & Booking',
      'Provider & Account',
      'Payments & Refunds',
      'Safety & Trust',
      'Technical Support',
    ])
    .withMessage('Invalid FAQ category'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  validate,
];

const updateFaqValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid FAQ ID format'),

  body('question')
    .optional()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Question must be between 5 and 300 characters'),

  body('answer')
    .optional()
    .trim()
    .isLength({ min: 10, max: 3000 })
    .withMessage('Answer must be between 10 and 3000 characters'),

  body('category')
    .optional()
    .isIn([
      'General',
      'Customer & Booking',
      'Provider & Account',
      'Payments & Refunds',
      'Safety & Trust',
      'Technical Support',
    ])
    .withMessage('Invalid FAQ category'),

  validate,
];

module.exports = {
  faqIdValidation,
  createFaqValidation,
  updateFaqValidation,
  validate,
};
