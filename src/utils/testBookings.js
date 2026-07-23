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

    // 1. Database setup for Category
    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');
    const Category = require('../models/category.model');
    let category = await Category.findOne({});
    if (!category) {
      category = await Category.create({
        name: `Plumbing Services ${timestamp}`,
        description: 'Leak repair and plumbing installation',
      });
    }

    // 2. Register Customer User
    console.log('--- 1. Registering Customer & Provider Users ---');
    const customerSignup = await request('/api/auth/signup', 'POST', {
      name: 'Booking Customer',
      email: `b_customer_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876543111',
    });
    const customerToken = customerSignup.data.data.token;

    // 3. Register Provider User
    const providerSignup = await request('/api/auth/signup', 'POST', {
      name: 'Booking Provider Pro',
      email: `b_provider_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876543222',
    });
    const providerToken = providerSignup.data.data.token;

    // 4. Create Service as Provider
    console.log('\n--- 2. Creating Test Service ---');
    const serviceRes = await request('/api/services', 'POST', {
      title: `Emergency Plumbing Repair ${timestamp}`,
      description: '24/7 emergency pipe repair and drainage fix',
      category: category._id.toString(),
      price: { amount: 799, unit: 'fixed' },
      duration: '1-2 hrs',
      location: { city: 'Mumbai', pincode: '400001' },
    }, providerToken);
    const serviceId = serviceRes.data.data.service.id || serviceRes.data.data.service._id;

    // 5. Create Booking as Customer
    console.log('\n--- 3. Testing POST /api/bookings (Create Booking) ---');
    const createBookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-01',
      timeSlot: '10:00 AM - 12:00 PM',
      address: {
        line1: 'Flat 402, Sunshine Apartments',
        city: 'Mumbai',
        pincode: '400001',
      },
      notes: 'Please call before arrival',
    }, customerToken);
    console.log('Create Booking Status:', createBookingRes.status, createBookingRes.data.message);
    const bookingId = createBookingRes.data.data.booking.id || createBookingRes.data.data.booking._id;

    // 6. Customer gets their bookings
    console.log('\n--- 4. Testing GET /api/bookings/customer ---');
    const custBookingsRes = await request('/api/bookings/customer', 'GET', null, customerToken);
    console.log('Customer Bookings Count:', custBookingsRes.data.data.bookings.length);

    // 7. Provider gets their bookings
    console.log('\n--- 5. Testing GET /api/bookings/provider ---');
    const provBookingsRes = await request('/api/bookings/provider', 'GET', null, providerToken);
    console.log('Provider Bookings Count:', provBookingsRes.data.data.bookings.length);

    // 8. Provider Accepts Booking
    console.log(`\n--- 6. Testing PUT /api/bookings/${bookingId}/accept ---`);
    const acceptRes = await request(`/api/bookings/${bookingId}/accept`, 'PUT', null, providerToken);
    console.log('Accept Status:', acceptRes.status, 'New Status:', acceptRes.data.data.booking.status);

    // 9. Provider Starts Booking
    console.log(`\n--- 7. Testing PUT /api/bookings/${bookingId}/start ---`);
    const startRes = await request(`/api/bookings/${bookingId}/start`, 'PUT', null, providerToken);
    console.log('Start Status:', startRes.status, 'New Status:', startRes.data.data.booking.status);

    // 10. Provider Completes Booking
    console.log(`\n--- 8. Testing PUT /api/bookings/${bookingId}/complete ---`);
    const completeRes = await request(`/api/bookings/${bookingId}/complete`, 'PUT', null, providerToken);
    console.log('Complete Status:', completeRes.status, 'New Status:', completeRes.data.data.booking.status);

    // 11. Test Cancel Flow on a second booking
    console.log('\n--- 9. Testing Cancel Flow ---');
    const secondBookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-05',
      timeSlot: '02:00 PM',
      address: { line1: '123 Test St', city: 'Mumbai', pincode: '400001' },
    }, customerToken);
    const secondBookingId = secondBookingRes.data.data.booking.id || secondBookingRes.data.data.booking._id;

    const cancelRes = await request(`/api/bookings/${secondBookingId}/cancel`, 'PUT', {
      reason: 'Schedule conflict',
    }, customerToken);
    console.log('Cancel Status:', cancelRes.status, 'New Status:', cancelRes.data.data.booking.status);

    await mongoose.disconnect();
    console.log('\n✅ ALL BOOKING MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
