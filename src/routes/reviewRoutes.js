'use strict';

const express = require('express');
const router = express.Router();

const {
  createReview,
  getAllReviews,
  getReviewById,
  getProviderReviews,
  getServiceReviews,
  updateReview,
  deleteReview,
} = require('../controllers/reviewController');

const {
  reviewIdValidation,
  providerIdParamValidation,
  serviceIdParamValidation,
  createReviewValidation,
  updateReviewValidation,
} = require('../validations/reviewValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── Public Review Routes ────────────────────────────────────────────────────
router.get('/', getAllReviews);
router.get('/provider/:providerId', providerIdParamValidation, getProviderReviews);
router.get('/service/:serviceId', serviceIdParamValidation, getServiceReviews);
router.get('/:id', reviewIdValidation, getReviewById);

// ─── Protected Review Routes ─────────────────────────────────────────────────
router.post('/', protect, restrictTo('customer'), createReviewValidation, createReview);
router.put('/:id', protect, restrictTo('customer'), updateReviewValidation, updateReview);
router.delete('/:id', protect, reviewIdValidation, deleteReview);

module.exports = router;
