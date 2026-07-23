'use strict';

const Booking = require('../models/booking.model');
const Service = require('../models/service.model');
const Provider = require('../models/provider.model');
const { createNotificationHelper } = require('./notificationController');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

/**
 * Helper to check if logged in user is the Provider assigned to the booking
 */
const getProviderProfileForUser = async (userId) => {
  return await Provider.findOne({ user: userId });
};

/**
 * @desc    Create a new Booking
 * @route   POST /api/bookings
 * @access  Private (Customer / Logged in User)
 */
const createBooking = catchAsync(async (req, res) => {
  const { service: serviceId, bookingDate, timeSlot, address, notes } = req.body;

  // 1. Verify Service exists and is active
  const service = await Service.findById(serviceId).populate('provider');
  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
      data: {},
    });
  }

  if (!service.isActive) {
    return res.status(400).json({
      success: false,
      message: 'This service is currently unavailable for booking',
      data: {},
    });
  }

  // 2. Calculate Total Amount based on Service Price
  const totalAmount = service.price.amount;
  const providerDoc = service.provider;

  // 3. Create Booking Document
  const booking = await Booking.create({
    customer: req.user._id,
    provider: providerDoc._id || providerDoc,
    service: service._id,
    category: service.category,
    bookingDate: new Date(bookingDate),
    timeSlot,
    address,
    notes: notes || '',
    totalAmount,
    status: 'pending',
    paymentStatus: 'unpaid',
  });

  // 4. Send Notifications to Customer & Provider
  if (providerDoc.user) {
    await createNotificationHelper({
      recipient: providerDoc.user,
      sender: req.user._id,
      type: 'booking_new',
      title: 'New Service Booking Received! 📅',
      message: `${req.user.name} booked your service "${service.title}" for ${new Date(bookingDate).toLocaleDateString()}`,
      link: `/provider/bookings/${booking._id}`,
      data: { bookingId: booking._id },
    });
  }

  await createNotificationHelper({
    recipient: req.user._id,
    type: 'booking_status',
    title: 'Booking Request Submitted 🚀',
    message: `Your booking request for "${service.title}" has been submitted and is pending provider confirmation.`,
    link: `/customer/bookings/${booking._id}`,
    data: { bookingId: booking._id },
  });

  // 5. Populate created booking document
  const populatedBooking = await Booking.findById(booking._id)
    .populate('service', 'title price images duration location')
    .populate({
      path: 'provider',
      select: 'businessName rating hourlyRate user',
      populate: { path: 'user', select: 'name email phone avatar' },
    })
    .populate('customer', 'name email phone avatar');

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: {
      booking: populatedBooking,
    },
  });
});

/**
 * @desc    Get All Bookings (Role Aware)
 * @route   GET /api/bookings
 * @access  Private
 */
const getAllBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filterQuery = {};

  if (req.user.role === 'customer') {
    filterQuery.customer = req.user._id;
  } else if (req.user.role === 'provider') {
    const providerProfile = await getProviderProfileForUser(req.user._id);
    if (!providerProfile) {
      return res.status(200).json({
        success: true,
        message: 'No provider profile found',
        data: { bookings: [], pagination: { totalItems: 0, totalPages: 0, currentPage: 1, itemsPerPage: 10 } },
      });
    }
    filterQuery.provider = providerProfile._id;
  }

  if (status) {
    filterQuery.status = status;
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images category')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email phone avatar' },
    })
    .populate('customer', 'name email phone avatar')
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
 * @desc    Get Customer Specific Bookings
 * @route   GET /api/bookings/customer
 * @access  Private (Customer)
 */
const getCustomerBookings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filterQuery = { customer: req.user._id };
  if (status) filterQuery.status = status;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images')
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
    message: 'Customer bookings retrieved successfully',
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
 * @desc    Get Provider Specific Bookings
 * @route   GET /api/bookings/provider
 * @access  Private (Provider)
 */
