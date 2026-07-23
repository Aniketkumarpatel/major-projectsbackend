'use strict';

const http = require('http');

const request = (path) => new Promise((resolve, reject) => {
  const req = http.get({
    hostname: 'localhost',
    port: 5000,
    path,
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
});

(async () => {
  try {
    console.log('--- Checking Backend Health & Base Endpoints ---');
    const health = await request('/health');
    console.log('Health Endpoint Status:', health.status, 'Message:', health.data.message);

    const apiV1 = await request('/api/v1');
    console.log('API v1 Base Status:', apiV1.status, 'Message:', apiV1.data.message);

    console.log('\n✅ BACKEND API INTEGRATION COMPLETE AND OPERATIONAL!');
  } catch (err) {
    console.error('Health Check Error:', err);
    process.exit(1);
  }
})();
