'use strict';

const express = require('express');
const router = express.Router();

const {
  getProviderDashboard,
  getProfile,
  updateProfile,
  getProviderServices,
  getProviderBookings,
  getProviderReviews,
  getProviderEarnings,
} = require('../controllers/providerController');

const { updateProviderProfileValidation } = require('../validations/providerValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Provider Routes Require Provider / Admin Role ────────────────────────
router.use(protect);
router.use(restrictTo('provider', 'admin'));

// ─── Provider Dashboard Overview ─────────────────────────────────────────────
router.get('/dashboard', getProviderDashboard);

// ─── Provider Profile Management ─────────────────────────────────────────────
router.get('/profile', getProfile);
router.put('/profile', updateProviderProfileValidation, updateProfile);

// ─── Provider Resources & Reports ────────────────────────────────────────────
router.get('/services', getProviderServices);
router.get('/bookings', getProviderBookings);
router.get('/reviews', getProviderReviews);
router.get('/earnings', getProviderEarnings);

module.exports = router;
