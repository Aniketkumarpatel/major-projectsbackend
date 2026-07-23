'use strict';

const mongoose = require('mongoose');

const SUBJECT_TYPES = [
  'Booking Issue',
  'Provider Complaint',
  'Refund Request',
  'Partnership Inquiry',
  'General Feedback',
  'Other',
];

const CONTACT_STATUSES = ['new', 'in_progress', 'resolved', 'closed'];

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      enum: {
        values: SUBJECT_TYPES,
        message: '{VALUE} is not a valid subject',
      },
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: CONTACT_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'new',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminNotes: String,
    reply: {
      message: String,
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      repliedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
