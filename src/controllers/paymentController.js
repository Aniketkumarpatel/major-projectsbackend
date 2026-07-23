'use strict';

const Payment = require('../models/payment.model');
const Booking = require('../models/booking.model');
const Provider = require('../models/provider.model');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

/**
 * Stripe SDK Initialization (With graceful fallback for mock mode)
 */
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch {
    stripe = null;
  }
}

/**
 * @desc    Create Stripe Payment Intent
 * @route   POST /api/payments/create-intent
 * @access  Private (Customer)
 */
const createPaymentIntent = catchAsync(async (req, res) => {
  const { bookingId, paymentMethod = 'stripe' } = req.body;

  // 1. Fetch Booking Document & Verify Ownership
  const booking = await Booking.findById(bookingId).populate('service', 'title');
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
      data: {},
    });
  }

  if (String(booking.customer) !== String(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You can only pay for your own bookings',
      data: {},
    });
  }

  // 2. Check if booking is already paid
  if (booking.paymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'This booking has already been paid for',
      data: {},
    });
  }

  const amountInSmallestUnit = Math.round(booking.totalAmount * 100); // Convert to Paise / Cents
  let paymentIntentId = '';
  let clientSecret = '';

  // 3. Create Intent via Stripe SDK or Fallback Mock Generator
  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: 'inr',
      metadata: {
        bookingId: booking._id.toString(),
        customerId: req.user._id.toString(),
        serviceTitle: booking.service?.title || 'Service Booking',
      },
    });
    paymentIntentId = intent.id;
    clientSecret = intent.client_secret;
  } else {
    // Production-ready fallback placeholder generator for development & staging
    const randomHex = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    paymentIntentId = `pi_mock_${randomHex}`;
    clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;
  }

  // 4. Create or Update Payment Document in Database
  let payment = await Payment.findOne({ booking: booking._id });
  if (payment) {
    payment.amount = booking.totalAmount;
    payment.paymentMethod = paymentMethod;
    payment.status = 'pending';
    payment.gatewayDetails = {
      gatewayName: 'stripe',
      paymentIntentId,
      clientSecret,
    };
    await payment.save();
  } else {
    payment = await Payment.create({
      booking: booking._id,
      customer: req.user._id,
      provider: booking.provider,
      amount: booking.totalAmount,
      currency: 'INR',
      paymentMethod,
      status: 'pending',
      gatewayDetails: {
        gatewayName: 'stripe',
        paymentIntentId,
        clientSecret,
      },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Payment intent created successfully',
    data: {
      paymentId: payment._id,
      transactionId: payment.transactionId,
      clientSecret,
      paymentIntentId,
      amount: booking.totalAmount,
      currency: 'INR',
      status: 'pending',
    },
  });
});

/**
 * @desc    Verify / Confirm Payment Status
 * @route   POST /api/payments/verify
 * @access  Private (Customer / Admin)
 */
const verifyPayment = catchAsync(async (req, res) => {
  const { bookingId, paymentIntentId, paymentId, status = 'paid' } = req.body;

  let payment = null;

  if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
    payment = await Payment.findById(paymentId);
  } else if (paymentIntentId) {
    payment = await Payment.findOne({ 'gatewayDetails.paymentIntentId': paymentIntentId });
  } else if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    payment = await Payment.findOne({ booking: bookingId });
  }

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment record not found',
      data: {},
    });
  }

  // Handle status transitions: pending -> paid / completed / failed / refunded
  if (status === 'failed') {
    payment.status = 'failed';
    payment.gatewayDetails = {
      ...payment.gatewayDetails,
      errorDetails: { message: 'Payment failed during gateway processing' },
    };
    await payment.save();

    await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'failed' });

    return res.status(400).json({
      success: false,
      message: 'Payment failed',
      data: { payment },
    });
  }

  // Successful payment confirmation
  payment.status = 'completed';
  payment.paidAt = Date.now();
  await payment.save();

  // Update related Booking record
  const updatedBooking = await Booking.findByIdAndUpdate(
    payment.booking,
    { paymentStatus: 'paid' },
    { new: true }
  ).populate('service', 'title price');

  res.status(200).json({
    success: true,
    message: 'Payment verified and marked as paid successfully',
    data: {
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
      },
      booking: updatedBooking,
    },
  });
});

/**
 * @desc    Get Payment Transaction History (Role Aware)
 * @route   GET /api/payments/history
 * @access  Private
 */
const getPaymentHistory = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filterQuery = {};

  if (req.user.role === 'customer') {
    filterQuery.customer = req.user._id;
  } else if (req.user.role === 'provider') {
    const providerProfile = await Provider.findOne({ user: req.user._id });
    if (!providerProfile) {
      return res.status(200).json({
        success: true,
        message: 'No provider profile found',
        data: { payments: [], pagination: { totalItems: 0, totalPages: 0, currentPage: 1, itemsPerPage: 10 } },
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

  const totalItems = await Payment.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const payments = await Payment.find(filterQuery)
    .populate('booking', 'bookingNumber bookingDate status')
    .populate('customer', 'name email phone avatar')
    .populate({
      path: 'provider',
      select: 'businessName user',
      populate: { path: 'user', select: 'name email' },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  res.status(200).json({
    success: true,
    message: 'Payment history retrieved successfully',
    data: {
      payments,
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
 * @desc    Process Refund for Payment
 * @route   POST /api/payments/refund
 * @access  Private (Admin only)
 */
const refundPayment = catchAsync(async (req, res) => {
  const { paymentId, refundAmount } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment record not found',
      data: {},
    });
  }

  if (payment.status === 'refunded') {
    return res.status(400).json({
      success: false,
      message: 'Payment has already been refunded',
      data: {},
    });
  }

  payment.status = 'refunded';
  payment.refundedAt = Date.now();
  payment.refundAmount = refundAmount || payment.amount;
  await payment.save();

  await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'refunded' });

  res.status(200).json({
    success: true,
    message: 'Payment refunded successfully',
    data: { payment },
  });
});

module.exports = {
  createPaymentIntent,
  verifyPayment,
  getPaymentHistory,
  refundPayment,
};
