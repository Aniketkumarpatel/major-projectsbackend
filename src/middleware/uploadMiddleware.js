'use strict';

const multer = require('multer');

// ── Multer Memory Storage Configuration ──────────────────────────────────────
const storage = multer.memoryStorage();

// ── Image MIME Type Filter ───────────────────────────────────────────────────
const imageFileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP image formats are allowed!'),
      false
    );
  }
};

// ── Multer Upload Instance ───────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

/**
 * Upload User Profile Image (Single File: 'avatar')
 */
const uploadUserProfileImage = upload.single('avatar');

/**
 * Upload Provider Profile Image (Single File: 'image' or 'avatar')
 */
const uploadProviderProfileImage = upload.single('image');

/**
 * Upload Service Images (Multiple Files: 'images', max 5)
 */
const uploadServiceImages = upload.array('images', 5);

/**
 * Middleware Wrapper to catch Multer errors gracefully
 */
const handleUploadError = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size limit exceeded. Maximum allowed file size is 5MB.',
          data: {},
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field or exceeded maximum number of files (Max: 5).',
          data: {},
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload Error: ${err.message}`,
        data: {},
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        data: {},
      });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadUserProfileImage: handleUploadError(uploadUserProfileImage),
  uploadProviderProfileImage: handleUploadError(uploadProviderProfileImage),
  uploadServiceImages: handleUploadError(uploadServiceImages),
};
