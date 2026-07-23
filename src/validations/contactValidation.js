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
      message: 'Validation Error: Please check your contact form input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

const createContactValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\s-]{8,20}$/)
    .withMessage('Please enter a valid phone number'),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isIn([
      'Booking Issue',
      'Provider Complaint',
      'Refund Request',
      'Partnership Inquiry',
      'General Feedback',
      'Other',
    ])
    .withMessage('Please select a valid subject category'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),

  validate,
];

const contactIdValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Contact ID format'),

  validate,
];

module.exports = {
  createContactValidation,
  contactIdValidation,
  validate,
};
