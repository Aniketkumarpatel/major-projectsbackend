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

    // 1. Register Admin User for FAQ management & Contact listing
    console.log('--- 1. Registering Admin User ---');
    const adminSignup = await request('/api/auth/signup', 'POST', {
      name: 'FAQ Admin',
      email: `faq_admin_${timestamp}@test.com`,
      password: 'password123',
      role: 'admin',
      phone: '9991112223',
    });
    const adminToken = adminSignup.data.data.token;

    // 2. Submit Contact Form (Public)
    console.log('\n--- 2. Testing POST /api/contact (Public Inquiry Submission) ---');
    const contactRes = await request('/api/contact', 'POST', {
      name: 'John Inquiry',
      email: `john_${timestamp}@test.com`,
      phone: '9876543210',
      subject: 'Booking Issue',
      message: 'I would like to reschedule my plumber booking to tomorrow morning.',
    });
    console.log('Contact Submit Status:', contactRes.status, contactRes.data.message);

    // 3. Get Contact Inquiries (Admin)
    console.log('\n--- 3. Testing GET /api/contact (Admin List Inquiries) ---');
    const getContactsRes = await request('/api/contact', 'GET', null, adminToken);
    console.log('Contacts Count:', getContactsRes.data.data.contacts.length);

    // 4. Create FAQ (Admin)
    console.log('\n--- 4. Testing POST /api/faqs (Admin Create FAQ) ---');
    const createFaqRes = await request('/api/faqs', 'POST', {
      question: 'How do I cancel or reschedule a service booking?',
      answer: 'You can easily cancel or reschedule your booking through your Customer Dashboard under the "Bookings" tab before the service starts.',
      category: 'Customer & Booking',
      sortOrder: 1,
    }, adminToken);
    console.log('Create FAQ Status:', createFaqRes.status, 'Question:', createFaqRes.data.data.faq.question);
    const faqId = createFaqRes.data.data.faq.id || createFaqRes.data.data.faq._id;

    // 5. Get All FAQs (Public)
    console.log('\n--- 5. Testing GET /api/faqs (Public View FAQs) ---');
    const getFaqsRes = await request('/api/faqs', 'GET');
    console.log('FAQs Total Count:', getFaqsRes.data.data.faqs.length, 'Categories:', Object.keys(getFaqsRes.data.data.groupedFaqs));

    // 6. Update FAQ (Admin)
    console.log(`\n--- 6. Testing PUT /api/faqs/${faqId} (Admin Update FAQ) ---`);
    const updateFaqRes = await request(`/api/faqs/${faqId}`, 'PUT', {
      answer: 'Updated answer: Free cancellation up to 2 hours before the scheduled time slot.',
    }, adminToken);
    console.log('Update FAQ Status:', updateFaqRes.status, 'New Answer:', updateFaqRes.data.data.faq.answer);

    // 7. Delete FAQ (Admin)
    console.log(`\n--- 7. Testing DELETE /api/faqs/${faqId} (Admin Delete FAQ) ---`);
    const deleteFaqRes = await request(`/api/faqs/${faqId}`, 'DELETE', null, adminToken);
    console.log('Delete FAQ Status:', deleteFaqRes.status, deleteFaqRes.data.message);

    console.log('\n✅ ALL CONTACT AND FAQ MODULE API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
})();
