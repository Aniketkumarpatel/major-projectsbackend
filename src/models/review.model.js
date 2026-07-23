'use strict';

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      unique: true, // One review per booking
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required'],
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
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    reply: {
      text: { type: String, trim: true, maxlength: [500, 'Reply cannot exceed 500 characters'] },
      createdAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Note: booking index is automatically created due to `unique: true`
reviewSchema.index({ service: 1, rating: -1 });
reviewSchema.index({ provider: 1, rating: -1 });
reviewSchema.index({ customer: 1 });

// ── Static Method: Calculate & Update Average Rating for Service & Provider ───
reviewSchema.statics.calcAverageRating = async function (serviceId, providerId) {
  // Service average rating calculation
  if (serviceId) {
    const serviceStats = await this.aggregate([
      { $match: { service: serviceId } },
      { $group: { _id: '$service', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const Service = require('./service.model');
    if (serviceStats.length > 0) {
      await Service.findByIdAndUpdate(serviceId, {
        rating: Math.round(serviceStats[0].avgRating * 10) / 10,
        numReviews: serviceStats[0].count,
      });
    } else {
      await Service.findByIdAndUpdate(serviceId, { rating: 0, numReviews: 0 });
    }
  }

  // Provider average rating calculation
  if (providerId) {
    const providerStats = await this.aggregate([
      { $match: { provider: providerId } },
      { $group: { _id: '$provider', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const Provider = require('./provider.model');
    if (providerStats.length > 0) {
      await Provider.findByIdAndUpdate(providerId, {
        rating: Math.round(providerStats[0].avgRating * 10) / 10,
        numReviews: providerStats[0].count,
      });
    } else {
      await Provider.findByIdAndUpdate(providerId, { rating: 0, numReviews: 0 });
    }
  }
};

// ── Hooks: Trigger calculation after save & delete ───────────────────────────
reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.service, this.provider);
});

reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) doc.constructor.calcAverageRating(doc.service, doc.provider);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
