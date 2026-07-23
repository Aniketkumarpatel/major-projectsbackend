'use strict';

const express = require('express');
const router = express.Router();

const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendSystemNotification,
} = require('../controllers/notificationController');

const {
  notificationIdValidation,
  sendSystemNotificationValidation,
} = require('../validations/notificationValidation');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Notification Routes Require Authentication ────────────────────────
router.use(protect);

// ─── List & Stats ────────────────────────────────────────────────────────────
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);

// ─── Bulk Status Actions ──────────────────────────────────────────────────────
router.put('/read-all', markAllAsRead);
router.delete('/clear-all', clearAllNotifications);

// ─── Single Notification Actions ─────────────────────────────────────────────
router.put('/:id/read', notificationIdValidation, markAsRead);
router.delete('/:id', notificationIdValidation, deleteNotification);

// ─── Admin Send Notification Endpoint ───────────────────────────────────────
router.post('/send', restrictTo('admin'), sendSystemNotificationValidation, sendSystemNotification);

module.exports = router;
