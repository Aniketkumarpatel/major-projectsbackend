'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('express-async-errors');
require('dotenv').config();

// Route Imports
const authRoutes = require('./routes/authRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const customerRoutes = require('./routes/customerRoutes');
const providerRoutes = require('./routes/providerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const faqRoutes = require('./routes/faqRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/user.routes');

// Middleware & Error Handler Imports
const errorHandler = require('./middleware/error.middleware');
const notFound = require('./middleware/notFound.middleware');

// Express App Initialization
const app = express();

// ─── 1. HTTP Response Compression ──────────────────────────────────────────
app.use(compression({
  threshold: 1024, // Compress responses above 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ─── 2. Security Middleware (Helmet & Mongo Sanitize) ───────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed at frontend level / CDN
    crossOriginEmbedderPolicy: false,
  })
);
app.use(mongoSanitize());

// ─── 3. CORS Middleware ──────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// ─── 4. HTTP Request Logging Middleware (Morgan) ────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── 5. Rate Limiting Middleware ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', globalLimiter);

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per IP per 15 mins
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── 6. HTTP Caching Headers Middleware for Public Resources ────────────────
const cacheMiddleware = (maxAgeSeconds = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds * 2}`);
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
};

// ─── 7. Body Parser & Cookie Parser Middleware ──────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── 8. Static Files ────────────────────────────────────────────────────────
app.use('/uploads', express.static('public/uploads', { maxAge: '1d' }));

// ─── 9. Health Check Route ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Local Service Booking API server is operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── 10. API Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/api/v1/users', userRoutes);

app.use('/api/categories', cacheMiddleware(600), categoryRoutes);
app.use('/api/v1/categories', cacheMiddleware(600), categoryRoutes);

app.use('/api/services', cacheMiddleware(300), servicesRoutes);
app.use('/api/v1/services', cacheMiddleware(300), servicesRoutes);

app.use('/api/bookings', bookingRoutes);
app.use('/api/v1/bookings', bookingRoutes);

app.use('/api/reviews', reviewRoutes);
app.use('/api/v1/reviews', reviewRoutes);

app.use('/api/customer', customerRoutes);
app.use('/api/v1/customer', customerRoutes);

app.use('/api/provider', providerRoutes);
app.use('/api/v1/provider', providerRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use('/api/contact', contactRoutes);
app.use('/api/v1/contact', contactRoutes);

app.use('/api/faqs', cacheMiddleware(600), faqRoutes);
app.use('/api/v1/faqs', cacheMiddleware(600), faqRoutes);

app.use('/api/upload', uploadRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api/v1/payments', paymentRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Direct mapping for /api/providers/:providerId/reviews and /api/services/:serviceId/reviews
app.use('/api/providers/:providerId/reviews', (req, res, next) => {
  req.url = `/provider/${req.params.providerId}`;
  return reviewRoutes(req, res, next);
});
app.use('/api/services/:serviceId/reviews', (req, res, next) => {
  req.url = `/service/${req.params.serviceId}`;
  return reviewRoutes(req, res, next);
});

// ─── 11. API Base Placeholder ───────────────────────────────────────────────
app.get('/api/v1', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Local Service Booking API v1',
  });
});

// ─── 12. 404 Not Found & Global Error Handler ──────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
