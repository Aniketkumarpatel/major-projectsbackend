'use strict';

const User = require('../models/user.model');
const Provider = require('../models/provider.model');
const Service = require('../models/service.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const Category = require('../models/category.model');
const Payment = require('../models/payment.model');
const Contact = require('../models/contact.model');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

/**
 * @desc    Get Admin Dashboard Overview & Analytics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
const getAdminDashboard = catchAsync(async (req, res) => {
  // 1. Aggregations & Document Counts
  const [
    totalUsers,
    totalProviders,
    pendingProviders,
    totalServices,
    totalBookings,
    completedBookings,
    totalReviews,
    totalCategories,
    revenueResult,
    recentUsers,
    recentBookings,
    recentReviews,
  ] = await Promise.all([
    User.countDocuments(),
    Provider.countDocuments(),
    Provider.countDocuments({ verificationStatus: 'pending' }),
    Service.countDocuments(),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'completed' }),
    Review.countDocuments(),
    Category.countDocuments(),
    Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    User.find().select('name email role avatar createdAt').sort({ createdAt: -1 }).limit(5),
    Booking.find()
      .populate('customer', 'name email')
      .populate('service', 'title price')
      .sort({ createdAt: -1 })
      .limit(5),
    Review.find()
      .populate('customer', 'name avatar')
      .populate('service', 'title')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  // 2. Generate 6 Months Growth Analytics
  const monthlyStats = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [newUsers, monthBookings, monthRevenueAgg] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const revenue = monthRevenueAgg.length > 0 ? monthRevenueAgg[0].revenue : 0;

    monthlyStats.push({
      month: monthLabel,
      users: newUsers,
      bookings: monthBookings,
      revenue,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Admin dashboard metrics retrieved successfully',
    data: {
      stats: {
        totalUsers,
        totalProviders,
        pendingProviders,
        totalServices,
        totalBookings,
        completedBookings,
        totalReviews,
        totalCategories,
        totalRevenue,
        currency: 'INR',
      },
      recentActivity: {
        users: recentUsers,
        bookings: recentBookings,
        reviews: recentReviews,
      },
      monthlyStats,
    },
  });
});

/**
 * @desc    Get All Users (Manage Users)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, role, search, isActive } = req.query;

  const filterQuery = {};
  if (role) filterQuery.role = role;
  if (isActive !== undefined) filterQuery.isActive = isActive === 'true' || isActive === true;

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    filterQuery.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await User.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const users = await User.find(filterQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Users list retrieved successfully',
    data: {
      users,
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
 * @desc    Toggle User Active Status
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin)
 */
const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      data: {},
    });
  }

  user.isActive = isActive !== undefined ? isActive : !user.isActive;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { user },
  });
});

/**
 * @desc    Delete User
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      data: {},
    });
  }

  // If user is provider, delete provider profile as well
  if (user.role === 'provider') {
    await Provider.findOneAndDelete({ user: id });
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'User account deleted successfully',
    data: {},
  });
});

/**
 * @desc    Get All Providers (Manage Providers)
 * @route   GET /api/admin/providers
 * @access  Private (Admin)
 */
const getProviders = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, verificationStatus, search } = req.query;

  const filterQuery = {};
  if (verificationStatus) filterQuery.verificationStatus = verificationStatus;

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    filterQuery.businessName = regex;
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Provider.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const providers = await Provider.find(filterQuery)
    .populate('user', 'name email phone avatar isActive address')
    .populate('categories', 'name slug icon')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Providers list retrieved successfully',
    data: {
      providers,
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
 * @desc    Approve/Reject Provider Verification
 * @route   PUT /api/admin/providers/:id/verify
 * @access  Private (Admin)
 */
const verifyProvider = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { verificationStatus, badge } = req.body;

  const provider = await Provider.findById(id);
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: 'Provider profile not found',
      data: {},
    });
  }

  provider.verificationStatus = verificationStatus;
  if (badge) provider.badge = badge;
  if (verificationStatus === 'approved') provider.badge = badge || 'Verified';

  await provider.save();

  const updatedProvider = await Provider.findById(id).populate('user', 'name email');

  res.status(200).json({
    success: true,
    message: `Provider verification status updated to '${verificationStatus}'`,
    data: { provider: updatedProvider },
  });
});

/**
 * @desc    Get All Services (Manage Services)
 * @route   GET /api/admin/services
 * @access  Private (Admin)
 */
const getServices = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, search, category, isActive } = req.query;

  const filterQuery = {};
  if (category) filterQuery.category = category;
  if (isActive !== undefined) filterQuery.isActive = isActive === 'true' || isActive === true;

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    filterQuery.$or = [{ title: regex }, { description: regex }];
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Service.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const services = await Service.find(filterQuery)
    .populate('category', 'name slug icon')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email' },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Services list retrieved successfully',
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
 * @desc    Toggle Service Active / Featured Status
 * @route   PUT /api/admin/services/:id/status
 * @access  Private (Admin)
 */
const updateServiceStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive, isFeatured } = req.body;

  const service = await Service.findById(id);
  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
      data: {},
    });
  }

  if (isActive !== undefined) service.isActive = isActive;
  if (isFeatured !== undefined) service.isFeatured = isFeatured;

  await service.save();

  res.status(200).json({
    success: true,
    message: 'Service status updated successfully',
    data: { service },
  });
});

/**
 * @desc    Delete Service (Admin)
 * @route   DELETE /api/admin/services/:id
 * @access  Private (Admin)
 */
const deleteService = catchAsync(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
      data: {},
    });
  }

  await Service.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Service deleted successfully',
    data: {},
  });
});

/**
 * @desc    Get All Categories (Manage Categories)
 * @route   GET /api/admin/categories
 * @access  Private (Admin)
 */
const getCategories = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Category.countDocuments();
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const categories = await Category.find()
    .sort({ sortOrder: 1, name: 1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Categories list retrieved successfully',
    data: {
      categories,
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
 * @desc    Create Category
 * @route   POST /api/admin/categories
 * @access  Private (Admin)
 */
const createCategory = catchAsync(async (req, res) => {
  const { name, description, icon, image, color, sortOrder } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists',
      data: {},
    });
  }

  const category = await Category.create({
    name,
    description,
    icon: icon || '🔧',
    image: image || null,
    color: color || 'from-blue-500 to-cyan-400',
    sortOrder: sortOrder || 0,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { category },
  });
});

/**
 * @desc    Update Category
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin)
 */
const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: { category },
  });
});

/**
 * @desc    Delete Category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin)
 */
const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    data: {},
  });
});

/**
 * @desc    Get All Bookings (Manage Bookings)
 * @route   GET /api/admin/bookings
 * @access  Private (Admin)
 */
const getBookings = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filterQuery = {};
  if (status) filterQuery.status = status;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Booking.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const bookings = await Booking.find(filterQuery)
    .populate('service', 'title price duration')
    .populate('customer', 'name email phone avatar')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email phone' },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Bookings list retrieved successfully',
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
 * @desc    Get All Reviews (Manage Reviews)
 * @route   GET /api/admin/reviews
 * @access  Private (Admin)
 */
const getReviews = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Review.countDocuments();
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const reviews = await Review.find()
    .populate('customer', 'name email avatar')
    .populate('service', 'title price')
    .populate({
      path: 'provider',
      select: 'businessName user',
      populate: { path: 'user', select: 'name' },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Reviews list retrieved successfully',
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
 * @desc    Delete Inappropriate Review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private (Admin)
 */
const deleteReview = catchAsync(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found',
      data: {},
    });
  }

  await Review.findOneAndDelete({ _id: id });

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
    data: {},
  });
});

/**
 * @desc    Get All Payment Transactions
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
const getPayments = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const completedBookings = await Booking.find({ status: 'completed' })
    .populate('customer', 'name email')
    .populate('service', 'title price')
    .sort({ completedAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  const totalItems = await Booking.countDocuments({ status: 'completed' });
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Payments transactions retrieved successfully',
    data: {
      payments: completedBookings.map((b) => ({
        id: b._id,
        bookingNumber: b.bookingNumber,
        customerName: b.customer?.name || 'Customer',
        serviceTitle: b.service?.title || 'Service',
        amount: b.totalAmount,
        currency: 'INR',
        paymentStatus: b.paymentStatus || 'paid',
        date: b.completedAt || b.updatedAt,
      })),
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
 * @desc    Get All Contact Inquiries
 * @route   GET /api/admin/contacts
 * @access  Private (Admin)
 */
const getContacts = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filterQuery = {};
  if (status) filterQuery.status = status;

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Contact.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const contacts = await Contact.find(filterQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Contact inquiries retrieved successfully',
    data: {
      contacts,
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
 * @desc    Reply / Update Contact Message Status
 * @route   PUT /api/admin/contacts/:id/reply
 * @access  Private (Admin)
 */
const replyContact = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { replyMessage, status } = req.body;

  const contact = await Contact.findById(id);
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact message not found',
      data: {},
    });
  }

  contact.status = status || 'resolved';
  if (replyMessage) {
    contact.reply = {
      message: replyMessage,
      repliedBy: req.user._id,
      repliedAt: Date.now(),
    };
  }

  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Contact inquiry updated successfully',
    data: { contact },
  });
});

module.exports = {
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
};
