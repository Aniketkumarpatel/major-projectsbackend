'use strict';

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO with HTTP Server
 */
const initSocket = (server) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  if (process.env.CLIENT_URL) {
    const origins = process.env.CLIENT_URL.split(',').map((o) => o.trim());
    origins.forEach((origin) => {
      if (origin) {
        allowedOrigins.push(origin);
        if (origin.endsWith('/')) {
          allowedOrigins.push(origin.slice(0, -1));
        } else {
          allowedOrigins.push(origin + '/');
        }
      }
    });
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Socket.IO clients might connect without an origin header in some environments
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket Connected: ${socket.id}`);

    // User joins personal room and role room
    socket.on('join', ({ userId, role }) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 Socket ${socket.id} joined room user_${userId}`);
      }
      if (role) {
        socket.join(`role_${role}`);
        console.log(`👑 Socket ${socket.id} joined room role_${role}`);
      }
    });

    socket.on('leave', ({ userId, role }) => {
      if (userId) socket.leave(`user_${userId}`);
      if (role) socket.leave(`role_${role}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket Disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized yet');
    return null;
  }
  return io;
};

/**
 * Send real-time notification to specific user and/or role
 */
const sendRealtimeNotification = (recipientId, role, notification) => {
  if (!io) return;

  if (recipientId) {
    io.to(`user_${recipientId}`).emit('notification', notification);
    io.to(`user_${recipientId}`).emit(notification.type || 'new_notification', notification);
  }

  if (role) {
    io.to(`role_${role}`).emit('notification', notification);
    io.to(`role_${role}`).emit(notification.type || 'new_notification', notification);
  }
};

module.exports = {
  initSocket,
  getIO,
  sendRealtimeNotification,
};
