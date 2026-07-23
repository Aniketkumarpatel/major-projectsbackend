'use strict';

const express = require('express');
const router = express.Router();

const { getMe } = require('../controllers/authController');
const { getUsers, updateUserStatus, deleteUser } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.use(protect);

// Current Logged in User Profile
router.get('/me', getMe);

// Admin User Management
router.get('/', restrictTo('admin'), getUsers);
router.patch('/:id', restrictTo('admin'), updateUserStatus);
router.put('/:id', restrictTo('admin'), updateUserStatus);
router.delete('/:id', restrictTo('admin'), deleteUser);

module.exports = router;
