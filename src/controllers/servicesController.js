'use strict';

const Service = require('../models/service.model');
const Category = require('../models/category.model');
const Provider = require('../models/provider.model');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80';

/**
 * @desc    Get all services with Filtering, Searching, Sorting & Pagination
 * @route   GET /api/services
 * @access  Public
 */
const getAllServices = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    q,
    category,
    provider,
    city,
    isFeatured,
    isActive,
    sort,
    minPrice,
    maxPrice,
  } = req.query;

  // 1. Build Filter Query Object
  const filterQuery = {};

  // Active status filter (default to active services unless explicitly specified)
  if (isActive !== undefined) {
    filterQuery.isActive = isActive === 'true' || isActive === true;
  } else {
    filterQuery.isActive = true;
  }

  // Featured filter
  if (isFeatured !== undefined) {
    filterQuery.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  // Search filter (by title, description, or tags using Regex)
  const searchKeyword = search || q;
  if (searchKeyword && searchKeyword.trim() !== '') {
    const regex = new RegExp(searchKeyword.trim(), 'i');
    filterQuery.$or = [
      { title: regex },
      { description: regex },
      { tags: regex },
    ];
  }

  // Category filter (supports ObjectId or Category Slug)
  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filterQuery.category = category;
    } else {
      const categoryDoc = await Category.findOne({ slug: category.toLowerCase() });
      if (categoryDoc) {
        filterQuery.category = categoryDoc._id;
      } else {
        // If category slug not found, return empty results early
        return res.status(200).json({
          success: true,
          message: 'Services retrieved successfully',
          data: {
            services: [],
            pagination: {
              totalItems: 0,
              totalPages: 0,
              currentPage: Number(page),
              itemsPerPage: Number(limit),
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
        });
      }
    }
  }

  // Provider filter
  if (provider && mongoose.Types.ObjectId.isValid(provider)) {
    filterQuery.provider = provider;
  }

  // City filter
  if (city) {
    filterQuery['location.city'] = new RegExp(city.trim(), 'i');
  }

  // Price Range filter
  if (minPrice || maxPrice) {
    filterQuery['price.amount'] = {};
    if (minPrice) filterQuery['price.amount'].$gte = Number(minPrice);
    if (maxPrice) filterQuery['price.amount'].$lte = Number(maxPrice);
  }

  // 2. Build Sorting Options
  let sortOption = { createdAt: -1 }; // Default sort by newest

  if (sort) {
    switch (sort) {
      case 'price_asc':
      case 'price':
        sortOption = { 'price.amount': 1 };
        break;
      case 'price_desc':
      case '-price':
        sortOption = { 'price.amount': -1 };
        break;
      case 'rating_desc':
      case 'rating':
      case '-rating':
        sortOption = { rating: -1 };
        break;
      case 'rating_asc':
        sortOption = { rating: 1 };
        break;
      case 'popular':
        sortOption = { totalBookings: -1, rating: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  }

  // 3. Pagination calculation
  const currentPage = Math.max(1, parseInt(page, 10));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (currentPage - 1) * itemsPerPage;

  // 4. Database Query
  const totalItems = await Service.countDocuments(filterQuery);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const services = await Service.find(filterQuery)
    .populate('category', 'name slug icon color')
    .populate({
      path: 'provider',
      select: 'businessName rating numReviews hourlyRate location user verificationStatus badge avatar',
      populate: {
        path: 'user',
        select: 'name email avatar phone',
      },
    })
    .sort(sortOption)
    .skip(skip)
    .limit(itemsPerPage);

  // Ensure image placeholders for any service without images
  const sanitizedServices = services.map((service) => {
    const s = service.toObject();
    if (!s.images || s.images.length === 0 || !s.images[0]) {
      s.images = [DEFAULT_SERVICE_IMAGE];
    }
    return s;
  });

  res.status(200).json({
    success: true,
    message: 'Services retrieved successfully',
    data: {
      services: sanitizedServices,
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
 * @desc    Get single service by ID or Slug
 * @route   GET /api/services/:id
 * @access  Public
 */
const getServiceById = catchAsync(async (req, res) => {
  const { id } = req.params;

  let queryFilter = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    queryFilter._id = id;
  } else {
    queryFilter.slug = id.toLowerCase();
  }

  const service = await Service.findOne(queryFilter)
    .populate('category', 'name slug icon image color description')
    .populate({
      path: 'provider',
      select: 'businessName bio experienceYears hourlyRate rating numReviews completedJobs location verificationStatus badge skills user',
      populate: {
        path: 'user',
        select: 'name email avatar phone address',
      },
    });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: `Service not found with identifier '${id}'`,
      data: {},
    });
  }

  const serviceData = service.toObject();
  if (!serviceData.images || serviceData.images.length === 0 || !serviceData.images[0]) {
    serviceData.images = [DEFAULT_SERVICE_IMAGE];
  }

  res.status(200).json({
    success: true,
    message: 'Service details retrieved successfully',
    data: {
      service: serviceData,
    },
  });
});

/**
 * @desc    Create a new Service
 * @route   POST /api/services
 * @access  Private (Provider / Admin only)
 */
const createService = catchAsync(async (req, res) => {
  let providerId = null;

  // 1. If requester is a provider, get their Provider record ID
  if (req.user.role === 'provider') {
    const providerProfile = await Provider.findOne({ user: req.user._id });
    if (!providerProfile) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile not found. Please complete your provider setup first.',
        data: {},
      });
    }
    providerId = providerProfile._id;
  } else if (req.user.role === 'admin') {
    // Admin can specify provider ID in request body or fallback
    providerId = req.body.provider;
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Admin must specify a valid provider ID when creating a service.',
        data: {},
      });
    }
  }

  // 2. Extract service payload
  const {
    title,
    description,
    category,
    price,
    duration,
    images,
    features,
    includedServices,
    excludedServices,
    location,
    tags,
    isFeatured,
  } = req.body;

  // 3. Verify category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return res.status(404).json({
      success: false,
      message: 'Specified category does not exist',
      data: {},
    });
  }

  // 4. Construct service document
  const service = await Service.create({
    title,
    description,
    category,
    provider: providerId,
    price: {
      amount: price.amount,
      unit: price.unit || 'fixed',
      currency: price.currency || 'INR',
    },
    duration: duration || '1-2 hrs',
    images: images && images.length > 0 ? images : [DEFAULT_SERVICE_IMAGE],
    features: features || [],
    includedServices: includedServices || [],
    excludedServices: excludedServices || [],
    location: location || { city: req.user.address?.city || 'Mumbai' },
    tags: tags || [],
    isFeatured: isFeatured || false,
    isActive: true,
  });

  const populatedService = await Service.findById(service._id)
    .populate('category', 'name slug icon')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email' },
    });

  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    data: {
      service: populatedService,
    },
  });
});