const getProviderBookings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const providerProfile = await getProviderProfileForUser(req.user._id);
  if (!providerProfile) {
    return res.status(400).json({
      success: false,
      message: 'Provider profile not found',
      data: {},
    });
  }

  const filterQuery = { provider: providerProfile._id };
  if (status) filterQuery.status = status;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration images')
    .populate('customer', 'name email phone avatar address')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Provider bookings retrieved successfully',
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
 * @desc    Get Single Booking Details by ID or bookingNumber
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingById = catchAsync(async (req, res) => {
  const { id } = req.params;

  let filter = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    filter._id = id;
  } else {
    filter.bookingNumber = id;
  }

  const booking = await Booking.findOne(filter)
    .populate('service')
    .populate({
      path: 'provider',
      populate: { path: 'user', select: 'name email phone avatar' },
    })
    .populate('customer', 'name email phone avatar address');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: `Booking not found with ID '${id}'`,
      data: {},
    });
  }

  const isCustomer = String(booking.customer._id || booking.customer) === String(req.user._id);
  const isProviderOwner = booking.provider?.user
    ? String(booking.provider.user._id || booking.provider.user) === String(req.user._id)
    : false;
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isProviderOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized access to this booking',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Booking details retrieved successfully',
    data: {
      booking,
    },
  });
});

/**
 * @desc    Provider Accept Booking
 * @route   PUT /api/bookings/:id/accept
 * @access  Private (Provider / Admin)
 */
const acceptBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id).populate('service', 'title');
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  if (req.user.role === 'provider') {
    const providerProfile = await getProviderProfileForUser(req.user._id);
    if (!providerProfile || String(booking.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only accept bookings assigned to your profile',
        data: {},
      });
    }
  }

  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot accept booking with status '${booking.status}'`,
      data: {},
    });
  }

  booking.status = 'accepted';
  booking.acceptedAt = Date.now();
  booking.confirmedAt = Date.now();
  await booking.save();

  // Send Notification to Customer
  await createNotificationHelper({
    recipient: booking.customer,
    sender: req.user._id,
    type: 'booking_status',
    title: 'Booking Accepted! ✅',
    message: `Your booking for "${booking.service?.title || 'Service'}" has been accepted by the service provider.`,
    link: `/customer/bookings/${booking._id}`,
    data: { bookingId: booking._id, status: 'accepted' },
  });

  res.status(200).json({
    success: true,
    message: 'Booking accepted successfully',
    data: { booking },
  });
});

/**
 * @desc    Provider Reject Booking
 * @route   PUT /api/bookings/:id/reject
 * @access  Private (Provider / Admin)
 */
const rejectBooking = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findById(id).populate('service', 'title');
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  if (req.user.role === 'provider') {
    const providerProfile = await getProviderProfileForUser(req.user._id);
    if (!providerProfile || String(booking.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only reject bookings assigned to your profile',
        data: {},
      });
    }
  }

  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot reject booking with status '${booking.status}'`,
      data: {},
    });
  }

  booking.status = 'rejected';
  booking.rejectionReason = reason || 'Provider unavailable for selected slot';
  await booking.save();

  // Send Notification to Customer
  await createNotificationHelper({
    recipient: booking.customer,
    sender: req.user._id,
    type: 'booking_status',
    title: 'Booking Declined ❌',
    message: `Your booking request for "${booking.service?.title || 'Service'}" was declined by the provider. Reason: ${booking.rejectionReason}`,
    link: `/customer/bookings/${booking._id}`,
    data: { bookingId: booking._id, status: 'rejected' },
  });

  res.status(200).json({
    success: true,
    message: 'Booking rejected',
    data: { booking },
  });
});

/**
 * @desc    Provider Start Booking Service
 * @route   PUT /api/bookings/:id/start
 * @access  Private (Provider / Admin)
 */
const startBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id).populate('service', 'title');
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  if (req.user.role === 'provider') {
    const providerProfile = await getProviderProfileForUser(req.user._id);
    if (!providerProfile || String(booking.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to modify this booking',
        data: {},
      });
    }
  }

  if (!['accepted', 'confirmed', 'pending'].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot start booking in '${booking.status}' status`,
      data: {},
    });
  }

  booking.status = 'in_progress';
  booking.startedAt = Date.now();
  await booking.save();

  // Send Notification to Customer
  await createNotificationHelper({
    recipient: booking.customer,
    sender: req.user._id,
    type: 'booking_status',
    title: 'Service In Progress 🛠️',
    message: `The provider has started working on your service "${booking.service?.title || 'Service'}".`,
    link: `/customer/bookings/${booking._id}`,
    data: { bookingId: booking._id, status: 'in_progress' },
  });

  res.status(200).json({
    success: true,
    message: 'Service marked as in-progress',
    data: { booking },
  });
});

/**
 * @desc    Provider Complete Booking Service
 * @route   PUT /api/bookings/:id/complete
 * @access  Private (Provider / Admin)
 */
const completeBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id).populate('service', 'title');
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  if (req.user.role === 'provider') {
    const providerProfile = await getProviderProfileForUser(req.user._id);
    if (!providerProfile || String(booking.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to complete this booking',
        data: {},
      });
    }
  }

  if (!['in_progress', 'accepted', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot complete booking in '${booking.status}' status`,
      data: {},
    });
  }

  booking.status = 'completed';
  booking.completedAt = Date.now();
  booking.paymentStatus = 'paid';
  await booking.save();

  // Increment counters
  await Service.findByIdAndUpdate(booking.service, { $inc: { totalBookings: 1 } });
  await Provider.findByIdAndUpdate(booking.provider, { $inc: { completedJobs: 1 } });

  // Send Notification to Customer
  await createNotificationHelper({
    recipient: booking.customer,
    sender: req.user._id,
    type: 'booking_status',
    title: 'Service Completed! 🎉',
    message: `Your booking for "${booking.service?.title || 'Service'}" is marked as completed. Don't forget to leave a review!`,
    link: `/customer/bookings/${booking._id}`,
    data: { bookingId: booking._id, status: 'completed' },
  });

  res.status(200).json({
    success: true,
    message: 'Booking service marked as completed',
    data: { booking },
  });
});

/**
 * @desc    Cancel Booking (Customer or Provider or Admin)
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findById(id).populate('service', 'title');
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  const isCustomerOwner = String(booking.customer) === String(req.user._id);
  let isProviderOwner = false;
  let providerUserId = null;

  const providerProfile = await Provider.findById(booking.provider);
  if (providerProfile) {
    providerUserId = providerProfile.user;
    if (String(req.user._id) === String(providerProfile.user)) {
      isProviderOwner = true;
    }
  }

  const isAdmin = req.user.role === 'admin';

  if (!isCustomerOwner && !isProviderOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized to cancel this booking',
      data: {},
    });
  }

  if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel booking that is already '${booking.status}'`,
      data: {},
    });
  }

  booking.status = 'cancelled';
  booking.cancellationReason = reason || 'Cancelled by user';
  booking.cancelledBy = req.user._id;
  booking.cancelledAt = Date.now();
  await booking.save();

  // Send Notifications
  if (isCustomerOwner && providerUserId) {
    await createNotificationHelper({
      recipient: providerUserId,
      sender: req.user._id,
      type: 'booking_status',
      title: 'Booking Cancelled by Customer ⚠️',
      message: `Booking for "${booking.service?.title || 'Service'}" was cancelled by the customer.`,
      link: `/provider/bookings/${booking._id}`,
      data: { bookingId: booking._id, status: 'cancelled' },
    });
  } else if (isProviderOwner) {
    await createNotificationHelper({
      recipient: booking.customer,
      sender: req.user._id,
      type: 'booking_status',
      title: 'Booking Cancelled by Provider ⚠️',
      message: `Your booking for "${booking.service?.title || 'Service'}" was cancelled by the provider. Reason: ${booking.cancellationReason}`,
      link: `/customer/bookings/${booking._id}`,
      data: { bookingId: booking._id, status: 'cancelled' },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: { booking },
  });
});

/**
 * @desc    Update Booking details
 * @route   PUT /api/bookings/:id
 * @access  Private
 */
const updateBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  const updatedBooking = await Booking.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Booking updated successfully',
    data: { booking: updatedBooking },
  });
});

/**
 * @desc    Delete Booking
 * @route   DELETE /api/bookings/:id
 * @access  Private
 */
const deleteBooking = catchAsync(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  await Booking.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Booking deleted successfully',
    data: {},
  });
});

module.exports = {
  createBooking,
  getAllBookings,
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking,
  cancelBooking,
  updateBooking,
  deleteBooking,
};
