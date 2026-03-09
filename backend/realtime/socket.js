import { Server } from 'socket.io';

let ioInstance = null;

export function initSocket(httpServer, options) {
  ioInstance = new Server(httpServer, options);

  ioInstance.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => socket.join(`room:${roomId}`));
    socket.on('leaveRoom', (roomId) => socket.leave(`room:${roomId}`));

    // Chat events
    socket.on('joinChat', (threadId) => {
      socket.join(`chat:${threadId}`);
      console.log(`👤 Socket ${socket.id} joined chat:${threadId}`);
    });

    socket.on('leaveChat', (threadId) => {
      socket.leave(`chat:${threadId}`);
    });

    socket.on('sendMessage', (data) => {
      // data: { threadId, message }
      ioInstance.to(`chat:${data.threadId}`).emit('newMessage', data.message);
    });
  });

  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    // Return a dummy object to prevent crashes in environments where Socket.IO isn't supported (e.g., Vercel Serverless)
    return {
      emit: () => { },
      to: () => ({ emit: () => { } }),
      of: () => getIO(), // Support chained calls like getIO().of('/').emit(...)
      in: () => ({ emit: () => { } })
    };
  }
  return ioInstance;
}