/**
 * @desc    Update existing Service
 * @route   PUT /api/services/:id
 * @access  Private (Provider [owner] / Admin only)
 */
const updateService = catchAsync(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);

  if (!service) {
    return res.status(404).json({
      success: false,
      message: `Service not found with ID '${id}'`,
      data: {},
    });
  }

  // Check Ownership: if role is provider, check if provider profile owns this service
  if (req.user.role === 'provider') {
    const providerProfile = await Provider.findOne({ user: req.user._id });
    if (!providerProfile || String(service.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only update your own services',
        data: {},
      });
    }
  }

  // Update Service Document
  const updatedService = await Service.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('category', 'name slug icon')
    .populate({
      path: 'provider',
      select: 'businessName rating user',
      populate: { path: 'user', select: 'name email' },
    });

  res.status(200).json({
    success: true,
    message: 'Service updated successfully',
    data: {
      service: updatedService,
    },
  });
});

/**
 * @desc    Delete Service
 * @route   DELETE /api/services/:id
 * @access  Private (Provider [owner] / Admin only)
 */
const deleteService = catchAsync(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);

  if (!service) {
    return res.status(404).json({
      success: false,
      message: `Service not found with ID '${id}'`,
      data: {},
    });
  }

  // Check Ownership: provider can only delete their own service
  if (req.user.role === 'provider') {
    const providerProfile = await Provider.findOne({ user: req.user._id });
    if (!providerProfile || String(service.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only delete your own services',
        data: {},
      });
    }
  }

  await Service.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Service deleted successfully',
    data: {},
  });
});

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
