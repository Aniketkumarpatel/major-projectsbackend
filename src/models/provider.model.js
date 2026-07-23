'use strict';

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: ['id_proof', 'address_proof', 'qualification', 'business_license', 'other'],
    },
    documentUrl: {
      type: String,
      required: [true, 'Document URL is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: String,
  },
  { _id: true, timestamps: true }
);

const operatingHourSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true },
  },
  { _id: false }
);

const providerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for provider profile'],
      unique: true,
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: [150, 'Business name cannot exceed 150 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    serviceAreas: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      city: { type: String, required: [true, 'City is required'] },
      state: String,
      pincode: String,
      address: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
      },
    },
    documents: [documentSchema],
    verificationStatus: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'suspended'],
        message: '{VALUE} is not a valid verification status',
      },
      default: 'pending',
    },
    availabilityStatus: {
      type: String,
      enum: {
        values: ['available', 'busy', 'offline'],
        message: '{VALUE} is not a valid availability status',
      },
      default: 'available',
    },
    operatingHours: [operatingHourSchema],
    badge: {
      type: String,
      enum: ['Top Rated', 'Verified', 'Certified', 'Pro', 'New'],
      default: 'New',
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
    completedJobs: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Note: user index is automatically created due to `unique: true`
providerSchema.index({ verificationStatus: 1 });
providerSchema.index({ availabilityStatus: 1 });
providerSchema.index({ categories: 1 });
providerSchema.index({ rating: -1 });
providerSchema.index({ 'location.coordinates': '2dsphere' });

const Provider = mongoose.model('Provider', providerSchema);

module.exports = Provider;
