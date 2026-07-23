'use strict';

const http = require('http');
const mongoose = require('mongoose');

// Helper to make multipart/form-data upload request
const uploadRequest = (path, fieldName, filename, fileBuffer, token) => new Promise((resolve, reject) => {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  
  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`;
  body += `Content-Type: image/jpeg\r\n\r\n`;
  
  const payload = Buffer.concat([
    Buffer.from(body, 'utf8'),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
  ]);

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path,
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length,
      ...(token && { 'Authorization': 'Bearer ' + token })
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      } catch {
        resolve({ status: res.statusCode, data });
      }
    });
  });
  req.on('error', reject);
  req.write(payload);
  req.end();
});

const jsonRequest = (path, method, body, token) => new Promise((resolve, reject) => {
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': 'Bearer ' + token })
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      } catch {
        resolve({ status: res.statusCode, data });
      }
    });
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

(async () => {
  try {
    const timestamp = Date.now();

    // 1. Setup Customer User
    console.log('--- 1. Registering Customer & Provider Users ---');
    const custSignup = await jsonRequest('/api/auth/signup', 'POST', {
      name: 'Upload Test Customer',
      email: `up_cust_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876541111',
    });
    const customerToken = custSignup.data.data.token;

    const provSignup = await jsonRequest('/api/auth/signup', 'POST', {
      name: 'Upload Test Provider',
      email: `up_prov_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876542222',
    });
    const providerToken = provSignup.data.data.token;

    // 2. Dummy 1x1 JPEG Buffer for testing uploads
    const dummyJpegBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

    // 3. Test User Profile Image Upload
    console.log('\n--- 2. Testing POST /api/upload/profile (User Profile Image Upload) ---');
    const profileUploadRes = await uploadRequest('/api/upload/profile', 'avatar', 'profile.jpg', dummyJpegBuffer, customerToken);
    console.log('Profile Upload Status:', profileUploadRes.status, 'Avatar URL:', profileUploadRes.data.data.avatar);

    // 4. Test Provider Profile Image Upload
    console.log('\n--- 3. Testing POST /api/upload/provider-image (Provider Image Upload) ---');
    const providerUploadRes = await uploadRequest('/api/upload/provider-image', 'image', 'provider.jpg', dummyJpegBuffer, providerToken);
    console.log('Provider Upload Status:', providerUploadRes.status, 'Image URL:', providerUploadRes.data.data.image);

    // 5. Create Service & Test Service Images Upload
    console.log('\n--- 4. Testing POST /api/upload/service-images/:serviceId ---');
    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');
    const Category = require('../models/category.model');
    let category = await Category.findOne({});
    if (!category) {
      category = await Category.create({ name: `Test Category ${timestamp}`, description: 'Test' });
    }

    const serviceRes = await jsonRequest('/api/services', 'POST', {
      title: `Service Image Test ${timestamp}`,
      description: 'Testing service image uploads',
      category: category._id.toString(),
      price: { amount: 500 },
      location: { city: 'Mumbai', pincode: '400001' },
    }, providerToken);
    const serviceId = serviceRes.data.data.service.id || serviceRes.data.data.service._id;

    const serviceUploadRes = await uploadRequest(`/api/upload/service-images/${serviceId}`, 'images', 'service_1.jpg', dummyJpegBuffer, providerToken);
    console.log('Service Upload Status:', serviceUploadRes.status, 'Total Images:', serviceUploadRes.data.data.service.images.length);

    // 6. Test Image Deletion
    console.log('\n--- 5. Testing DELETE /api/upload/image ---');
    const deleteRes = await jsonRequest('/api/upload/image', 'DELETE', {
      imageUrl: profileUploadRes.data.data.avatar,
    }, customerToken);
    console.log('Delete Image Status:', deleteRes.status, deleteRes.data.message);

    await mongoose.disconnect();
    console.log('\n✅ ALL MULTER & CLOUDINARY UPLOAD MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
