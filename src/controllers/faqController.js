'use strict';

const Faq = require('../models/faq.model');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get All FAQs (Grouped/Filtered by Category)
 * @route   GET /api/faqs
 * @access  Public
 */
const getAllFaqs = catchAsync(async (req, res) => {
  const { category, search, page = 1, limit = 50 } = req.query;

  const filterQuery = {};
  
  // Non-admin users only see active FAQs
  if (!req.user || req.user.role !== 'admin') {
    filterQuery.isActive = true;
  }

  if (category) {
    filterQuery.category = category;
  }

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    filterQuery.$or = [{ question: regex }, { answer: regex }];
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Faq.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const faqs = await Faq.find(filterQuery)
    .sort({ sortOrder: 1, category: 1, createdAt: -1 })
    .skip(skip)
    .limit(itemsPerPage);

  // Group FAQs by category for UI conveninece
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const cat = faq.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    message: 'FAQs retrieved successfully',
    data: {
      faqs,
      groupedFaqs,
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
 * @desc    Get Single FAQ Details by ID
 * @route   GET /api/faqs/:id
 * @access  Public
 */
const getFaqById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const faq = await Faq.findById(id);
  if (!faq) {
    return res.status(404).json({
      success: false,
      message: 'FAQ not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'FAQ details retrieved successfully',
    data: { faq },
  });
});

/**
 * @desc    Create New FAQ
 * @route   POST /api/faqs
 * @access  Private (Admin only)
 */
const createFaq = catchAsync(async (req, res) => {
  const { question, answer, category, sortOrder, isActive } = req.body;

  const faq = await Faq.create({
    question,
    answer,
    category: category || 'General',
    sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'FAQ created successfully',
    data: { faq },
  });
});

/**
 * @desc    Update Existing FAQ
 * @route   PUT /api/faqs/:id
 * @access  Private (Admin only)
 */
const updateFaq = catchAsync(async (req, res) => {
  const { id } = req.params;

  const faq = await Faq.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!faq) {
    return res.status(404).json({
      success: false,
      message: 'FAQ not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'FAQ updated successfully',
    data: { faq },
  });
});

/**
 * @desc    Delete FAQ
 * @route   DELETE /api/faqs/:id
 * @access  Private (Admin only)
 */
const deleteFaq = catchAsync(async (req, res) => {
  const { id } = req.params;

  const faq = await Faq.findByIdAndDelete(id);
  if (!faq) {
    return res.status(404).json({
      success: false,
      message: 'FAQ not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'FAQ deleted successfully',
    data: {},
  });
});

module.exports = {
  getAllFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
};
