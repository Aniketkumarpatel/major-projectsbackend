'use strict';

const express = require('express');
const router = express.Router();

const {
  createPaymentIntent,
  verifyPayment,
  getPaymentHistory,
  refundPayment,
} = require('../controllers/paymentController');

const {
  createIntentValidation,
  verifyPaymentValidation,
} = require('../validations/paymentValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Payment Routes Require Auth ─────────────────────────────────────────
router.use(protect);

// ─── Create & Verify Payment Intents ─────────────────────────────────────────
router.post('/create-intent', createIntentValidation, createPaymentIntent);
router.post('/verify', verifyPaymentValidation, verifyPayment);

// ─── Payment Transaction History ──────────────────────────────────────────────
router.get('/history', getPaymentHistory);

// ─── Admin Refund Payment ────────────────────────────────────────────────────
router.post('/refund', restrictTo('admin'), refundPayment);

module.exports = router;
