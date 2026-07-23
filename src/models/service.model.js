'use strict';

const mongoose = require('mongoose');

const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80';

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Service category is required'],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Service provider reference is required'],
    },
    price: {
      amount: {
        type: Number,
        required: [true, 'Price amount is required'],
        min: [0, 'Price cannot be negative'],
      },
      unit: {
        type: String,
        enum: {
          values: ['fixed', 'per_hour', 'per_day', 'quote'],
          message: '{VALUE} is not a valid price unit',
        },
        default: 'fixed',
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },
    duration: {
      type: String,
      default: '1-2 hrs',
    },
    images: {
      type: [String],
      default: [DEFAULT_SERVICE_IMAGE],
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    includedServices: [
      {
        type: String,
        trim: true,
      },
    ],
    excludedServices: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      city: { type: String, required: [true, 'City is required'] },
      state: String,
      pincode: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: Primary Image Fallback ──────────────────────────────────────────
serviceSchema.virtual('primaryImage').get(function () {
  if (this.images && this.images.length > 0 && this.images[0]) {
    return this.images[0];
  }
  return DEFAULT_SERVICE_IMAGE;
});

// ── Pre-save Hook: Ensure images array is not empty & generate slug ───────────
serviceSchema.pre('save', function (next) {
  if (!this.images || this.images.length === 0) {
    this.images = [DEFAULT_SERVICE_IMAGE];
  }

  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// ── Indexes for Search & Sorting ────────────────────────────────────────────
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ 'price.amount': 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ isFeatured: 1 });
serviceSchema.index({ 'location.coordinates': '2dsphere' });
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
