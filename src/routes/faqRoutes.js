'use strict';

const express = require('express');
const router = express.Router();

const {
  getAllFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
} = require('../controllers/faqController');

const {
  faqIdValidation,
  createFaqValidation,
  updateFaqValidation,
} = require('../validations/faqValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── Public FAQ Endpoints ───────────────────────────────────────────────────
router.get('/', getAllFaqs);
router.get('/:id', faqIdValidation, getFaqById);

// ─── Protected Admin FAQ Endpoints ──────────────────────────────────────────
router.post('/', protect, restrictTo('admin'), createFaqValidation, createFaq);
router.put('/:id', protect, restrictTo('admin'), updateFaqValidation, updateFaq);
router.delete('/:id', protect, restrictTo('admin'), faqIdValidation, deleteFaq);

module.exports = router;
