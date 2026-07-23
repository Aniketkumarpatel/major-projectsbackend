'use strict';

const mongoose = require('mongoose');

const FAQ_CATEGORIES = [
  'General',
  'Customer & Booking',
  'Provider & Account',
  'Payments & Refunds',
  'Safety & Trust',
  'Technical Support',
];

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      minlength: [5, 'Question must be at least 5 characters'],
      maxlength: [300, 'Question cannot exceed 300 characters'],
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      minlength: [10, 'Answer must be at least 10 characters'],
      maxlength: [3000, 'Answer cannot exceed 3000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: FAQ_CATEGORIES,
        message: '{VALUE} is not a valid FAQ category',
      },
      default: 'General',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
faqSchema.index({ category: 1, sortOrder: 1 });
faqSchema.index({ isActive: 1 });

const Faq = mongoose.model('Faq', faqSchema);

module.exports = Faq;
