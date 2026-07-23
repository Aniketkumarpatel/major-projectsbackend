'use strict';

const Contact = require('../models/contact.model');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Submit a new Contact / Support Inquiry
 * @route   POST /api/contact
 * @access  Public
 */
const createContact = catchAsync(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const contact = await Contact.create({
    name,
    email,
    phone: phone || '',
    subject,
    message,
    status: 'new',
  });

  res.status(201).json({
    success: true,
    message: 'Your inquiry has been submitted successfully. Our support team will get back to you shortly.',
    data: {
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt,
      },
    },
  });
});

/**
 * @desc    Get All Contact Inquiries (Admin)
 * @route   GET /api/contact
 * @access  Private (Admin)
 */
const getAllContacts = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, subject, search } = req.query;

  const filterQuery = {};
  if (status) filterQuery.status = status;
  if (subject) filterQuery.subject = subject;

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    filterQuery.$or = [{ name: regex }, { email: regex }, { message: regex }];
  }

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
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    },
  });
});

/**
 * @desc    Get Single Contact Details (Admin)
 * @route   GET /api/contact/:id
 * @access  Private (Admin)
 */
const getContactById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const contact = await Contact.findById(id);
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact inquiry not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Contact inquiry details retrieved successfully',
    data: { contact },
  });
});

/**
 * @desc    Update Contact Inquiry Status / Add Reply (Admin)
 * @route   PUT /api/contact/:id
 * @access  Private (Admin)
 */
const updateContactStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes, replyMessage } = req.body;

  const contact = await Contact.findById(id);
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact inquiry not found',
      data: {},
    });
  }

  if (status) contact.status = status;
  if (adminNotes !== undefined) contact.adminNotes = adminNotes;
  if (replyMessage) {
    contact.reply = {
      message: replyMessage,
      repliedBy: req.user._id,
      repliedAt: Date.now(),
    };
    contact.status = 'resolved';
  }

  await contact.save();

  res.status(200).json({
    success: true,
    message: 'Contact inquiry updated successfully',
    data: { contact },
  });
});

/**
 * @desc    Delete Contact Inquiry (Admin)
 * @route   DELETE /api/contact/:id
 * @access  Private (Admin)
 */
const deleteContact = catchAsync(async (req, res) => {
  const { id } = req.params;

  const contact = await Contact.findByIdAndDelete(id);
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact inquiry not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Contact inquiry deleted successfully',
    data: {},
  });
});

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};
