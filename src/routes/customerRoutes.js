'use strict';

const express = require('express');
const router = express.Router();

const {
  getCustomerDashboard,
  getProfile,
  updateProfile,
  getCustomerBookings,
  getUpcomingBookings,
  getCompletedBookings,
  getCancelledBookings,
  getCustomerReviews,
  getCustomerNotifications,
} = require('../controllers/customerController');

const { updateProfileValidation } = require('../validations/customerValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Customer Routes Require Auth ────────────────────────────────────────
router.use(protect);
router.use(restrictTo('customer', 'admin'));

// ─── Dashboard Overview ──────────────────────────────────────────────────────
router.get('/dashboard', getCustomerDashboard);

// ─── Customer Profile ────────────────────────────────────────────────────────
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);

// ─── Customer Bookings ───────────────────────────────────────────────────────
router.get('/bookings', getCustomerBookings);
router.get('/upcoming-bookings', getUpcomingBookings);
router.get('/completed-bookings', getCompletedBookings);
router.get('/cancelled-bookings', getCancelledBookings);

// ─── Customer Reviews & Notifications ───────────────────────────────────────
router.get('/reviews', getCustomerReviews);
router.get('/notifications', getCustomerNotifications);

module.exports = router;
