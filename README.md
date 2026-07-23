# ServEase - Local Service Booking Platform Backend API

A production-ready, scalable, and secure RESTful API backend for the **ServEase** Local Service Booking Platform built with **Node.js**, **Express.js**, **MongoDB**, **Mongoose**, **JWT Authentication**, **Multer**, and **Cloudinary**.

---

## 🌟 Tech Stack & Core Libraries

- **Runtime & Framework**: Node.js & Express.js (v4)
- **Database**: MongoDB with Mongoose ODM (v8)
- **Authentication**: JSON Web Token (JWT) with HTTP-Only Cookies & Bearer Tokens
- **Security & Protection**: Helmet, CORS, Express Mongo Sanitize, Rate Limiting, bcryptjs
- **Validation**: express-validator (v7)
- **File Uploads**: Multer & Cloudinary Image Upload Storage
- **Logging**: Morgan HTTP Request Logger
- **Architecture**: Model-View-Controller (MVC) Design Pattern

---

## 📁 Backend Directory Structure

```
backend/
├── public/
│   └── uploads/                  # Local fallback upload directory
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB Mongoose connection
│   │   └── cloudinary.js         # Cloudinary SDK & file upload/delete helpers
│   ├── controllers/
│   │   ├── adminController.js    # Platform metrics, user/provider/service management
│   │   ├── authController.js     # Signup, login, logout, password reset, /me
│   │   ├── bookingController.js  # Booking creation, lifecycle actions & status triggers
│   │   ├── categoryController.js # Category management & services count attachment
│   │   ├── contactController.js  # Support inquiries & admin response management
│   │   ├── customerController.js # Customer dashboard, profile, bookings & reviews
│   │   ├── faqController.js      # FAQ CRUD & public category grouping
│   │   ├── notificationController.js # Read/unread, bulk actions, system alerts
│   │   ├── paymentController.js  # Stripe intent, verification, history & refunds
│   │   ├── providerController.js # Provider dashboard, monthly revenue analytics & earnings
│   │   ├── reviewController.js   # Review CRUD & auto-calculated rating hooks
│   │   ├── servicesController.js # Services CRUD, search, filter, pagination
│   │   └── uploadController.js   # Image uploads for profiles, providers & services
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification middleware (`protect`)
│   │   ├── roleMiddleware.js     # Role-based access control (`restrictTo`)
│   │   ├── uploadMiddleware.js   # Multer file size & mime validation middleware
│   │   ├── error.middleware.js   # Centralized error handler
│   │   └── notFound.middleware.js# 404 Route Not Found middleware
│   ├── models/
│   │   ├── booking.model.js      # Booking schema with status timeline
│   │   ├── category.model.js     # Category schema with slug generation
│   │   ├── contact.model.js      # Support contact inquiry schema
│   │   ├── faq.model.js          # FAQ schema with sort order & active status
│   │   ├── notification.model.js # Notification schema with read status
│   │   ├── payment.model.js      # Payment schema with transaction tracking
│   │   ├── provider.model.js     # Provider profile schema with verification badges
│   │   ├── review.model.js       # Review schema with static rating aggregation
│   │   ├── service.model.js      # Service schema with image fallback virtuals
│   │   └── user.model.js         # User schema with password hashing & comparison
│   ├── routes/
│   │   ├── adminRoutes.js        # Admin dashboard & management routes
│   │   ├── authRoutes.js         # Authentication routes
│   │   ├── bookingRoutes.js      # Booking lifecycle routes
│   │   ├── categoryRoutes.js     # Category routes
│   │   ├── contactRoutes.js      # Contact routes
│   │   ├── customerRoutes.js     # Customer dashboard routes
│   │   ├── faqRoutes.js          # FAQ routes
│   │   ├── notificationRoutes.js # Notification routes
│   │   ├── paymentRoutes.js      # Payment routes
│   │   ├── providerRoutes.js     # Provider dashboard routes
│   │   ├── reviewRoutes.js       # Review routes
│   │   ├── servicesRoutes.js     # Services routes
│   │   └── uploadRoutes.js       # File upload routes
│   ├── utils/
│   │   ├── catchAsync.js         # Async error wrapper utility
│   │   └── generateToken.js      # JWT token generator
│   ├── validations/
│   │   ├── adminValidation.js    # express-validator rules for admin
│   │   ├── authValidation.js     # express-validator rules for auth
│   │   ├── bookingValidation.js  # express-validator rules for bookings
│   │   ├── contactValidation.js  # express-validator rules for contact form
│   │   ├── customerValidation.js # express-validator rules for customer profile
│   │   ├── faqValidation.js      # express-validator rules for FAQs
│   │   ├── notificationValidation.js # express-validator rules for notifications
│   │   ├── paymentValidation.js  # express-validator rules for payments
│   │   ├── providerValidation.js # express-validator rules for provider profile
│   │   ├── reviewValidation.js   # express-validator rules for reviews
│   │   └── servicesValidation.js # express-validator rules for services
│   └── app.js                    # Express app initialization & route mounting
├── .env                          # Environment variables configuration
├── package.json                  # Dependencies & scripts
└── server.js                     # HTTP server listener with graceful shutdown
```

