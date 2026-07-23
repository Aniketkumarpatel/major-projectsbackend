'use strict';

const express = require('express');
const router = express.Router();

const {
  uploadProfileImage,
  uploadProviderImage,
  uploadServiceImagesHandler,
  deleteImage,
} = require('../controllers/uploadController');

const {
  uploadUserProfileImage,
  uploadProviderProfileImage,
  uploadServiceImages,
} = require('../middleware/uploadMiddleware');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// ─── All Upload Routes Require Authentication ────────────────────────────────
router.use(protect);

// ─── User Profile Image Upload ───────────────────────────────────────────────
router.post('/profile', uploadUserProfileImage, uploadProfileImage);

// ─── Provider Profile Image Upload ───────────────────────────────────────────
router.post(
  '/provider-image',
  restrictTo('provider', 'admin'),
  uploadProviderProfileImage,
  uploadProviderImage
);

// ─── Service Images Upload (Multiple) ────────────────────────────────────────
router.post(
  '/service-images/:serviceId',
  restrictTo('provider', 'admin'),
  uploadServiceImages,
  uploadServiceImagesHandler
);

// ─── Delete Image ────────────────────────────────────────────────────────────
router.delete('/image', deleteImage);

module.exports = router;
