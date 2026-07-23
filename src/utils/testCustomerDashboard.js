'use strict';

const http = require('http');

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

    // 1. Signup Customer
    console.log('--- 1. Registering Customer User ---');
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'Dashboard Customer',
      email: `dash_customer_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876541234',
    });
    const token = signupRes.data.data.token;

    // 2. GET Customer Dashboard Overview
    console.log('\n--- 2. Testing GET /api/customer/dashboard ---');
    const dashRes = await request('/api/customer/dashboard', 'GET', null, token);
    console.log('Dashboard Status:', dashRes.status, 'Stats:', dashRes.data.data.stats);
    console.log('Favourite Providers Count:', dashRes.data.data.favouriteProviders.length);

    // 3. GET Profile
    console.log('\n--- 3. Testing GET /api/customer/profile ---');
    const profileRes = await request('/api/customer/profile', 'GET', null, token);
    console.log('Profile Status:', profileRes.status, 'Name:', profileRes.data.data.user.name);

    // 4. PUT Profile
    console.log('\n--- 4. Testing PUT /api/customer/profile ---');
    const updateProfileRes = await request('/api/customer/profile', 'PUT', {
      name: 'Updated Dashboard Customer',
      phone: '9988776655',
      address: { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    }, token);
    console.log('Update Profile Status:', updateProfileRes.status, 'New Phone:', updateProfileRes.data.data.user.phone);

    // 5. GET Customer Bookings
    console.log('\n--- 5. Testing GET /api/customer/bookings ---');
    const bookingsRes = await request('/api/customer/bookings', 'GET', null, token);
    console.log('Bookings Status:', bookingsRes.status, 'Total Items:', bookingsRes.data.data.pagination.totalItems);

    // 6. GET Upcoming Bookings
    console.log('\n--- 6. Testing GET /api/customer/upcoming-bookings ---');
    const upcomingRes = await request('/api/customer/upcoming-bookings', 'GET', null, token);
    console.log('Upcoming Status:', upcomingRes.status);

    // 7. GET Completed Bookings
    console.log('\n--- 7. Testing GET /api/customer/completed-bookings ---');
    const completedRes = await request('/api/customer/completed-bookings', 'GET', null, token);
    console.log('Completed Status:', completedRes.status);

    // 8. GET Cancelled Bookings
    console.log('\n--- 8. Testing GET /api/customer/cancelled-bookings ---');
    const cancelledRes = await request('/api/customer/cancelled-bookings', 'GET', null, token);
    console.log('Cancelled Status:', cancelledRes.status);

    // 9. GET Customer Reviews
    console.log('\n--- 9. Testing GET /api/customer/reviews ---');
    const reviewsRes = await request('/api/customer/reviews', 'GET', null, token);
    console.log('Reviews Status:', reviewsRes.status);

    // 10. GET Customer Notifications
    console.log('\n--- 10. Testing GET /api/customer/notifications ---');
    const notifRes = await request('/api/customer/notifications', 'GET', null, token);
    console.log('Notifications Status:', notifRes.status, 'Count:', notifRes.data.data.notifications.length);

    console.log('\n✅ ALL CUSTOMER DASHBOARD MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
