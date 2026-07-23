'use strict';

const express = require('express');
const router = express.Router();

const {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
} = require('../controllers/contactController');

const {
  createContactValidation,
  contactIdValidation,
} = require('../validations/contactValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── Public Contact Submission Endpoint ─────────────────────────────────────
router.post('/', createContactValidation, createContact);

// ─── Protected Admin Endpoints ──────────────────────────────────────────────
router.get('/', protect, restrictTo('admin'), getAllContacts);
router.get('/:id', protect, restrictTo('admin'), contactIdValidation, getContactById);
router.put('/:id', protect, restrictTo('admin'), contactIdValidation, updateContactStatus);
router.delete('/:id', protect, restrictTo('admin'), contactIdValidation, deleteContact);

module.exports = router;
