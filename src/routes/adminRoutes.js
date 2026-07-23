'use strict';

const express = require('express');
const router = express.Router();

const {
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  deleteUser,
  getProviders,
  verifyProvider,
  getServices,
  updateServiceStatus,
  deleteService,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBookings,
  getReviews,
  deleteReview,
  getPayments,
  getContacts,
  replyContact,
} = require('../controllers/adminController');

const {
  idParamValidation,
  createCategoryValidation,
  updateCategoryValidation,
  verifyProviderValidation,
} = require('../validations/adminValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Admin Routes Require Admin Authentication ───────────────────────────
router.use(protect);
router.use(restrictTo('admin'));

// ─── Admin Dashboard & Overview ──────────────────────────────────────────────
router.get('/dashboard', getAdminDashboard);

// ─── Manage Users ─────────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.put('/users/:id/status', idParamValidation, updateUserStatus);
router.delete('/users/:id', idParamValidation, deleteUser);

// ─── Manage Providers ─────────────────────────────────────────────────────────
router.get('/providers', getProviders);
router.put('/providers/:id/verify', verifyProviderValidation, verifyProvider);

// ─── Manage Services ──────────────────────────────────────────────────────────
router.get('/services', getServices);
router.put('/services/:id/status', idParamValidation, updateServiceStatus);
router.delete('/services/:id', idParamValidation, deleteService);

// ─── Manage Categories ────────────────────────────────────────────────────────
router.get('/categories', getCategories);
router.post('/categories', createCategoryValidation, createCategory);
router.put('/categories/:id', updateCategoryValidation, updateCategory);
router.delete('/categories/:id', idParamValidation, deleteCategory);

// ─── Manage Bookings ──────────────────────────────────────────────────────────
router.get('/bookings', getBookings);

// ─── Manage Reviews ───────────────────────────────────────────────────────────
router.get('/reviews', getReviews);
router.delete('/reviews/:id', idParamValidation, deleteReview);

// ─── Payments & Financial Transactions ────────────────────────────────────────
router.get('/payments', getPayments);

// ─── Contact Messages & Support Inquiries ─────────────────────────────────────
router.get('/contacts', getContacts);
router.put('/contacts/:id/reply', idParamValidation, replyContact);

module.exports = router;
