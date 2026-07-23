'use strict';

const mongoose = require('mongoose');

const BOOKING_STATUSES = [
  'pending',
  'accepted',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
];

const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'failed'];

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Provider is required'],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    bookingDate: {
      type: Date,
      required: [true, 'Booking date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    status: {
      type: String,
      enum: {
        values: BOOKING_STATUSES,
        message: '{VALUE} is not a valid booking status',
      },
      default: 'pending',
    },
    address: {
      line1: { type: String, required: [true, 'Address line 1 is required'] },
      line2: String,
      city: { type: String, required: [true, 'City is required'] },
      state: String,
      pincode: { type: String, required: [true, 'Pincode is required'] },
      instructions: String,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE} is not a valid payment status',
      },
      default: 'unpaid',
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    cancellationReason: String,
    rejectionReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acceptedAt: Date,
    confirmedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save Hook: Generate Booking Number if not present ───────────────────
bookingSchema.pre('save', function (next) {
  if (!this.bookingNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.bookingNumber = `BK-${randomDigits}`;
  }
  next();
});

// ── Indexes ──────────────────────────────────────────────────────────────────
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ bookingDate: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
