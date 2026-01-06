import { Server, Socket } from 'socket.io';
import { db, redisClient } from './database';

export const initializeSocketManager = (io: Server) => {
  
  // Middleware for Socket Auth
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      // Verify JWT here
      // socket.data.userId = decoded.id;
      next();
    } else {
      next(new Error("Unauthorized"));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    console.log(`User connected: ${userId}`);

    // Update presence in Redis
    await redisClient.set(`user:${userId}:status`, 'online');
    socket.join(`user:${userId}`); // Personal room for notifications

    // 1. Join Rooms (Conversations)
    socket.on('join_conversations', async (conversationIds: string[]) => {
      conversationIds.forEach(id => socket.join(`chat:${id}`));
    });

    // 2. Handle New Message
    socket.on('send_message', async (payload) => {
      const { conversationId, content, senderId } = payload;
      
      try {
        // Save to DB (Persistent)
        const result = await db.query(
          `INSERT INTO messages (conversation_id, sender_id, content_encrypted) 
           VALUES ($1, $2, $3) RETURNING *`,
          [conversationId, senderId, content]
        );
        const newMessage = result.rows[0];

        // Fan-out to Room (Realtime)
        io.to(`chat:${conversationId}`).emit('new_message', newMessage);

        // Send Push Notification via Queue (Pseudo-code)
        // await notificationQueue.add('push_notify', { ... });
        
      } catch (err) {
        console.error('Message save failed', err);
        socket.emit('error', 'Message failed to send');
      }
    });

    // 3. Handle Typing Indicators (Ephemeral - Redis only)
    socket.on('typing_start', (conversationId) => {
      socket.to(`chat:${conversationId}`).emit('user_typing', { userId, conversationId });
    });

    // 4. Handle Disconnect
    socket.on('disconnect', async () => {
      await redisClient.del(`user:${userId}:status`);
      // Update last seen in DB
      await db.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]);
    });
  });
};
