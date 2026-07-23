'use strict';

const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const Notification = require('../models/notification.model');
const Provider = require('../models/provider.model');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get Customer Dashboard Aggregated Overview
 * @route   GET /api/customer/dashboard
 * @access  Private (Customer)
 */
const getCustomerDashboard = catchAsync(async (req, res) => {
  const customerId = req.user._id;

  // 1. Parallel Aggregations & Document Fetches
  const [
    totalBookings,
    upcomingCount,
    completedCount,
    cancelledCount,
    recentBookings,
    notifications,
    topProviders,
  ] = await Promise.all([
    Booking.countDocuments({ customer: customerId }),
    Booking.countDocuments({
      customer: customerId,
      status: { $in: ['pending', 'accepted', 'confirmed', 'in_progress'] },
    }),
    Booking.countDocuments({ customer: customerId, status: 'completed' }),
    Booking.countDocuments({ customer: customerId, status: 'cancelled' }),
    Booking.find({ customer: customerId })
      .populate('service', 'title price duration images')
      .populate({
        path: 'provider',
        select: 'businessName rating user',
        populate: { path: 'user', select: 'name email avatar' },
      })
      .sort({ createdAt: -1 })
      .limit(5),
    Notification.find({ recipient: customerId })
      .sort({ createdAt: -1 })
      .limit(5),
    Provider.find({ verificationStatus: 'approved' })
      .populate('user', 'name avatar')
      .sort({ rating: -1 })
      .limit(4),
  ]);

  // 2. Favourite Providers Placeholder
  const favouriteProviders = topProviders.map((p) => ({
    id: p._id,
    businessName: p.businessName || `${p.user?.name}'s Services`,
    rating: p.rating,
    avatar: p.user?.avatar || null,
    badge: p.badge || 'Verified',
  }));

  // 3. System Notification Fallbacks if none in DB
  const sanitizedNotifications = notifications.length > 0
    ? notifications
    : [
        {
          id: 'notif-1',
          title: 'Welcome to ServEase!',
          message: 'Explore our top-rated local services and book your first service in seconds.',
          isRead: false,
          createdAt: new Date(),
        },
      ];

  res.status(200).json({
    success: true,
    message: 'Customer dashboard data retrieved successfully',
    data: {
      stats: {
        totalBookings,
        upcomingBookings: upcomingCount,
        completedBookings: completedCount,
        cancelledBookings: cancelledCount,
      },
      recentBookings,
      favouriteProviders,
      notifications: sanitizedNotifications,
    },
  });
});

/**
 * @desc    Get Current Customer Profile
 * @route   GET /api/customer/profile
 * @access  Private (Customer)
 */
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Customer profile retrieved successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        address: user.address,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    },
  });
});

/**
 * @desc    Update Customer Profile
 * @route   PUT /api/customer/profile
 * @access  Private (Customer)
 */
const updateProfile = catchAsync(async (req, res) => {
  const { name, phone, avatar, address } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (phone) updateFields.phone = phone;
  if (avatar) updateFields.avatar = avatar;
  if (address) {
    updateFields.address = {
      ...req.user.address,
      ...address,
    };
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        address: updatedUser.address,
      },
    },
  });
});

/**
 * @desc    Get All Bookings for Customer
 * @route   GET /api/customer/bookings
 * @access  Private (Customer)
 */
const getCustomerBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filterQuery = { customer: req.user._id };
  if (status) filterQuery.status = status;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images category')
    .populate({
      path: 'provider',
      select: 'businessName rating user location',
      populate: { path: 'user', select: 'name email phone avatar' },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Bookings retrieved successfully',
    data: {
      bookings,
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
 * @desc    Get Upcoming Bookings for Customer
 * @route   GET /api/customer/upcoming-bookings
 * @access  Private (Customer)
 */
const getUpcomingBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const filterQuery = {
    customer: req.user._id,
    status: { $in: ['pending', 'accepted', 'confirmed', 'in_progress'] },
  };

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email phone avatar' },
    })
    .sort({ bookingDate: 1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Upcoming bookings retrieved successfully',
    data: {
      bookings,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
      },
    },
  });
});

/**
 * @desc    Get Completed Bookings for Customer
 * @route   GET /api/customer/completed-bookings
 * @access  Private (Customer)
 */
const getCompletedBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const filterQuery = {
    customer: req.user._id,
    status: 'completed',
  };

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email avatar' },
    })
    .sort({ completedAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Completed bookings retrieved successfully',
    data: {
      bookings,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
      },
    },
  });
});

/**
 * @desc    Get Cancelled Bookings for Customer
 * @route   GET /api/customer/cancelled-bookings
 * @access  Private (Customer)
 */
const getCancelledBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const filterQuery = {
    customer: req.user._id,
    status: 'cancelled',
  };

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email avatar' },
    })
    .sort({ cancelledAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Cancelled bookings retrieved successfully',
    data: {
      bookings,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
      },
    },
  });
});

/**
 * @desc    Get Customer Reviews
 * @route   GET /api/customer/reviews
 * @access  Private (Customer)
 */
const getCustomerReviews = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const filterQuery = { customer: req.user._id };

  const totalItems = await Review.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const reviews = await Review.find(filterQuery)
    .populate('service', 'title price images')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name avatar' },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Customer reviews retrieved successfully',
    data: {
      reviews,
      pagination: {
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
      },
    },
  });
});

/**
 * @desc    Get Customer Notifications
 * @route   GET /api/customer/notifications
 * @access  Private (Customer)
 */
const getCustomerNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.status(200).json({
    success: true,
    message: 'Customer notifications retrieved successfully',
    data: {
      notifications: notifications.length > 0 ? notifications : [
        {
          id: 'notif-1',
          title: 'Welcome to ServEase',
          message: 'Your account is active. Book home services anytime!',
          isRead: false,
          createdAt: new Date(),
        }
      ],
    },
  });
});

module.exports = {
  getCustomerDashboard,
  getProfile,
  updateProfile,
  getCustomerBookings,
  getUpcomingBookings,
  getCompletedBookings,
  getCancelledBookings,
  getCustomerReviews,
  getCustomerNotifications,
};
