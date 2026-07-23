'use strict';

// Load environment variables at the top of application entry point
require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to MongoDB and start HTTP server with Socket.IO
const startServer = async () => {
  try {
    // Database connection
    await connectDB();

    // Create HTTP Server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server & Socket.IO running in ${NODE_ENV} mode on http://localhost:${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`❌ Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(`❌ Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated.');
      });
    });
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
