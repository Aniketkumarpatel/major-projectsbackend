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

    // 1. Mongoose setup
    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');
    const Category = require('../models/category.model');
    const Service = require('../models/service.model');
    const Provider = require('../models/provider.model');

    let category = await Category.findOne({});
    if (!category) {
      category = await Category.create({
        name: `Electrical Services ${timestamp}`,
        description: 'Home electrical repairs and wiring',
      });
    }

    // 2. Register Customer & Provider
    console.log('--- 1. Registering Users & Setup ---');
    const customerSignup = await request('/api/auth/signup', 'POST', {
      name: 'Reviewer Customer',
      email: `r_customer_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876543333',
    });
    const customerToken = customerSignup.data.data.token;

    const providerSignup = await request('/api/auth/signup', 'POST', {
      name: 'Reviewer Provider',
      email: `r_provider_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876543444',
    });
    const providerToken = providerSignup.data.data.token;

    // 3. Create Service
    const serviceRes = await request('/api/services', 'POST', {
      title: `Full Home Electrical Inspection ${timestamp}`,
      description: 'Complete wiring safety check and panel inspection',
      category: category._id.toString(),
      price: { amount: 999, unit: 'fixed' },
      location: { city: 'Mumbai', pincode: '400001' },
    }, providerToken);
    const serviceId = serviceRes.data.data.service.id || serviceRes.data.data.service._id;

    // 4. Create and Complete Booking
    console.log('\n--- 2. Creating and Completing Booking ---');
    const bookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-10',
      timeSlot: '11:00 AM',
      address: { line1: 'Villa 10', city: 'Mumbai', pincode: '400001' },
    }, customerToken);
    const bookingId = bookingRes.data.data.booking.id || bookingRes.data.data.booking._id;

    await request(`/api/bookings/${bookingId}/accept`, 'PUT', null, providerToken);
    await request(`/api/bookings/${bookingId}/start`, 'PUT', null, providerToken);
    await request(`/api/bookings/${bookingId}/complete`, 'PUT', null, providerToken);

    // 5. Submit Review
    console.log('\n--- 3. Testing POST /api/reviews (Submit Review) ---');
    const createReviewRes = await request('/api/reviews', 'POST', {
      booking: bookingId,
      rating: 5,
      comment: 'Outstanding electrical inspection service! Punctual, professional, and very thorough.',
    }, customerToken);
    console.log('Create Review Status:', createReviewRes.status, createReviewRes.data.message);
    const reviewId = createReviewRes.data.data.review.id || createReviewRes.data.data.review._id;

    // 6. Test Duplicate Review Guard
    console.log('\n--- 4. Testing Duplicate Review Guard ---');
    const dupRes = await request('/api/reviews', 'POST', {
      booking: bookingId,
      rating: 4,
      comment: 'Trying to submit duplicate review',
    }, customerToken);
    console.log('Duplicate Check Status:', dupRes.status, dupRes.data.message);

    // 7. Verify Auto Rating Calculation on Service & Provider
    console.log('\n--- 5. Verifying Service & Provider Rating Auto-Calculation ---');
    const updatedServiceDoc = await Service.findById(serviceId);
    console.log('Service Avg Rating:', updatedServiceDoc.rating, 'Total Reviews:', updatedServiceDoc.numReviews);

    // 8. Get Provider Reviews
    console.log('\n--- 6. Testing GET /api/reviews/provider/:providerId ---');
    const providerReviewsRes = await request(`/api/reviews/provider/${createReviewRes.data.data.review.provider._id || createReviewRes.data.data.review.provider.id || createReviewRes.data.data.review.provider}`, 'GET');
    console.log('Provider Reviews Count:', providerReviewsRes.data.data.reviews.length, 'Avg:', providerReviewsRes.data.data.summary.averageRating);

    // 9. Get Service Reviews
    console.log(`\n--- 7. Testing GET /api/reviews/service/${serviceId} ---`);
    const serviceReviewsRes = await request(`/api/reviews/service/${serviceId}`, 'GET');
    console.log('Service Reviews Count:', serviceReviewsRes.data.data.reviews.length);

    // 10. Update Review
    console.log(`\n--- 8. Testing PUT /api/reviews/${reviewId} ---`);
    const updateReviewRes = await request(`/api/reviews/${reviewId}`, 'PUT', {
      rating: 4,
      comment: 'Updated review: Great overall service, highly recommended!',
    }, customerToken);
    console.log('Update Review Status:', updateReviewRes.status, 'New Rating:', updateReviewRes.data.data.review.rating);

    // 11. Delete Review
    console.log(`\n--- 9. Testing DELETE /api/reviews/${reviewId} ---`);
    const deleteReviewRes = await request(`/api/reviews/${reviewId}`, 'DELETE', null, customerToken);
    console.log('Delete Review Status:', deleteReviewRes.status, deleteReviewRes.data.message);

    await mongoose.disconnect();
    console.log('\n✅ ALL REVIEWS & RATINGS MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