---

## ⚙️ Environment Variables (`.env`)

Create a `.env` file in the `backend/` root directory:

```env
# Server Config
PORT=5000
NODE_ENV=development

# Database Config
MONGO_URI=mongodb://127.0.0.1:27017/local_service_booking

# JWT Auth
JWT_SECRET=super_secret_jwt_key_local_service_booking_2026
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# CORS
CLIENT_URL=http://localhost:5173

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Upload Limits & Rate Limiting
MAX_FILE_UPLOAD=5242880
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000` connected to MongoDB!

---

## 📡 Comprehensive API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register customer/provider account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT |
| `POST` | `/api/auth/logout` | Public | Clear auth cookie & logout |
| `GET` | `/api/auth/me` | Protected | Fetch current logged-in user profile |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password using token |

### 🛠️ Services (`/api/services`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/services` | Public | List services with search, filter, sort & pagination |
| `GET` | `/api/services/:id` | Public | Get single service details |
| `POST` | `/api/services` | Provider/Admin | Create a new service offering |
| `PUT` | `/api/services/:id` | Provider/Admin | Update existing service |
| `DELETE` | `/api/services/:id` | Provider/Admin | Delete service |

### 📅 Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Customer | Create a new booking request |
| `GET` | `/api/bookings` | Protected | Get all bookings (role-aware filtering) |
| `GET` | `/api/bookings/customer` | Customer | Get customer's booking history |
| `GET` | `/api/bookings/provider` | Provider | Get provider's assigned bookings |
| `GET` | `/api/bookings/:id` | Protected | Get single booking details |
| `PUT` | `/api/bookings/:id/accept` | Provider/Admin | Accept pending booking |
| `PUT` | `/api/bookings/:id/reject` | Provider/Admin | Reject booking request |
| `PUT` | `/api/bookings/:id/start` | Provider/Admin | Mark service as in-progress |
| `PUT` | `/api/bookings/:id/complete` | Provider/Admin | Mark service as completed |
| `PUT` | `/api/bookings/:id/cancel` | Protected | Cancel booking request |

### ⭐ Reviews & Ratings (`/api/reviews`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reviews` | Customer | Submit review for completed booking |
| `GET` | `/api/reviews` | Public | List all reviews with pagination |
| `GET` | `/api/reviews/provider/:providerId` | Public | List reviews for a specific provider |
| `GET` | `/api/reviews/service/:serviceId` | Public | List reviews for a specific service |
| `PUT` | `/api/reviews/:id` | Customer | Update submitted review |
| `DELETE` | `/api/reviews/:id` | Customer/Admin| Delete review |

### 👤 Customer Dashboard (`/api/customer`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customer/dashboard` | Customer | Dashboard metrics, recent bookings & favorites |
| `GET` | `/api/customer/profile` | Customer | Get customer profile details |
| `PUT` | `/api/customer/profile` | Customer | Update customer profile |
| `GET` | `/api/customer/upcoming-bookings` | Customer | List upcoming active bookings |
| `GET` | `/api/customer/completed-bookings` | Customer | List completed bookings |
| `GET` | `/api/customer/cancelled-bookings` | Customer | List cancelled bookings |
| `GET` | `/api/customer/reviews` | Customer | List customer submitted reviews |
| `GET` | `/api/customer/notifications` | Customer | Get customer notifications |

