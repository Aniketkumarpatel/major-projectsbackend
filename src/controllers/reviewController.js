'use strict';

const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const Provider = require('../models/provider.model');
const Service = require('../models/service.model');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');
const { createNotificationHelper } = require('./notificationController');

/**
 * @desc    Create a new Review for a Completed Booking
 * @route   POST /api/reviews
 * @access  Private (Customer only)
 */
const createReview = catchAsync(async (req, res) => {
  const { booking: bookingId, rating, comment } = req.body;

  // 1. Fetch Booking Document
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  // 2. Ownership Verification: Only the customer who created the booking can review
  if (String(booking.customer) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only submit a review for your own bookings',
      data: {},
    });
  }

  // 3. Status Verification: Booking MUST be in 'completed' status
  if (booking.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: `Reviews can only be submitted for completed bookings. Current status is '${booking.status}'.`,
      data: {},
    });
  }

  // 4. Duplicate Check: Ensure one review per booking
  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'A review has already been submitted for this booking',
      data: { existingReviewId: existingReview._id },
    });
  }

  // 5. Create Review Document (Post-save hook recalculates Service & Provider avg ratings)
  const review = await Review.create({
    booking: booking._id,
    service: booking.service,
    provider: booking.provider,
    customer: req.user._id,
    rating: Number(rating),
    comment,
    isVerified: true,
  });

  const populatedReview = await Review.findById(review._id)
    .populate('customer', 'name email avatar')
    .populate('service', 'title price images')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email avatar' },
    });

  // Notify Provider & Admin about new review
  const providerDoc = await Provider.findById(booking.provider);
  if (providerDoc) {
    await createNotificationHelper({
      recipient: providerDoc.user,
      sender: req.user._id,
      type: 'new_review',
      title: '⭐ New Customer Review Received',
      message: `${req.user.name} rated your service ${rating} stars: "${comment.substring(0, 60)}..."`,
      link: '/provider',
      data: { reviewId: review._id, rating },
    });
  }

  await createNotificationHelper({
    targetRole: 'admin',
    sender: req.user._id,
    type: 'new_review',
    title: '⭐ New Review Submitted',
    message: `${req.user.name} left a ${rating}-star review on service booking.`,
    link: '/admin',
    data: { reviewId: review._id },
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: {
      review: populatedReview,
    },
  });
});

/**
 * @desc    Get All Reviews with Filtering & Pagination
 * @route   GET /api/reviews
 * @access  Public
 */
const getAllReviews = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    service,
    provider,
    customer,
    rating,
    sort,
  } = req.query;

  const filterQuery = {};

  if (service && mongoose.Types.ObjectId.isValid(service)) {
    filterQuery.service = service;
  }

  if (provider && mongoose.Types.ObjectId.isValid(provider)) {
    filterQuery.provider = provider;
  }

  if (customer && mongoose.Types.ObjectId.isValid(customer)) {
    filterQuery.customer = customer;
  }

  if (rating) {
    filterQuery.rating = Number(rating);
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sort === 'highest_rating' || sort === 'rating_desc') {
    sortOption = { rating: -1, createdAt: -1 };
  } else if (sort === 'lowest_rating' || sort === 'rating_asc') {
    sortOption = { rating: 1, createdAt: -1 };
  } else if (sort === 'oldest') {
    sortOption = { createdAt: 1 };
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Review.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const reviews = await Review.find(filterQuery)
    .populate('customer', 'name avatar')
    .populate('service', 'title price')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name avatar' },
    })
    .sort(sortOption)
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Reviews retrieved successfully',
    data: {
      reviews,
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
 * @desc    Get All Reviews for a Specific Provider
 * @route   GET /api/providers/:providerId/reviews
 * @route   GET /api/reviews/provider/:providerId
 * @access  Public
 */
const getProviderReviews = catchAsync(async (req, res) => {
  const { providerId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  let targetProviderId = providerId;

  // Check if providerId is a User ID instead of Provider document ID
  const providerByDoc = await Provider.findById(providerId);
  if (!providerByDoc) {
    const providerByUser = await Provider.findOne({ user: providerId });
    if (providerByUser) {
      targetProviderId = providerByUser._id;
    }
  }

  const filterQuery = { provider: targetProviderId };

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

  // Summary ratings stats for provider
  const providerDoc = await Provider.findById(targetProviderId);

  res.status(200).json({
    success: true,
    message: 'Provider reviews retrieved successfully',
    data: {
      reviews,
      summary: {
        averageRating: providerDoc?.rating || 0,
        totalReviews: providerDoc?.numReviews || totalItems,
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
 * @desc    Get All Reviews for a Specific Service
 * @route   GET /api/services/:serviceId/reviews
 * @route   GET /api/reviews/service/:serviceId
 * @access  Public
 */
const getServiceReviews = catchAsync(async (req, res) => {
  const { serviceId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const filterQuery = { service: serviceId };

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Review.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const reviews = await Review.find(filterQuery)
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  const serviceDoc = await Service.findById(serviceId);

  res.status(200).json({
    success: true,
    message: 'Service reviews retrieved successfully',
    data: {
      reviews,
      summary: {
        averageRating: serviceDoc?.rating || 0,
        totalReviews: serviceDoc?.numReviews || totalItems,
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
 * @desc    Get Single Review Details
 * @route   GET /api/reviews/:id
 * @access  Public
 */
const getReviewById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id)
    .populate('customer', 'name email avatar')
    .populate('service', 'title price images')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email avatar' },
    });

  if (!review) {
    return res.status(404).json({
      success: false,
      message: `Review not found with ID '${id}'`,
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Review details retrieved successfully',
    data: { review },
  });
});

/**
 * @desc    Update Existing Review
 * @route   PUT /api/reviews/:id
 * @access  Private (Customer [owner] only)
 */
const updateReview = catchAsync(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: `Review not found with ID '${id}'`,
      data: {},
    });
  }

  // Ownership Check: Customer can only update their own review
  if (String(review.customer) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only update your own reviews',
      data: {},
    });
  }

  if (req.body.rating !== undefined) review.rating = Number(req.body.rating);
  if (req.body.comment !== undefined) review.comment = req.body.comment;

  // Saving triggers post-save rating recalculation hook
  await review.save();

  const updatedReview = await Review.findById(id)
    .populate('customer', 'name avatar')
    .populate('service', 'title');

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: { review: updatedReview },
  });
});

/**
 * @desc    Delete Review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Customer [owner] / Admin only)
 */
const deleteReview = catchAsync(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: `Review not found with ID '${id}'`,
      data: {},
    });
  }

  // Ownership Check
  const isOwner = String(review.customer) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only delete your own reviews',
      data: {},
    });
  }

  // findOneAndDelete triggers post-delete rating recalculation hook
  await Review.findOneAndDelete({ _id: id });

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
    data: {},
  });
});

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  getProviderReviews,
  getServiceReviews,
  updateReview,
  deleteReview,
};
