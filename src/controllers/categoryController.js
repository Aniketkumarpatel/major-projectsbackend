'use strict';

const Category = require('../models/category.model');
const Service = require('../models/service.model');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

/**
 * @desc    Get All Categories
 * @route   GET /api/categories
 * @access  Public
 */
const getAllCategories = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, search, isActive } = req.query;

  const filterQuery = {};
  if (isActive !== undefined) {
    filterQuery.isActive = isActive === 'true' || isActive === true;
  } else {
    filterQuery.isActive = true;
  }

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    filterQuery.$or = [{ name: regex }, { description: regex }];
  }

  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  const totalItems = await Category.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const categories = await Category.find(filterQuery)
    .sort({ sortOrder: 1, name: 1 })
    .skip(skip)
    .limit(itemsPerPage);

  // Attach real-time active services count per category
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const servicesCount = await Service.countDocuments({ category: cat._id, isActive: true });
      const catObj = cat.toObject();
      catObj.servicesCount = servicesCount;
      return catObj;
    })
  );

  res.status(200).json({
    success: true,
    message: 'Categories retrieved successfully',
    data: {
      categories: categoriesWithCount,
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
 * @desc    Get Single Category by ID or Slug
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = catchAsync(async (req, res) => {
  const { id } = req.params;

  let filter = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    filter._id = id;
  } else {
    filter.slug = id.toLowerCase();
  }

  const category = await Category.findOne(filter);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category not found with identifier '${id}'`,
      data: {},
    });
  }

  const servicesCount = await Service.countDocuments({ category: category._id, isActive: true });
  const categoryData = category.toObject();
  categoryData.servicesCount = servicesCount;

  res.status(200).json({
    success: true,
    message: 'Category details retrieved successfully',
    data: { category: categoryData },
  });
});

/**
 * @desc    Create Category
 * @route   POST /api/categories
 * @access  Private (Admin)
 */
const createCategory = catchAsync(async (req, res) => {
  const { name, description, icon, image, color, sortOrder } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Category with this name already exists',
      data: {},
    });
  }

  const category = await Category.create({
    name,
    description: description || '',
    icon: icon || '🔧',
    image: image || null,
    color: color || 'from-blue-500 to-cyan-400',
    sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { category },
  });
});

/**
 * @desc    Update Category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin)
 */
const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: { category },
  });
});

/**
 * @desc    Delete Category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin)
 */
const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
      data: {},
    });
  }

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    data: {},
  });
});

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
