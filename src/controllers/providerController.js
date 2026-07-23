'use strict';

const Provider = require('../models/provider.model');
const Service = require('../models/service.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const User = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');

/**
 * Helper to ensure provider profile exists for logged in user
 */
const getOrCreateProviderProfile = async (userId, userName, userAddress) => {
  let profile = await Provider.findOne({ user: userId });
  if (!profile) {
    profile = await Provider.create({
      user: userId,
      businessName: `${userName}'s Services`,
      location: {
        city: userAddress?.city || 'Mumbai',
      },
    });
  }
  return profile;
};

/**
 * @desc    Get Provider Dashboard Aggregated Metrics
 * @route   GET /api/provider/dashboard
 * @access  Private (Provider)
 */
const getProviderDashboard = catchAsync(async (req, res) => {
  const providerProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
  const providerId = providerProfile._id;

  // 1. Parallel Count Queries & Aggregations
  const [
    totalServices,
    activeServices,
    totalBookings,
    pendingBookings,
    completedBookings,
    recentBookings,
    recentReviews,
    earningsResult,
  ] = await Promise.all([
    Service.countDocuments({ provider: providerId }),
    Service.countDocuments({ provider: providerId, isActive: true }),
    Booking.countDocuments({ provider: providerId }),
    Booking.countDocuments({ provider: providerId, status: 'pending' }),
    Booking.countDocuments({ provider: providerId, status: 'completed' }),
    Booking.find({ provider: providerId })
      .populate('service', 'title price images duration')
      .populate('customer', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .limit(5),
    Review.find({ provider: providerId })
      .populate('customer', 'name avatar')
      .populate('service', 'title')
      .sort({ createdAt: -1 })
      .limit(5),
    Booking.aggregate([
      { $match: { provider: providerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  // 2. Calculate Total Earnings
  const totalEarnings = earningsResult.length > 0 ? earningsResult[0].total : 0;

  // 3. Generate Last 6 Months Analytics Data
  const monthlyAnalytics = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const monthBookings = await Booking.countDocuments({
      provider: providerId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const monthRevenueAgg = await Booking.aggregate([
      {
        $match: {
          provider: providerId,
          status: 'completed',
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]);

    const revenue = monthRevenueAgg.length > 0 ? monthRevenueAgg[0].revenue : 0;

    monthlyAnalytics.push({
      month: monthLabel,
      bookings: monthBookings,
      revenue,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Provider dashboard data retrieved successfully',
    data: {
      stats: {
        totalServices,
        activeServices,
        totalBookings,
        pendingBookings,
        completedBookings,
        averageRating: providerProfile.rating || 0,
        numReviews: providerProfile.numReviews || 0,
        totalEarnings,
        availabilityStatus: providerProfile.availabilityStatus,
        verificationStatus: providerProfile.verificationStatus,
      },
      monthlyAnalytics,
      recentBookings,
      recentReviews,
    },
  });
});

/**
 * @desc    Get Current Provider Profile
 * @route   GET /api/provider/profile
 * @access  Private (Provider)
 */
const getProfile = catchAsync(async (req, res) => {
  const providerProfile = await Provider.findOne({ user: req.user._id })
    .populate('user', 'name email phone avatar address isEmailVerified createdAt')
    .populate('categories', 'name slug icon');

  if (!providerProfile) {
    const newProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
    return res.status(200).json({
      success: true,
      message: 'Provider profile initialized successfully',
      data: { provider: newProfile },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Provider profile retrieved successfully',
    data: {
      provider: providerProfile,
    },
  });
});

/**
 * @desc    Update Provider Profile
 * @route   PUT /api/provider/profile
 * @access  Private (Provider)
 */
const updateProfile = catchAsync(async (req, res) => {
  let providerProfile = await Provider.findOne({ user: req.user._id });
  if (!providerProfile) {
    providerProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
  }

  const {
    businessName,
    bio,
    experienceYears,
    hourlyRate,
    skills,
    categories,
    serviceAreas,
    location,
    availabilityStatus,
    operatingHours,
    name,
    phone,
  } = req.body;

  // Update User fields if name or phone provided
  if (name || phone) {
    await User.findByIdAndUpdate(req.user._id, {
      ...(name && { name }),
      ...(phone && { phone }),
    });
  }

  // Update Provider profile document
  const updateData = {};
  if (businessName !== undefined) updateData.businessName = businessName;
  if (bio !== undefined) updateData.bio = bio;
  if (experienceYears !== undefined) updateData.experienceYears = Number(experienceYears);
  if (hourlyRate !== undefined) updateData.hourlyRate = Number(hourlyRate);
  if (skills !== undefined) updateData.skills = skills;
  if (categories !== undefined) updateData.categories = categories;
  if (serviceAreas !== undefined) updateData.serviceAreas = serviceAreas;
  if (location !== undefined) updateData.location = { ...providerProfile.location, ...location };
  if (availabilityStatus !== undefined) updateData.availabilityStatus = availabilityStatus;
  if (operatingHours !== undefined) updateData.operatingHours = operatingHours;

  const updatedProfile = await Provider.findByIdAndUpdate(providerProfile._id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('user', 'name email phone avatar address')
    .populate('categories', 'name slug icon');

  res.status(200).json({
    success: true,
    message: 'Provider profile updated successfully',
    data: {
      provider: updatedProfile,
    },
  });
});

/**
 * @desc    Get All Services Offered by Logged In Provider
 * @route   GET /api/provider/services
 * @access  Private (Provider)
 */
const getProviderServices = catchAsync(async (req, res) => {
  const providerProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
  const { page = 1, limit = 10, isActive } = req.query;

  const filterQuery = { provider: providerProfile._id };
  if (isActive !== undefined) {
    filterQuery.isActive = isActive === 'true' || isActive === true;
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Service.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const services = await Service.find(filterQuery)
    .populate('category', 'name slug icon color')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Provider services retrieved successfully',
    data: {
      services,
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
 * @desc    Get All Bookings Assigned to Logged In Provider
 * @route   GET /api/provider/bookings
 * @access  Private (Provider)
 */
const getProviderBookings = catchAsync(async (req, res) => {
  const providerProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
  const { page = 1, limit = 10, status } = req.query;

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
 * @desc    Get All Reviews for Logged In Provider
 * @route   GET /api/provider/reviews
 * @access  Private (Provider)
 */
const getProviderReviews = catchAsync(async (req, res) => {
  const providerProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
  const { page = 1, limit = 10 } = req.query;

  const filterQuery = { provider: providerProfile._id };

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Review.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const reviews = await Review.find(filterQuery)
    .populate('customer', 'name avatar')
    .populate('service', 'title price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Provider reviews retrieved successfully',
    data: {
      reviews,
      summary: {
        averageRating: providerProfile.rating || 0,
        totalReviews: providerProfile.numReviews || totalItems,
      },
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
 * @desc    Get Provider Detailed Earnings & Payout Analytics
 * @route   GET /api/provider/earnings
 * @access  Private (Provider)
 */
const getProviderEarnings = catchAsync(async (req, res) => {
  const providerProfile = await getOrCreateProviderProfile(req.user._id, req.user.name, req.user.address);
  const providerId = providerProfile._id;

  // 1. Total Earnings from Completed Bookings
  const totalEarningsAgg = await Booking.aggregate([
    { $match: { provider: providerId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
  ]);

  // 2. Pending Payout from Accepted/In-Progress Bookings
  const pendingEarningsAgg = await Booking.aggregate([
    { $match: { provider: providerId, status: { $in: ['accepted', 'confirmed', 'in_progress'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
  ]);

  // 3. Completed Booking Transactions List
  const transactions = await Booking.find({ provider: providerId, status: 'completed' })
    .populate('customer', 'name email')
    .populate('service', 'title')
    .sort({ completedAt: -1, updatedAt: -1 })
    .limit(10);

  const totalEarnings = totalEarningsAgg.length > 0 ? totalEarningsAgg[0].total : 0;
  const completedJobsCount = totalEarningsAgg.length > 0 ? totalEarningsAgg[0].count : 0;
  const pendingEarnings = pendingEarningsAgg.length > 0 ? pendingEarningsAgg[0].total : 0;

  res.status(200).json({
    success: true,
    message: 'Provider earnings report retrieved successfully',
    data: {
      earningsSummary: {
        totalEarnings,
        completedJobsCount,
        pendingEarnings,
        currency: 'INR',
      },
      recentTransactions: transactions.map((t) => ({
        id: t._id,
        bookingNumber: t.bookingNumber,
        serviceTitle: t.service?.title || 'Service',
        customerName: t.customer?.name || 'Customer',
        amount: t.totalAmount,
        status: t.paymentStatus || 'paid',
        date: t.completedAt || t.updatedAt,
      })),
    },
  });
});

module.exports = {
  getProviderDashboard,
  getProfile,
  updateProfile,
  getProviderServices,
  getProviderBookings,
  getProviderReviews,
  getProviderEarnings,
};
