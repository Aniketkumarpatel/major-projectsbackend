'use strict';

const express = require('express');
const router = express.Router();

const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const {
  createCategoryValidation,
  updateCategoryValidation,
  idParamValidation,
} = require('../validations/adminValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── Public Category Endpoints ───────────────────────────────────────────────
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// ─── Protected Admin Endpoints ───────────────────────────────────────────────
router.post('/', protect, restrictTo('admin'), createCategoryValidation, createCategory);
router.put('/:id', protect, restrictTo('admin'), updateCategoryValidation, updateCategory);
router.delete('/:id', protect, restrictTo('admin'), idParamValidation, deleteCategory);

module.exports = router;
