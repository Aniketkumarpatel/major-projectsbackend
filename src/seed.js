'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import All Mongoose Models
const User = require('./models/user.model');
const Provider = require('./models/provider.model');
const Category = require('./models/category.model');
const Service = require('./models/service.model');
const Booking = require('./models/booking.model');
const Review = require('./models/review.model');
const Payment = require('./models/payment.model');
const Notification = require('./models/notification.model');
const Contact = require('./models/contact.model');
const FAQ = require('./models/faq.model');

// Connect to MongoDB Database
const connectDB = async () => {
  const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/local_service_booking';
  await mongoose.connect(connStr);
  console.log(`🔌 Connected to MongoDB for seeding: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

// Realistic Indian Seed Datasets
const indianCustomerNames = [
  'Aarav Sharma', 'Ananya Verma', 'Rohan Gupta', 'Priya Singh', 'Aditya Patel',
  'Kavya Iyer', 'Rahul Deshmukh', 'Sneha Mukherji', 'Vikram Joshi', 'Neha Reddy',
  'Siddharth Malhotra', 'Pooja Kapoor', 'Amitabh Banerjee', 'Diya Nair', 'Karan Mehta',
  'Isha Saxena', 'Manish Agarwal', 'Ritu Chaudhary', 'Varun Rao', 'Shreya Kulkarni'
];

const indianCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata'];

const providerBusinessData = [
  { name: 'Rajesh Kumar', biz: 'Apex Cooling & AC Solutions', categoryType: 'AC Repair', skills: ['Split AC Repair', 'Cassette AC Service', 'Gas Refill'], city: 'Mumbai' },
  { name: 'Suresh Patel', biz: 'Patel Electrical Works', categoryType: 'Electrical', skills: ['Wiring', 'MCB Replacement', 'Chandelier Installation'], city: 'Delhi' },
  { name: 'Ramesh Verma', biz: 'QuickFix Plumbing Experts', categoryType: 'Plumbing', skills: ['Pipe Leakage Repair', 'Tap Replacement', 'Drain Unclogging'], city: 'Bengaluru' },
  { name: 'Sunita Sharma', biz: 'Sparkle Clean Home Services', categoryType: 'Home Cleaning', skills: ['Deep Home Cleaning', 'Kitchen Cleaning', 'Bathroom Sanitization'], city: 'Pune' },
  { name: 'Vikram Singh', biz: 'Royal Wood & Furniture Carpentry', categoryType: 'Carpentry', skills: ['Modular Kitchen Assembly', 'Door Fitting', 'Furniture Repair'], city: 'Mumbai' },
  { name: 'Meena Reddy', biz: 'Glow Beauty & Salon Studio', categoryType: 'Salon for Women', skills: ['Facial', 'Hair Styling', 'Bridal Makeup'], city: 'Hyderabad' },
  { name: 'Manoj Joshi', biz: 'ProTech Laptop & PC Care', categoryType: 'Laptop & PC Repair', skills: ['OS Reinstallation', 'Hardware Upgrade', 'Screen Repair'], city: 'Bengaluru' },
  { name: 'Amit Shah', biz: 'PureFlow RO Purifier Services', categoryType: 'RO Water Purifier', skills: ['Filter Replacement', 'RO Membrane Change', 'TDS Balancing'], city: 'Ahmedabad' },
  { name: 'Deepak Nair', biz: 'GreenThumb Landscape & Gardening', categoryType: 'Gardening', skills: ['Lawn Mowing', 'Plant Pruning', 'Garden Maintenance'], city: 'Chennai' },
  { name: 'Pankaj Deshmukh', biz: 'Swift Relocation Packers & Movers', categoryType: 'Packers & Movers', skills: ['Home Shifting', 'Office Relocation', 'Vehicle Transport'], city: 'Pune' },
];

const categoriesList = [
  { name: 'AC Repair & Service', icon: '❄️', description: 'Complete AC servicing, filter cleaning, and gas charging' },
  { name: 'Plumbing Services', icon: '🚰', description: 'Fix leaks, unclog drains, and install sanitary fixtures' },
  { name: 'Electrical & Wiring', icon: '⚡', description: 'Short circuit repairs, switch replacement, and heavy wiring' },
  { name: 'Deep Home Cleaning', icon: '🧹', description: 'Comprehensive home, kitchen, and sofa deep cleaning' },
  { name: 'Carpentry & Furniture', icon: '🔨', description: 'Furniture repair, door latch fixing, and custom woodwork' },
  { name: 'Home Painting', icon: '🎨', description: 'Interior, exterior, and waterproof wall painting' },
  { name: 'Appliance Repair', icon: '🧺', description: 'Washing machine, refrigerator, and microwave repair' },
  { name: 'Salon for Women', icon: '💇‍♀️', description: 'Pedicure, facial, hair care, and waxing at home' },
  { name: 'Men’s Grooming', icon: '💈', description: 'Haircut, beard grooming, and facial massage' },
  { name: 'Pest Control', icon: '🐜', description: 'Termite, cockroach, and bed bug eradication' },
  { name: 'Gardening & Lawn', icon: '🌱', description: 'Balcony garden setup, plant trimming, and fertilization' },
  { name: 'Packers & Movers', icon: '📦', description: 'Safe packing, loading, and house shifting services' },
  { name: 'RO Water Purifier Service', icon: '💧', description: 'Filter replacement, membrane repair, and installation' },
  { name: 'Laptop & PC Repair', icon: '💻', description: 'Desktop assembly, motherboard repair, and software fix' },
  { name: 'Car Wash & Detailing', icon: '🚗', description: 'Doorstep foam car wash and interior deep detailing' },
];

const faqList = [
  { question: 'How do I book a local service on ServEase?', answer: 'Browse services by category or search term, select your preferred date and time slot, enter your address, and confirm your booking.', category: 'General' },
  { question: 'What payment methods are supported on ServEase?', answer: 'ServEase supports online payments via Stripe (Credit/Debit Card), UPI, Netbanking, and Cash on Delivery.', category: 'Payments & Refunds' },
  { question: 'Can I cancel or reschedule an upcoming booking?', answer: 'Yes, you can cancel or reschedule any upcoming booking directly from your Customer Dashboard before the service starts.', category: 'Customer & Booking' },
  { question: 'Are all service providers identity verified?', answer: 'Yes! All service providers undergo identity verification, background checks, and skill assessments before approval.', category: 'Safety & Trust' },
  { question: 'What if I am unhappy with the service quality?', answer: 'We offer a 100% satisfaction guarantee. Contact our support team within 24 hours for a free re-service or full refund.', category: 'Customer & Booking' },
  { question: 'Is there any emergency cancellation fee?', answer: 'Cancellations made more than 2 hours before the appointment time are completely free with zero cancellation charges.', category: 'Customer & Booking' },
  { question: 'How do service providers receive payouts?', answer: 'Providers receive instant wallet payouts or direct bank transfers immediately upon customer booking completion.', category: 'Payments & Refunds' },
  { question: 'Can I book multiple services at once?', answer: 'Yes, you can add multiple service items across different categories to your cart and book them in a single checkout.', category: 'General' },
  { question: 'Do providers bring their own tools and supplies?', answer: 'Yes, all verified providers carry commercial-grade tools and eco-friendly cleaning supplies.', category: 'General' },
  { question: 'How do ratings and reviews work on ServEase?', answer: 'Only customers who have completed a booking can submit a verified review and rating from 1 to 5 stars.', category: 'Customer & Booking' },
  { question: 'How can I register as a Service Provider?', answer: 'Click on "Become a Provider", submit your business details, upload identity documents, and start receiving job requests once verified.', category: 'Provider & Account' },
  { question: 'What safety precautions do providers follow?', answer: 'Providers wear masks, use sanitized gear, and follow strict hygiene protocols for your safety.', category: 'Safety & Trust' },
  { question: 'Can I request a custom quote for large projects?', answer: 'Yes, for large commercial jobs or full home renovation, select the custom quote option on the service page.', category: 'Technical Support' },
  { question: 'Where is ServEase service operational?', answer: 'ServEase is operational across major metro cities including Mumbai, Delhi NCR, Bengaluru, Pune, Hyderabad, and Chennai.', category: 'General' },
  { question: 'How can I contact 24/7 customer support?', answer: 'Reach out to our 24/7 helpdesk via the Contact Support form or call our toll-free number.', category: 'Technical Support' },
];

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Provider.deleteMany({}),
      Category.deleteMany({}),
      Service.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
      Payment.deleteMany({}),
      Notification.deleteMany({}),
      Contact.deleteMany({}),
      FAQ.deleteMany({}),
    ]);
    console.log('✨ All collections cleared successfully!');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. SEED ADMIN & CUSTOMERS (20 Customers + 1 Admin)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('👤 Seeding 20 Customers & 1 Admin...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await User.create({
      name: 'ServEase Admin',
      email: 'admin@servease.com',
      password: 'password123',
      role: 'admin',
      phone: '9998887770',
      address: { line1: 'Admin HQ Tower', city: 'Mumbai', pincode: '400001' },
      isVerified: true,
    });

    const customerUsers = [];
    for (let i = 0; i < indianCustomerNames.length; i++) {
      const name = indianCustomerNames[i];
      const email = `customer${i + 1}@example.com`;
      const city = indianCities[i % indianCities.length];
      const customer = await User.create({
        name,
        email,
        password: 'password123',
        role: 'customer',
        phone: `98765${10000 + i}`,
        address: { line1: `Flat ${101 + i}, Palm Heights`, city, pincode: `400${100 + i}` },
        isVerified: true,
      });
      customerUsers.push(customer);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SEED PROVIDERS (10 Providers)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('💼 Seeding 10 Service Providers...');
    const providerProfiles = [];
    for (let i = 0; i < providerBusinessData.length; i++) {
      const data = providerBusinessData[i];
      const user = await User.create({
        name: data.name,
        email: `provider${i + 1}@example.com`,
        password: 'password123',
        role: 'provider',
        phone: `91234${10000 + i}`,
        address: { line1: `Shop ${i + 10}, Trade Center`, city: data.city, pincode: `4000${i + 10}` },
        isVerified: true,
      });

      const provider = await Provider.create({
        user: user._id,
        businessName: data.biz,
        description: `Professional ${data.categoryType} experts with over 8 years of certified industry experience.`,
        experienceYears: 5 + (i % 7),
        skills: data.skills,
        hourlyRate: 350 + i * 50,
        location: { city: data.city, pincode: `4000${i + 10}` },
        serviceRadiusKm: 25,
        rating: 4.5,
        numReviews: 0,
        isVerified: true,
        verificationStatus: 'approved',
        availabilityStatus: 'available',
      });

      providerProfiles.push({ user, provider });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. SEED CATEGORIES (15 Categories)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🏷️ Seeding 15 Categories...');
    const createdCategories = [];
    for (let i = 0; i < categoriesList.length; i++) {
      const cat = categoriesList[i];
      const category = await Category.create({
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: i + 1,
        isActive: true,
      });
      createdCategories.push(category);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. SEED SERVICES (100 Services)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🛠️ Seeding 100 Services...');
    const createdServices = [];

    const serviceTemplates = [
      { prefix: 'Comprehensive', price: 999, duration: '1-2 hrs' },
      { prefix: 'Express', price: 499, duration: '45 mins' },
      { prefix: 'Premium Deep', price: 1799, duration: '3-4 hrs' },
      { prefix: 'Emergency Fix', price: 799, duration: '1 hr' },
      { prefix: 'Full Maintenance Pack', price: 2499, duration: '4-5 hrs' },
      { prefix: 'Standard Inspection &', price: 399, duration: '30 mins' },
      { prefix: 'Deluxe Upgrade for', price: 1299, duration: '2 hrs' },
    ];

    let serviceCount = 0;
    while (serviceCount < 100) {
      const catIndex = serviceCount % createdCategories.length;
      const category = createdCategories[catIndex];
      const providerItem = providerProfiles[serviceCount % providerProfiles.length];
      const template = serviceTemplates[serviceCount % serviceTemplates.length];

      const service = await Service.create({
        provider: providerItem.provider._id,
        category: category._id,
        title: `${template.prefix} ${category.name} #${serviceCount + 1}`,
        description: `High quality ${category.name.toLowerCase()} provided by experienced professionals with satisfaction warranty.`,
        price: {
          amount: template.price + (serviceCount % 5) * 100,
          unit: 'fixed',
          currency: 'INR',
        },
        duration: template.duration,
        images: ['/uploads/services/placeholder_service.jpg'],
        location: {
          city: providerItem.provider.location.city,
          pincode: providerItem.provider.location.pincode,
        },
        isActive: true,
        isFeatured: serviceCount % 5 === 0,
        rating: 4.5,
        numReviews: 0,
      });

      createdServices.push(service);
      serviceCount++;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. SEED BOOKINGS (80 Bookings)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📅 Seeding 80 Bookings...');
    const createdBookings = [];
    const statuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'];
    const timeSlots = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'];

    for (let i = 0; i < 80; i++) {
      const customer = customerUsers[i % customerUsers.length];
      const service = createdServices[i % createdServices.length];

      const status = i < 60 ? 'completed' : statuses[i % statuses.length];
      const isCompleted = status === 'completed';

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - (i % 30));

      const city = indianCities[i % indianCities.length];
      const pincode = `4000${(i % 50) + 10}`;

      const booking = await Booking.create({
        customer: customer._id,
        provider: service.provider,
        service: service._id,
        category: service.category,
        bookingDate,
        timeSlot: timeSlots[i % timeSlots.length],
        address: {
          line1: `Flat ${101 + i}, Building A, Green Valley`,
          city,
          pincode,
        },
        notes: i % 2 === 0 ? 'Please arrive on time.' : 'Call before arriving.',
        totalAmount: service.price.amount,
        status,
        paymentStatus: isCompleted ? 'paid' : (i % 3 === 0 ? 'paid' : 'unpaid'),
        paymentMethod: 'stripe',
        completedAt: isCompleted ? bookingDate : null,
      });

      createdBookings.push(booking);

      if (booking.paymentStatus === 'paid') {
        await Payment.create({
          booking: booking._id,
          customer: customer._id,
          provider: service.provider,
          amount: booking.totalAmount,
          currency: 'INR',
          paymentMethod: 'stripe',
          status: 'completed',
          paidAt: bookingDate,
          gatewayDetails: { gatewayName: 'stripe', paymentIntentId: `pi_seed_${booking._id}` },
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. SEED REVIEWS (60 Reviews for Completed Bookings)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⭐ Seeding 60 Reviews & Recalculating Ratings...');
    const commentsList = [
      'Outstanding service! Arrived right on time and solved the issue quickly.',
      'Very professional team, used clean tools and did a thorough job.',
      'Punctual, polite, and reasonable charges. Will definitely book again!',
      'Decent work done. A bit delayed by 15 mins but overall good service.',
      'Fair pricing and excellent work quality. Highly satisfied with the result.',
      'Great experience. High attention to detail and neat cleanup afterwards.',
    ];

    for (let i = 0; i < 60; i++) {
      const booking = createdBookings[i];
      const rating = 4 + (i % 2);

      await Review.create({
        booking: booking._id,
        customer: booking.customer,
        provider: booking.provider,
        service: booking.service,
        rating,
        comment: commentsList[i % commentsList.length],
      });

      await Review.calcAverageRating(booking.service, booking.provider);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. SEED NOTIFICATIONS (20 Notifications)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🔔 Seeding 20 Notifications...');
    const notifTypes = ['booking_new', 'booking_status', 'payment', 'review', 'system'];
    const notifTitles = [
      'New Booking Request Received 📅',
      'Booking Status Updated: Accepted ✅',
      'Payment Received Successfully 💳',
      'New 5-Star Customer Review ⭐',
      'Welcome to ServEase Platform 🎉',
    ];

    for (let i = 0; i < 20; i++) {
      const recipient = i % 2 === 0 ? customerUsers[i % customerUsers.length]._id : providerProfiles[i % providerProfiles.length].user._id;
      const type = notifTypes[i % notifTypes.length];
      const title = notifTitles[i % notifTitles.length];

      await Notification.create({
        recipient,
        type,
        title,
        message: `Notification update #${i + 1}: Action processed successfully on ServEase platform.`,
        isRead: i % 3 === 0,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. SEED FAQs (15 FAQs)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('❓ Seeding 15 FAQs...');
    for (let i = 0; i < faqList.length; i++) {
      const faq = faqList[i];
      await FAQ.create({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: i + 1,
        isActive: true,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. SEED CONTACT MESSAGES (20 Contact Messages)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📩 Seeding 20 Support Contact Messages...');
    const contactSubjects = [
      'Booking Issue',
      'Provider Complaint',
      'Refund Request',
      'Partnership Inquiry',
      'General Feedback',
    ];
    const contactStatuses = ['new', 'in_progress', 'resolved', 'closed'];

    for (let i = 0; i < 20; i++) {
      const name = indianCustomerNames[i % indianCustomerNames.length];
      const email = `contact_user_${i + 1}@example.com`;
      const subject = contactSubjects[i % contactSubjects.length];

      await Contact.create({
        name,
        email,
        phone: `98000${10000 + i}`,
        subject,
        message: `Hello ServEase Support team, this is a test inquiry #${i + 1} regarding ${subject.toLowerCase()}. Please respond.`,
        status: contactStatuses[i % contactStatuses.length],
      });
    }

    console.log('\n================================================================');
    console.log(' 🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    console.log(`👤 Customers Created:     20 (Password: password123)`);
    console.log(`💼 Providers Created:     10 (Password: password123)`);
    console.log(`👑 Admin Created:         1 (email: admin@servease.com | pass: password123)`);
    console.log(`🏷️ Categories Created:    15`);
    console.log(`🛠️ Services Created:      100`);
    console.log(`📅 Bookings Created:      80`);
    console.log(`⭐ Reviews Created:       60 (Ratings updated automatically!)`);
    console.log(`🔔 Notifications Created: 20`);
    console.log(`❓ FAQs Created:          15`);
    console.log(`📩 Contacts Created:      20`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('💥 Seeding Error:', err);
    process.exit(1);
  }
};

seedData();
