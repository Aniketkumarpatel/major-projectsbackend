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
      message: 'Validation Error: Please check your input fields',
      data: {
        errors: formattedErrors,
      },
    });
  }
  next();
};

const notificationIdValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Notification ID format'),

  validate,
];

const sendSystemNotificationValidation = [
  body('recipient')
    .notEmpty()
    .withMessage('Recipient User ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Recipient User ID format'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),

  validate,
];

module.exports = {
  notificationIdValidation,
  sendSystemNotificationValidation,
  validate,
};
