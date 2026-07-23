'use strict';

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO with HTTP Server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
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
