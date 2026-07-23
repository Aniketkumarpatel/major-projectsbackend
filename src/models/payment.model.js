'use strict';

const mongoose = require('mongoose');

const PAYMENT_METHODS = ['stripe', 'card', 'upi', 'netbanking', 'wallet', 'cash'];
const PAYMENT_STATUSES = ['pending', 'paid', 'completed', 'failed', 'refunded'];

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Provider reference is required'],
    },
    transactionId: {
      type: String,
      unique: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
      default: 'stripe',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
    },
    gatewayDetails: {
      gatewayName: { type: String, default: 'stripe' },
      paymentIntentId: String,
      clientSecret: String,
      paymentId: String,
      orderId: String,
      signature: String,
      errorDetails: mongoose.Schema.Types.Mixed,
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save Hook: Generate unique transaction ID if not provided ───────────
paymentSchema.pre('save', function (next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.transactionId = `TXN-${timestamp}-${randomStr}`;
  }
  next();
});

// ── Indexes ──────────────────────────────────────────────────────────────────
paymentSchema.index({ customer: 1, status: 1 });
paymentSchema.index({ provider: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
