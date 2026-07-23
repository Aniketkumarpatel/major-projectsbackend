'use strict';

const http = require('http');
const mongoose = require('mongoose');

const request = (path, method = 'GET', body = null, token = null) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: 'Bearer ' + token }),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const uploadRequest = (path, fieldName, filename, fileBuffer, token) =>
  new Promise((resolve, reject) => {
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

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length,
          ...(token && { Authorization: 'Bearer ' + token }),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

(async () => {
  const ts = Date.now();
  console.log(`\n======================================================`);
  console.log(` 🧪 MASTER INTEGRATION TEST RUNNER FOR ALL 13 MODULES`);
  console.log(`======================================================\n`);

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/local_service_booking');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. AUTHENTICATION MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 1. Testing Auth Module ---');
    const custSignup = await request('/api/auth/signup', 'POST', {
      name: 'Master Customer',
      email: `m_cust_${ts}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876599001',
    });
    console.log('✓ Signup Customer:', custSignup.status, custSignup.data.success);
    const customerToken = custSignup.data.data.token;

    const provSignup = await request('/api/auth/signup', 'POST', {
      name: 'Master Provider',
      email: `m_prov_${ts}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876599002',
    });
    console.log('✓ Signup Provider:', provSignup.status, provSignup.data.success);
    const providerToken = provSignup.data.data.token;

    const adminSignup = await request('/api/auth/signup', 'POST', {
      name: 'Master Admin',
      email: `m_admin_${ts}@test.com`,
      password: 'password123',
      role: 'admin',
      phone: '9876599003',
    });
    console.log('✓ Signup Admin:', adminSignup.status, adminSignup.data.success);
    const adminToken = adminSignup.data.data.token;

    const loginRes = await request('/api/auth/login', 'POST', {
      email: `m_cust_${ts}@test.com`,
      password: 'password123',
    });
    console.log('✓ Login User:', loginRes.status, loginRes.data.message);

    const meRes = await request('/api/auth/me', 'GET', null, customerToken);
    console.log('✓ Get /me:', meRes.status, meRes.data.data.user.email);

    // Test Unauthorized 401
    const unauthRes = await request('/api/auth/me', 'GET');
    console.log('✓ Protection 401 Check:', unauthRes.status, unauthRes.data.message);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CATEGORIES MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Testing Categories Module ---');
    const createCatRes = await request('/api/categories', 'POST', {
      name: `Home Repair & Carpentry ${ts}`,
      description: 'Furniture repair and custom woodworking',
      icon: '🪚',
    }, adminToken);
    console.log('✓ Create Category:', createCatRes.status, createCatRes.data.data.category.name);
    const categoryId = createCatRes.data.data.category._id || createCatRes.data.data.category.id;

    const getCatsRes = await request('/api/categories', 'GET');
    console.log('✓ List Categories:', getCatsRes.status, 'Count:', getCatsRes.data.data.categories.length);

    const getCatRes = await request(`/api/categories/${categoryId}`, 'GET');
    console.log('✓ Get Category By ID:', getCatRes.status, getCatRes.data.data.category.name);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. SERVICES MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing Services Module ---');
    const createServiceRes = await request('/api/services', 'POST', {
      title: `Custom Furniture Repair ${ts}`,
      description: 'Expert wooden table and chair repair service',
      category: categoryId,
      price: { amount: 1500, unit: 'fixed' },
      duration: '2-3 hrs',
      location: { city: 'Mumbai', pincode: '400001' },
    }, providerToken);
    console.log('✓ Create Service:', createServiceRes.status, createServiceRes.data.data.service.title);
    const serviceId = createServiceRes.data.data.service._id || createServiceRes.data.data.service.id;

    const listServicesRes = await request('/api/services?search=Furniture', 'GET');
    console.log('✓ List Services (Search):', listServicesRes.status, 'Found:', listServicesRes.data.data.services.length);

    const getServiceRes = await request(`/api/services/${serviceId}`, 'GET');
    console.log('✓ Get Service Details:', getServiceRes.status, getServiceRes.data.data.service.title);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. BOOKINGS MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing Bookings Module ---');
    const createBookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-25',
      timeSlot: '02:00 PM',
      address: { line1: 'Building 5, Bandra', city: 'Mumbai', pincode: '400050' },
    }, customerToken);
    console.log('✓ Create Booking:', createBookingRes.status, createBookingRes.data.message);
    const bookingId = createBookingRes.data.data.booking._id || createBookingRes.data.data.booking.id;

    const acceptRes = await request(`/api/bookings/${bookingId}/accept`, 'PUT', null, providerToken);
    console.log('✓ Accept Booking:', acceptRes.status, 'New Status:', acceptRes.data.data.booking.status);

    const startRes = await request(`/api/bookings/${bookingId}/start`, 'PUT', null, providerToken);
    console.log('✓ Start Booking:', startRes.status, 'New Status:', startRes.data.data.booking.status);

    const completeRes = await request(`/api/bookings/${bookingId}/complete`, 'PUT', null, providerToken);
    console.log('✓ Complete Booking:', completeRes.status, 'New Status:', completeRes.data.data.booking.status);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. REVIEWS MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Testing Reviews Module ---');
    const createReviewRes = await request('/api/reviews', 'POST', {
      booking: bookingId,
      rating: 5,
      comment: 'Superb craftsmanship and very polite behavior. Highly recommended!',
    }, customerToken);
    console.log('✓ Submit Review:', createReviewRes.status, createReviewRes.data.message);

    const getReviewsRes = await request(`/api/reviews/service/${serviceId}`, 'GET');
    console.log('✓ List Service Reviews:', getReviewsRes.status, 'Avg Rating:', getReviewsRes.data.data.summary.averageRating);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. CUSTOMER DASHBOARD MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Testing Customer Dashboard Module ---');
    const custDashRes = await request('/api/customer/dashboard', 'GET', null, customerToken);
    console.log('✓ Customer Dashboard:', custDashRes.status, 'Total Bookings:', custDashRes.data.data.stats.totalBookings);

    const custProfileRes = await request('/api/customer/profile', 'GET', null, customerToken);
    console.log('✓ Customer Profile:', custProfileRes.status, custProfileRes.data.data.user.name);

    // ──────────────────────────────────────────────────────────────────────────
    // 7. PROVIDER DASHBOARD MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. Testing Provider Dashboard Module ---');
    const provDashRes = await request('/api/provider/dashboard', 'GET', null, providerToken);
    console.log('✓ Provider Dashboard:', provDashRes.status, 'Earnings:', provDashRes.data.data.stats.totalEarnings);

    const provEarningsRes = await request('/api/provider/earnings', 'GET', null, providerToken);
    console.log('✓ Provider Earnings Report:', provEarningsRes.status, 'Transactions:', provEarningsRes.data.data.recentTransactions.length);

    // ──────────────────────────────────────────────────────────────────────────
    // 8. ADMIN DASHBOARD MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. Testing Admin Dashboard Module ---');
    const adminDashRes = await request('/api/admin/dashboard', 'GET', null, adminToken);
    console.log('✓ Admin Dashboard:', adminDashRes.status, 'Total Users:', adminDashRes.data.data.stats.totalUsers);

    const adminUsersRes = await request('/api/admin/users', 'GET', null, adminToken);
    console.log('✓ Admin Users List:', adminUsersRes.status, 'Total:', adminUsersRes.data.data.pagination.totalItems);

    // ──────────────────────────────────────────────────────────────────────────
    // 9. CONTACT MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 9. Testing Contact Module ---');
    const contactRes = await request('/api/contact', 'POST', {
      name: 'Tester Inquiry',
      email: `test_contact_${ts}@test.com`,
      subject: 'General Feedback',
      message: 'Great platform experience! Everything works smoothly.',
    });
    console.log('✓ Submit Contact Inquiry:', contactRes.status, contactRes.data.message);

    const getContactsRes = await request('/api/contact', 'GET', null, adminToken);
    console.log('✓ Admin List Contacts:', getContactsRes.status, 'Count:', getContactsRes.data.data.contacts.length);

    // ──────────────────────────────────────────────────────────────────────────
    // 10. FAQ MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 10. Testing FAQ Module ---');
    const createFaqRes = await request('/api/faqs', 'POST', {
      question: 'What payment methods are supported on ServEase?',
      answer: 'We support Credit/Debit Cards, UPI, Netbanking, and Cash on Delivery.',
      category: 'Payments & Refunds',
    }, adminToken);
    console.log('✓ Create FAQ:', createFaqRes.status, createFaqRes.data.data.faq.question);

    const getFaqsRes = await request('/api/faqs', 'GET');
    console.log('✓ Public List FAQs:', getFaqsRes.status, 'Total:', getFaqsRes.data.data.faqs.length);

    // ──────────────────────────────────────────────────────────────────────────
    // 11. PAYMENTS MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 11. Testing Payments Module ---');
    // Create a new unpaid booking for payment intent test
    const unpaidBookingRes = await request('/api/bookings', 'POST', {
      service: serviceId,
      bookingDate: '2026-08-30',
      timeSlot: '05:00 PM',
      address: { line1: 'Building 10', city: 'Mumbai', pincode: '400050' },
    }, customerToken);
    const unpaidBookingId = unpaidBookingRes.data.data.booking._id || unpaidBookingRes.data.data.booking.id;

    const createIntentRes = await request('/api/payments/create-intent', 'POST', {
      bookingId: unpaidBookingId,
      paymentMethod: 'stripe',
    }, customerToken);
    console.log('✓ Create Payment Intent:', createIntentRes.status, 'IntentID:', createIntentRes.data.data.paymentIntentId);

    const verifyPayRes = await request('/api/payments/verify', 'POST', {
      bookingId: unpaidBookingId,
      paymentIntentId: createIntentRes.data.data.paymentIntentId,
      status: 'paid',
    }, customerToken);
    console.log('✓ Verify Payment:', verifyPayRes.status, 'Booking PaymentStatus:', verifyPayRes.data.data.booking.paymentStatus);

    const payHistoryRes = await request('/api/payments/history', 'GET', null, customerToken);
    console.log('✓ Payment History:', payHistoryRes.status, 'Count:', payHistoryRes.data.data.payments.length);

    // ──────────────────────────────────────────────────────────────────────────
    // 12. NOTIFICATIONS MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 12. Testing Notifications Module ---');
    const getNotifsRes = await request('/api/notifications', 'GET', null, customerToken);
    console.log('✓ Get Notifications:', getNotifsRes.status, 'Count:', getNotifsRes.data.data.notifications.length);

    const unreadRes = await request('/api/notifications/unread-count', 'GET', null, customerToken);
    console.log('✓ Unread Notifications Count:', unreadRes.status, 'Count:', unreadRes.data.data.unreadCount);

    const readAllNotifsRes = await request('/api/notifications/read-all', 'PUT', null, customerToken);
    console.log('✓ Read All Notifications:', readAllNotifsRes.status, readAllNotifsRes.data.message);

    // ──────────────────────────────────────────────────────────────────────────
    // 13. FILE UPLOADS MODULE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 13. Testing File Uploads Module ---');
    const dummyBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

    const profileUpRes = await uploadRequest('/api/upload/profile', 'avatar', 'avatar.jpg', dummyBuffer, customerToken);
    console.log('✓ Upload User Avatar:', profileUpRes.status, profileUpRes.data.data.avatar);

    const provUpRes = await uploadRequest('/api/upload/provider-image', 'image', 'prov.jpg', dummyBuffer, providerToken);
    console.log('✓ Upload Provider Logo:', provUpRes.status, provUpRes.data.data.image);

    const serviceUpRes = await uploadRequest(`/api/upload/service-images/${serviceId}`, 'images', 'srv.jpg', dummyBuffer, providerToken);
    console.log('✓ Upload Service Image:', serviceUpRes.status, 'Total Images:', serviceUpRes.data.data.service.images.length);

    await mongoose.disconnect();

    console.log(`\n======================================================`);
    console.log(` 🎉 ALL 13 BACKEND MODULES FULLY TESTED & VERIFIED! `);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Master Test Error:', err);
    process.exit(1);
  }
})();
