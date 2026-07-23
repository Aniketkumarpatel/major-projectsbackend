'use strict';

const Notification = require('../models/notification.model');
const catchAsync = require('../utils/catchAsync');
const { sendRealtimeNotification } = require('../socket');

/**
 * Utility function to create a notification in database and emit real-time Socket.IO event
 * @param {Object} payload
 */
const createNotificationHelper = async ({
  recipient,
  sender = null,
  type = 'system',
  title,
  message,
  link = '',
  data = {},
  targetRole = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      link,
      data,
      isRead: false,
    });

    // Emit real-time WebSocket event to recipient user room or target role room
    sendRealtimeNotification(recipient, targetRole, notification);

    return notification;
  } catch (err) {
    console.error('Error creating notification:', err.message);
    return null;
  }
};

/**
 * @desc    Get All Notifications for Logged In User
 * @route   GET /api/notifications
 * @access  Private
 */
const getUserNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 15, isRead } = req.query;

  const filterQuery = { recipient: req.user._id };

  if (isRead !== undefined) {
    filterQuery.isRead = isRead === 'true' || isRead === true;
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const [totalItems, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(filterQuery),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    Notification.find(filterQuery)
      .populate('sender', 'name avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(itemsPerPage),
  ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications,
      unreadCount,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    },
  });
});

/**
 * @desc    Get Unread Notifications Count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    message: 'Unread notifications count retrieved',
    data: { unreadCount },
  });
});

/**
 * @desc    Mark Single Notification as Read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
      data: {},
    });
  }

  if (String(notification.recipient) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized access to this notification',
      data: {},
    });
  }

  notification.isRead = true;
  notification.readAt = Date.now();
  await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: { notification },
  });
});

/**
 * @desc    Mark All User Notifications as Read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read successfully',
    data: {},
  });
});

/**
 * @desc    Delete Single Notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
      data: {},
    });
  }

  if (String(notification.recipient) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized to delete this notification',
      data: {},
    });
  }

  await Notification.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
    data: {},
  });
});

/**
 * @desc    Clear All Notifications for Logged In User
 * @route   DELETE /api/notifications/clear-all
 * @access  Private
 */
const clearAllNotifications = catchAsync(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });

  res.status(200).json({
    success: true,
    message: 'All notifications cleared successfully',
    data: {},
  });
});

/**
 * @desc    Send System Notification (Admin)
 * @route   POST /api/notifications/send
 * @access  Private (Admin)
 */
const sendSystemNotification = catchAsync(async (req, res) => {
  const { recipient, title, message, type = 'system', link } = req.body;

  const notification = await createNotificationHelper({
    recipient,
    sender: req.user._id,
    type,
    title,
    message,
    link: link || '',
  });

  res.status(201).json({
    success: true,
    message: 'System notification sent successfully',
    data: { notification },
  });
});

module.exports = {
  createNotificationHelper,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendSystemNotification,
};
