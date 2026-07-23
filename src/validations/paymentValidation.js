'use strict';

const { body, validationResult } = require('express-validator');
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
      message: 'Validation Error: Please check your payment input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

const createIntentValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Booking ID format'),

  validate,
];

const verifyPaymentValidation = [
  body('bookingId')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Booking ID format'),

  body('paymentIntentId')
    .optional()
    .trim(),

  body('status')
    .optional()
    .isIn(['pending', 'paid', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),

  validate,
];

module.exports = {
  createIntentValidation,
  verifyPaymentValidation,
  validate,
};
