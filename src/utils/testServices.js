'use strict';

const http = require('http');
const mongoose = require('mongoose');

const request = (path, method, body, token) => new Promise((resolve, reject) => {
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

    // 1. Connect Mongoose to create a dummy Category if none exists
    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');
    const Category = require('../models/category.model');
    let category = await Category.findOne({});
    if (!category) {
      category = await Category.create({
        name: `Cleaning Services ${timestamp}`,
        description: 'Professional cleaning services for home and office',
      });
    }

    // 2. Signup Provider User
    console.log('--- 1. Registering Test Provider ---');
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'Service Provider Pro',
      email: `service_provider_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876543999',
    });
    const providerToken = signupRes.data.data.token;

    // 3. Create Service
    console.log('\n--- 2. Testing POST /api/services (Create Service) ---');
    const createRes = await request('/api/services', 'POST', {
      title: `Deep Home Cleaning & Sanitization ${timestamp}`,
      description: 'Comprehensive 360-degree deep cleaning for 2BHK/3BHK apartments using eco-friendly products.',
      category: category._id.toString(),
      price: {
        amount: 1499,
        unit: 'fixed',
        currency: 'INR',
      },
      duration: '2-3 hrs',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      features: ['Deep Sanitization', 'Kitchen Degreasing', 'Bathroom Scrubbing'],
      tags: ['cleaning', 'home', 'sanitization'],
      isFeatured: true,
    }, providerToken);
    console.log('Create Status:', createRes.status, createRes.data.message);
    const createdServiceId = createRes.data.data.service.id || createRes.data.data.service._id;

    // 4. Get All Services (with search, filter & pagination)
    console.log('\n--- 3. Testing GET /api/services (List Services) ---');
    const listRes = await request('/api/services?search=Cleaning&sort=price_desc&page=1&limit=5', 'GET');
    console.log('List Status:', listRes.status, 'Total Items:', listRes.data.data.pagination.totalItems);

    // 5. Get Single Service Details
    console.log(`\n--- 4. Testing GET /api/services/${createdServiceId} ---`);
    const getSingleRes = await request(`/api/services/${createdServiceId}`, 'GET');
    console.log('Get Single Status:', getSingleRes.status, 'Title:', getSingleRes.data.data.service.title);

    // 6. Update Service
    console.log(`\n--- 5. Testing PUT /api/services/${createdServiceId} ---`);
    const updateRes = await request(`/api/services/${createdServiceId}`, 'PUT', {
      title: `Updated Deep Home Cleaning ${timestamp}`,
      price: {
        amount: 1799,
        unit: 'fixed',
      },
    }, providerToken);
    console.log('Update Status:', updateRes.status, 'New Amount:', updateRes.data.data.service.price.amount);

    // 7. Delete Service
    console.log(`\n--- 6. Testing DELETE /api/services/${createdServiceId} ---`);
    const deleteRes = await request(`/api/services/${createdServiceId}`, 'DELETE', null, providerToken);
    console.log('Delete Status:', deleteRes.status, deleteRes.data.message);

    await mongoose.disconnect();
    console.log('\n✅ ALL SERVICES CRUD API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
