'use strict';

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ── Cloudinary SDK Configuration ──────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Extract Cloudinary Public ID from an image URL
 * @param {string} url - Cloudinary URL or local file URL
 * @returns {string|null} - Public ID or file basename
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    if (url.includes('res.cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;

      // Remove version prefix e.g. v123456789/
      const pathWithVersion = parts[1];
      const withoutVersion = pathWithVersion.replace(/^v\d+\//, '');

      // Remove file extension
      const publicId = withoutVersion.substring(0, withoutVersion.lastIndexOf('.'));
      return publicId;
    }

    // If local relative or absolute URL e.g. /uploads/profiles/123.jpg
    const basename = path.basename(url, path.extname(url));
    return basename;
  } catch (err) {
    console.error('Error extracting public_id:', err.message);
    return null;
  }
};

/**
 * Upload Image Buffer or File Path to Cloudinary (with local fallback)
 * @param {Object} file - Express Multer file object
 * @param {string} folder - Target folder ('profiles', 'providers', 'services')
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadToCloudinary = async (file, folder = 'general') => {
  return new Promise((resolve, reject) => {
    const isRealCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      !process.env.CLOUDINARY_API_SECRET.includes('super_secret');

    if (isRealCloudinary) {
      // Stream upload to Cloudinary API
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `serv_ease/${folder}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
          transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );

      if (file.buffer) {
        uploadStream.end(file.buffer);
      } else if (file.path) {
        fs.createReadStream(file.path).pipe(uploadStream);
      } else {
        reject(new Error('Invalid file format for upload'));
      }
    } else {
      // Local Disk Storage Fallback
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = path.extname(file.originalname || '.jpg') || '.jpg';
        const filename = `${folder}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
        const targetPath = path.join(uploadDir, filename);

        if (file.buffer) {
          fs.writeFileSync(targetPath, file.buffer);
        } else if (file.path) {
          fs.copyFileSync(file.path, targetPath);
        }

        const localUrl = `/uploads/${folder}/${filename}`;
        resolve({
          url: localUrl,
          public_id: `local_${folder}_${filename}`,
        });
      } catch (err) {
        reject(err);
      }
    }
  });
};

/**
 * Delete Image from Cloudinary by Public ID or Image URL
 * @param {string} publicIdOrUrl - Cloudinary Public ID or Image URL
 * @returns {Promise<boolean>}
 */
const deleteFromCloudinary = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return false;

  try {
    const isRealCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      !process.env.CLOUDINARY_API_SECRET.includes('super_secret');

    const publicId = publicIdOrUrl.includes('/')
      ? extractPublicId(publicIdOrUrl)
      : publicIdOrUrl;

    if (!publicId) return false;

    if (isRealCloudinary && !publicId.startsWith('local_')) {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } else {
      // Local fallback file deletion
      if (publicIdOrUrl.startsWith('/uploads/')) {
        const relativePath = publicIdOrUrl.replace('/uploads/', '');
        const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          return true;
        }
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to delete image from Cloudinary:', err.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  extractPublicId,
  uploadToCloudinary,
  deleteFromCloudinary,
};