### 💼 Provider Dashboard (`/api/provider`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/provider/dashboard` | Provider | Metrics, 6-month revenue analytics & recent activity |
| `GET` | `/api/provider/profile` | Provider | Get provider profile details |
| `PUT` | `/api/provider/profile` | Provider | Update business profile, hourly rate & skills |
| `GET` | `/api/provider/services` | Provider | List provider's services |
| `GET` | `/api/provider/bookings` | Provider | List provider's assigned bookings |
| `GET` | `/api/provider/reviews` | Provider | List provider reviews & average rating summary |
| `GET` | `/api/provider/earnings` | Provider | Earnings report & completed payout transactions |

### 👑 Admin Dashboard (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Admin | System analytics & monthly platform growth |
| `GET` | `/api/admin/users` | Admin | List all users (filter by role & status) |
| `PUT` | `/api/admin/users/:id/status` | Admin | Activate/deactivate user account |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete user account |
| `GET` | `/api/admin/providers` | Admin | List all providers |
| `PUT` | `/api/admin/providers/:id/verify` | Admin | Approve/reject provider verification status |
| `GET` | `/api/admin/services` | Admin | List all services |
| `PUT` | `/api/admin/services/:id/status` | Admin | Toggle service active/featured status |
| `GET` | `/api/admin/categories` | Admin | Manage categories |
| `POST` | `/api/admin/categories` | Admin | Create category |
| `GET` | `/api/admin/bookings` | Admin | Manage all bookings |
| `GET` | `/api/admin/reviews` | Admin | Manage & moderate reviews |
| `GET` | `/api/admin/payments` | Admin | View platform financial transaction records |
| `GET` | `/api/admin/contacts` | Admin | Manage support contact inquiries |

### 💳 Payments (`/api/payments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-intent` | Customer | Create Stripe payment intent for booking |
| `POST` | `/api/payments/verify` | Customer/Admin| Confirm payment & update booking status |
| `GET` | `/api/payments/history` | Protected | Payment transaction history |
| `POST` | `/api/payments/refund` | Admin | Process payment refund |

### 🖼️ File Uploads (`/api/upload`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/upload/profile` | Protected | Upload user avatar (Single) |
| `POST` | `/api/upload/provider-image` | Provider/Admin | Upload provider profile image |
| `POST` | `/api/upload/service-images/:serviceId`| Provider/Admin | Upload multiple service images (Max: 5) |
| `DELETE` | `/api/upload/image` | Protected | Delete image from Cloudinary |

### 🔔 Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Protected | List notifications with unread count |
| `GET` | `/api/notifications/unread-count`| Protected | Get count of unread notifications |
| `PUT` | `/api/notifications/:id/read` | Protected | Mark single notification as read |
| `PUT` | `/api/notifications/read-all` | Protected | Mark all notifications as read |
| `DELETE` | `/api/notifications/:id` | Protected | Delete a notification |
| `DELETE` | `/api/notifications/clear-all` | Protected | Clear all notifications |

### 📞 Contact & FAQs (`/api/contact` & `/api/faqs`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/contact` | Public | Submit support inquiry |
| `GET` | `/api/contact` | Admin | List support inquiries |
| `GET` | `/api/faqs` | Public | List active FAQs grouped by category |
| `POST` | `/api/faqs` | Admin | Create FAQ |
| `PUT` | `/api/faqs/:id` | Admin | Update FAQ |
| `DELETE` | `/api/faqs/:id` | Admin | Delete FAQ |

---

## 🔒 Standardized JSON Response Specification

Every API response follows a strict, consistent JSON format:

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Validation Error: Please check your input fields",
  "data": {
    "errors": [
      {
        "field": "email",
        "message": "Please enter a valid email address"
      }
    ]
  }
}
```
