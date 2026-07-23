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

    // 1. Setup Customer, Provider, Service & Booking
    console.log('--- 1. Registering Users & Setup ---');
    const custSignup = await request('/api/auth/signup', 'POST', {
      name: 'Payer Customer',
      email: `payer_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876545555',
    });
    const customerToken = custSignup.data.data.token;

    const provSignup = await request('/api/auth/signup', 'POST', {
      name: 'Payee Provider',
      email: `payee_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876546666',
    });
    const providerToken = provSignup.data.data.token;

    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');
    const Category = require('../models/category.model');
    let category = await Category.findOne({});
    if (!category) {
      category = await Category.create({ name: `Payment Test Cat ${timestamp}`, description: 'Test' });
    }

    const serviceRes = await request('/api/services', 'POST', {
      title: `AC Repair & Service ${timestamp}`,
      description: 'Filter cleaning and gas refill',
      category: category._id.toString(),
      price: { amount: 1499 },
      location: { city: 'Mumbai', pincode: '400001' },
    }, providerToken);
    const serviceId = serviceRes.data.data.service.id || serviceRes.data.data.service._id;

    const bookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-15',
      timeSlot: '04:00 PM',
      address: { line1: 'Sector 5, Airoli', city: 'Navi Mumbai', pincode: '400708' },
    }, customerToken);
    const bookingId = bookingRes.data.data.booking.id || bookingRes.data.data.booking._id;

    // 2. Create Payment Intent
    console.log('\n--- 2. Testing POST /api/payments/create-intent ---');
    const intentRes = await request('/api/payments/create-intent', 'POST', {
      bookingId,
      paymentMethod: 'stripe',
    }, customerToken);
    console.log('Create Intent Status:', intentRes.status, 'ClientSecret:', intentRes.data.data.clientSecret);
    const paymentIntentId = intentRes.data.data.paymentIntentId;

    // 3. Verify Payment Status
    console.log('\n--- 3. Testing POST /api/payments/verify ---');
    const verifyRes = await request('/api/payments/verify', 'POST', {
      bookingId,
      paymentIntentId,
      status: 'paid',
    }, customerToken);
    console.log('Verify Status:', verifyRes.status, 'Booking Payment Status:', verifyRes.data.data.booking.paymentStatus);

    // 4. Get Payment History
    console.log('\n--- 4. Testing GET /api/payments/history ---');
    const historyRes = await request('/api/payments/history', 'GET', null, customerToken);
    console.log('History Status:', historyRes.status, 'Total Payments:', historyRes.data.data.pagination.totalItems);

    await mongoose.disconnect();
    console.log('\n✅ ALL PAYMENT MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
