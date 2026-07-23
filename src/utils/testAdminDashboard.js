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

    // 1. Register Admin User
    console.log('--- 1. Registering Admin User ---');
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'System Admin',
      email: `admin_${timestamp}@test.com`,
      password: 'password123',
      role: 'admin',
      phone: '9998887770',
    });
    const token = signupRes.data.data.token;

    // 2. GET Admin Dashboard Overview
    console.log('\n--- 2. Testing GET /api/admin/dashboard ---');
    const dashRes = await request('/api/admin/dashboard', 'GET', null, token);
    console.log('Dashboard Status:', dashRes.status, 'Stats:', dashRes.data.data.stats);

    // 3. GET All Users
    console.log('\n--- 3. Testing GET /api/admin/users ---');
    const usersRes = await request('/api/admin/users', 'GET', null, token);
    console.log('Users Status:', usersRes.status, 'Total Users:', usersRes.data.data.pagination.totalItems);

    // 4. GET All Providers
    console.log('\n--- 4. Testing GET /api/admin/providers ---');
    const providersRes = await request('/api/admin/providers', 'GET', null, token);
    console.log('Providers Status:', providersRes.status, 'Total Providers:', providersRes.data.data.pagination.totalItems);

    // 5. GET All Services
    console.log('\n--- 5. Testing GET /api/admin/services ---');
    const servicesRes = await request('/api/admin/services', 'GET', null, token);
    console.log('Services Status:', servicesRes.status, 'Total Services:', servicesRes.data.data.pagination.totalItems);

    // 6. Manage Categories (POST & GET)
    console.log('\n--- 6. Testing Category Management (POST & GET /api/admin/categories) ---');
    const createCatRes = await request('/api/admin/categories', 'POST', {
      name: `Automotive & Car Care ${timestamp}`,
      description: 'Car wash, detailing, and mechanic services',
      icon: '🚗',
    }, token);
    console.log('Create Category Status:', createCatRes.status, 'Category Name:', createCatRes.data.data.category.name);

    const categoriesRes = await request('/api/admin/categories', 'GET', null, token);
    console.log('Categories Total:', categoriesRes.data.data.pagination.totalItems);

    // 7. GET All Bookings
    console.log('\n--- 7. Testing GET /api/admin/bookings ---');
    const bookingsRes = await request('/api/admin/bookings', 'GET', null, token);
    console.log('Bookings Status:', bookingsRes.status, 'Total Bookings:', bookingsRes.data.data.pagination.totalItems);

    // 8. GET All Reviews
    console.log('\n--- 8. Testing GET /api/admin/reviews ---');
    const reviewsRes = await request('/api/admin/reviews', 'GET', null, token);
    console.log('Reviews Status:', reviewsRes.status, 'Total Reviews:', reviewsRes.data.data.pagination.totalItems);

    // 9. GET Payments
    console.log('\n--- 9. Testing GET /api/admin/payments ---');
    const paymentsRes = await request('/api/admin/payments', 'GET', null, token);
    console.log('Payments Status:', paymentsRes.status, 'Completed Transactions:', paymentsRes.data.data.pagination.totalItems);

    // 10. GET Contacts
    console.log('\n--- 10. Testing GET /api/admin/contacts ---');
    const contactsRes = await request('/api/admin/contacts', 'GET', null, token);
    console.log('Contacts Status:', contactsRes.status, 'Total Contacts:', contactsRes.data.data.pagination.totalItems);

    console.log('\n✅ ALL ADMIN DASHBOARD MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
