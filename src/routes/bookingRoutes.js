'use strict';

const express = require('express');
const router = express.Router();

const {
  createBooking,
  getAllBookings,
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking,
  cancelBooking,
  updateBooking,
  deleteBooking,
} = require('../controllers/bookingController');

const {
  bookingIdValidation,
  createBookingValidation,
  reasonValidation,
} = require('../validations/bookingValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Booking Routes Require Authentication ──────────────────────────────
router.use(protect);

// Role-specific booking lists
router.get('/customer', restrictTo('customer', 'admin'), getCustomerBookings);
router.get('/provider', restrictTo('provider', 'admin'), getProviderBookings);

// Base CRUD endpoints
router.post('/', createBookingValidation, createBooking);
router.get('/', getAllBookings);
router.get('/:id', bookingIdValidation, getBookingById);
router.put('/:id', bookingIdValidation, updateBooking);
router.delete('/:id', bookingIdValidation, deleteBooking);

// Lifecycle Status Actions
router.put(
  '/:id/accept',
  restrictTo('provider', 'admin'),
  bookingIdValidation,
  acceptBooking
);

router.put(
  '/:id/reject',
  restrictTo('provider', 'admin'),
  reasonValidation,
  rejectBooking
);

router.put(
  '/:id/start',
  restrictTo('provider', 'admin'),
  bookingIdValidation,
  startBooking
);

router.put(
  '/:id/complete',
  restrictTo('provider', 'admin'),
  bookingIdValidation,
  completeBooking
);

router.put('/:id/cancel', reasonValidation, cancelBooking);

module.exports = router;
