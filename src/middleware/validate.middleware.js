'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs after express-validator chains.
 * If there are validation errors, responds with 422 and a list of field errors.
 * Otherwise calls next() to proceed to the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = validate;
