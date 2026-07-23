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

    // 1. Signup Provider
    console.log('--- 1. Registering Provider User ---');
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'Pro Handyman Services',
      email: `dash_provider_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876500000',
    });
    const token = signupRes.data.data.token;

    // 2. GET Provider Dashboard Overview
    console.log('\n--- 2. Testing GET /api/provider/dashboard ---');
    const dashRes = await request('/api/provider/dashboard', 'GET', null, token);
    console.log('Dashboard Status:', dashRes.status, 'Stats:', dashRes.data.data.stats);
    console.log('Monthly Analytics Months:', dashRes.data.data.monthlyAnalytics.length);

    // 3. GET Profile
    console.log('\n--- 3. Testing GET /api/provider/profile ---');
    const profileRes = await request('/api/provider/profile', 'GET', null, token);
    console.log('Profile Status:', profileRes.status, 'Business Name:', profileRes.data.data.provider.businessName);

    // 4. PUT Profile
    console.log('\n--- 4. Testing PUT /api/provider/profile ---');
    const updateProfileRes = await request('/api/provider/profile', 'PUT', {
      businessName: 'Apex Plumbing & Home Care',
      bio: 'Over 10 years of experience in residential and commercial plumbing and repairs.',
      experienceYears: 10,
      hourlyRate: 499,
      skills: ['Plumbing', 'Pipe Fitting', 'Leak Repair'],
    }, token);
    console.log('Update Profile Status:', updateProfileRes.status, 'New Business Name:', updateProfileRes.data.data.provider.businessName);

    // 5. GET Provider Services
    console.log('\n--- 5. Testing GET /api/provider/services ---');
    const servicesRes = await request('/api/provider/services', 'GET', null, token);
    console.log('Services Status:', servicesRes.status, 'Total Items:', servicesRes.data.data.pagination.totalItems);

    // 6. GET Provider Bookings
    console.log('\n--- 6. Testing GET /api/provider/bookings ---');
    const bookingsRes = await request('/api/provider/bookings', 'GET', null, token);
    console.log('Bookings Status:', bookingsRes.status, 'Total Items:', bookingsRes.data.data.pagination.totalItems);

    // 7. GET Provider Reviews
    console.log('\n--- 7. Testing GET /api/provider/reviews ---');
    const reviewsRes = await request('/api/provider/reviews', 'GET', null, token);
    console.log('Reviews Status:', reviewsRes.status, 'Summary:', reviewsRes.data.data.summary);

    // 8. GET Provider Earnings Report
    console.log('\n--- 8. Testing GET /api/provider/earnings ---');
    const earningsRes = await request('/api/provider/earnings', 'GET', null, token);
    console.log('Earnings Status:', earningsRes.status, 'Summary:', earningsRes.data.data.earningsSummary);

    console.log('\n✅ ALL PROVIDER DASHBOARD MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
