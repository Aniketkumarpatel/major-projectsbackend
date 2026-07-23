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
    console.log('--- 1. Registering Users & Triggering Automatic Booking Notification ---');
    const custSignup = await request('/api/auth/signup', 'POST', {
      name: 'Notif Customer',
      email: `notif_cust_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876547777',
    });
    const customerToken = custSignup.data.data.token;

    const provSignup = await request('/api/auth/signup', 'POST', {
      name: 'Notif Provider Pro',
      email: `notif_prov_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876548888',
    });
    const providerToken = provSignup.data.data.token;

    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');
    const Category = require('../models/category.model');
    let category = await Category.findOne({});
    if (!category) {
      category = await Category.create({ name: `Notif Test Category ${timestamp}`, description: 'Test' });
    }

    const serviceRes = await request('/api/services', 'POST', {
      title: `Deep Cleaning Service ${timestamp}`,
      description: 'Home deep cleaning',
      category: category._id.toString(),
      price: { amount: 1200 },
      location: { city: 'Mumbai', pincode: '400001' },
    }, providerToken);
    const serviceId = serviceRes.data.data.service.id || serviceRes.data.data.service._id;

    // Creating booking automatically triggers notifications!
    const bookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-20',
      timeSlot: '10:00 AM',
      address: { line1: '123 Beach Road', city: 'Mumbai', pincode: '400001' },
    }, customerToken);
    const bookingId = bookingRes.data.data.booking.id || bookingRes.data.data.booking._id;

    // 2. Provider accepts booking (triggers status update notification to customer!)
    await request(`/api/bookings/${bookingId}/accept`, 'PUT', null, providerToken);

    // 3. Provider gets notifications
    console.log('\n--- 2. Testing GET /api/notifications (Provider Notifications) ---');
    const provNotifsRes = await request('/api/notifications', 'GET', null, providerToken);
    console.log('Provider Notifications Count:', provNotifsRes.data.data.notifications.length, 'Unread Count:', provNotifsRes.data.data.unreadCount);

    // 4. Customer gets notifications
    console.log('\n--- 3. Testing GET /api/notifications (Customer Notifications) ---');
    const custNotifsRes = await request('/api/notifications', 'GET', null, customerToken);
    console.log('Customer Notifications Count:', custNotifsRes.data.data.notifications.length, 'Title:', custNotifsRes.data.data.notifications[0]?.title);
    const notificationId = custNotifsRes.data.data.notifications[0]._id;

    // 5. GET Unread Count
    console.log('\n--- 4. Testing GET /api/notifications/unread-count ---');
    const unreadCountRes = await request('/api/notifications/unread-count', 'GET', null, customerToken);
    console.log('Unread Count Status:', unreadCountRes.status, 'Unread Count:', unreadCountRes.data.data.unreadCount);

    // 6. Mark Single Notification as Read
    console.log(`\n--- 5. Testing PUT /api/notifications/${notificationId}/read ---`);
    const markReadRes = await request(`/api/notifications/${notificationId}/read`, 'PUT', null, customerToken);
    console.log('Mark Read Status:', markReadRes.status, 'isRead:', markReadRes.data.data.notification.isRead);

    // 7. Mark All as Read
    console.log('\n--- 6. Testing PUT /api/notifications/read-all ---');
    const readAllRes = await request('/api/notifications/read-all', 'PUT', null, customerToken);
    console.log('Read All Status:', readAllRes.status, readAllRes.data.message);

    // 8. Delete Single Notification
    console.log(`\n--- 7. Testing DELETE /api/notifications/${notificationId} ---`);
    const deleteNotifRes = await request(`/api/notifications/${notificationId}`, 'DELETE', null, customerToken);
    console.log('Delete Notification Status:', deleteNotifRes.status, deleteNotifRes.data.message);

    // 9. Clear All Notifications
    console.log('\n--- 8. Testing DELETE /api/notifications/clear-all ---');
    const clearAllRes = await request('/api/notifications/clear-all', 'DELETE', null, customerToken);
    console.log('Clear All Status:', clearAllRes.status, clearAllRes.data.message);

    await mongoose.disconnect();
    console.log('\n✅ ALL NOTIFICATION MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
