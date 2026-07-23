'use strict';

const User = require('../models/user.model');
const Provider = require('../models/provider.model');
const Service = require('../models/service.model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Upload User Profile Image
 * @route   POST /api/upload/profile
 * @access  Private (Logged in Users)
 */
const uploadProfileImage = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please select an image file to upload',
      data: {},
    });
  }

  // 1. Fetch user to check for old avatar
  const user = await User.findById(req.user._id);

  // 2. Upload file to Cloudinary
  const uploadResult = await uploadToCloudinary(req.file, 'profiles');

  // 3. Delete previous custom avatar if exists
  if (user.avatar && !user.avatar.includes('ui-avatars.com') && !user.avatar.includes('gravatar.com')) {
    await deleteFromCloudinary(user.avatar);
  }

  // 4. Update User record in database
  user.avatar = uploadResult.url;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'User profile image uploaded successfully',
    data: {
      avatar: uploadResult.url,
      publicId: uploadResult.public_id,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
    },
  });
});

/**
 * @desc    Upload Provider Profile Image / Logo
 * @route   POST /api/upload/provider-image
 * @access  Private (Provider / Admin)
 */
const uploadProviderImage = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please select an image file to upload',
      data: {},
    });
  }

  // 1. Fetch Provider Profile
  let provider = await Provider.findOne({ user: req.user._id });
  if (!provider) {
    provider = await Provider.create({
      user: req.user._id,
      businessName: `${req.user.name}'s Services`,
    });
  }

  // 2. Upload file to Cloudinary
  const uploadResult = await uploadToCloudinary(req.file, 'providers');

  // 3. Update User avatar as well for consistency
  await User.findByIdAndUpdate(req.user._id, { avatar: uploadResult.url });

  res.status(200).json({
    success: true,
    message: 'Provider image uploaded successfully',
    data: {
      image: uploadResult.url,
      publicId: uploadResult.public_id,
    },
  });
});

/**
 * @desc    Upload Service Images (Multiple Files)
 * @route   POST /api/upload/service-images/:serviceId
 * @access  Private (Provider / Admin)
 */
const uploadServiceImagesHandler = catchAsync(async (req, res) => {
  const { serviceId } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one image file to upload',
      data: {},
    });
  }

  // 1. Verify Service exists & ownership
  const service = await Service.findById(serviceId);
  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found',
      data: {},
    });
  }

  if (req.user.role === 'provider') {
    const providerProfile = await Provider.findOne({ user: req.user._id });
    if (!providerProfile || String(service.provider) !== String(providerProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only upload images for your own services',
        data: {},
      });
    }
  }

  // 2. Upload all images in parallel
  const uploadPromises = req.files.map((file) => uploadToCloudinary(file, 'services'));
  const uploadResults = await Promise.all(uploadPromises);

  const newImageUrls = uploadResults.map((res) => res.url);

  // 3. Append new image URLs to Service.images array in MongoDB
  service.images = [...(service.images || []), ...newImageUrls];
  await service.save();

  res.status(200).json({
    success: true,
    message: `${uploadResults.length} service image(s) uploaded successfully`,
    data: {
      service,
      uploadedImages: uploadResults,
    },
  });
});

/**
 * @desc    Delete Image from Cloudinary & Update MongoDB Record
 * @route   DELETE /api/upload/image
 * @access  Private
 */
const deleteImage = catchAsync(async (req, res) => {
  const { imageUrl, serviceId } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: 'Image URL is required for deletion',
      data: {},
    });
  }

  // 1. Delete file from Cloudinary
  const deleted = await deleteFromCloudinary(imageUrl);

  // 2. If serviceId provided, remove image URL from Service.images array
  if (serviceId) {
    await Service.findByIdAndUpdate(serviceId, {
      $pull: { images: imageUrl },
    });
  }

  res.status(200).json({
    success: deleted,
    message: deleted ? 'Image deleted successfully' : 'Image deleted or file not found',
    data: {},
  });
});

module.exports = {
  uploadProfileImage,
  uploadProviderImage,
  uploadServiceImagesHandler,
  deleteImage,
};
