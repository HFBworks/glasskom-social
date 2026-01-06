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

const router = express.Router();

// Chat routes
router.get('/chats/user/:userId', getUserChats);
router.get('/chats/:chatId', getChatById);
router.post('/chats', createOrGetChat);

// Message routes
router.post('/messages', sendMessage);
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);

// Reaction routes
router.post('/messages/:messageId/reactions', addReaction);
router.delete('/messages/:messageId/reactions', removeReaction);

// Read receipts
router.post('/chats/:chatId/read', markMessagesAsRead);

// Typing indicators
router.post('/chats/:chatId/typing', updateTypingStatus);
router.get('/chats/:chatId/typing', getTypingUsers);

export default router;
backend/src/routes/messages.js
