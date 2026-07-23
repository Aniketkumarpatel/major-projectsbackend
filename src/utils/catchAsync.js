'use strict';

/**
 * Wraps async route handlers to automatically pass errors to next().
 * Eliminates the need for try/catch in every controller.
 *
 * @param {Function} fn - async controller function
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/:id', catchAsync(async (req, res, next) => { ... }));
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
