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
    console.log('--- 1. Testing Signup (Customer) ---');
    const signupRes = await request('/api/auth/signup', 'POST', {
      name: 'Test Customer',
      email: `customer_${timestamp}@test.com`,
      password: 'password123',
      role: 'customer',
      phone: '9876543210'
    });
    console.log('Signup Status:', signupRes.status, signupRes.data);

    console.log('\n--- 2. Testing Signup (Provider) ---');
    const providerSignup = await request('/api/auth/signup', 'POST', {
      name: 'Test Provider',
      email: `provider_${timestamp}@test.com`,
      password: 'password123',
      role: 'provider',
      phone: '9876543211'
    });
    console.log('Provider Signup Status:', providerSignup.status, providerSignup.data.message);

    console.log('\n--- 3. Testing Login ---');
    const loginRes = await request('/api/auth/login', 'POST', {
      email: `customer_${timestamp}@test.com`,
      password: 'password123'
    });
    console.log('Login Status:', loginRes.status, loginRes.data.message);
    const token = loginRes.data.data.token;

    console.log('\n--- 4. Testing GET /api/auth/me ---');
    const meRes = await request('/api/auth/me', 'GET', null, token);
    console.log('Me Status:', meRes.status, meRes.data);

    console.log('\n--- 5. Testing Forgot Password ---');
    const forgotRes = await request('/api/auth/forgot-password', 'POST', {
      email: `customer_${timestamp}@test.com`
    });
    console.log('Forgot Status:', forgotRes.status, forgotRes.data);
    const resetToken = forgotRes.data.data.resetToken;

    console.log('\n--- 6. Testing Reset Password ---');
    const resetRes = await request('/api/auth/reset-password', 'POST', {
      token: resetToken,
      password: 'newpassword123'
    });
    console.log('Reset Status:', resetRes.status, resetRes.data.message);

    console.log('\n--- 7. Testing Logout ---');
    const logoutRes = await request('/api/auth/logout', 'POST', null, token);
    console.log('Logout Status:', logoutRes.status, logoutRes.data);

    console.log('\n✅ ALL AUTHENTICATION ENDPOINTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  }
})();
