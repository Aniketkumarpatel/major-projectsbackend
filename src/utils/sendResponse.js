'use strict';

/**
 * Send a standardized JSON response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Human-readable message
 * @param {object} [data] - Response payload
 * @param {object} [meta] - Pagination or extra metadata
 */
const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: statusCode < 400,
    message,
  };

  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;

  return res.status(statusCode).json(response);
};

module.exports = sendResponse;
