'use strict';

const express = require('express');
const router = express.Router();

const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require('../controllers/servicesController');

const {
  serviceIdValidation,
  createServiceValidation,
  updateServiceValidation,
} = require('../validations/servicesValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── Public Service Routes ───────────────────────────────────────────────────
router.get('/', getAllServices);
router.get('/:id', serviceIdValidation, getServiceById);

// ─── Protected Routes (Provider / Admin Only) ────────────────────────────────
router.post(
  '/',
  protect,
  restrictTo('provider', 'admin'),
  createServiceValidation,
  createService
);

router.put(
  '/:id',
  protect,
  restrictTo('provider', 'admin'),
  updateServiceValidation,
  updateService
);

router.delete(
  '/:id',
  protect,
  restrictTo('provider', 'admin'),
  serviceIdValidation,
  deleteService
);

module.exports = router;
