import express from 'express';
import {
  getUserChats,
  getChatById,
  createOrGetChat,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessagesAsRead,
  updateTypingStatus,
  getTypingUsers
} from '../controllers/messagesController.js';
import { readLimiter, messageLimiter, reactionLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Chat routes - with read limiter
router.get('/chats/user/:userId', readLimiter, getUserChats);
router.get('/chats/:chatId', readLimiter, getChatById);
router.post('/chats', messageLimiter, createOrGetChat);

// Message routes - with message limiter
router.post('/messages', messageLimiter, sendMessage);
router.put('/messages/:messageId', messageLimiter, editMessage);
router.delete('/messages/:messageId', messageLimiter, deleteMessage);

// Reaction routes - with reaction limiter
router.post('/messages/:messageId/reactions', reactionLimiter, addReaction);
router.delete('/messages/:messageId/reactions', reactionLimiter, removeReaction);

// Read receipts - with read limiter
router.post('/chats/:chatId/read', readLimiter, markMessagesAsRead);

// Typing indicators - with reaction limiter (similar frequency)
router.post('/chats/:chatId/typing', reactionLimiter, updateTypingStatus);
router.get('/chats/:chatId/typing', readLimiter, getTypingUsers);

export default router;

backend/src/routes/messages.js
