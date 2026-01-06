import { pool } from '../config/db.js';

// Get all chats for a user
export const getUserChats = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT c.*, 
        (SELECT MAX(m.created_at) FROM messages m WHERE m.chat_id = c.id) as last_message_at,
        (SELECT COUNT(*) FROM messages m 
         LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = $1
         WHERE m.chat_id = c.id AND m.sender_id != $1 AND mrr.id IS NULL
        ) as unread_count
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = $1
      ORDER BY last_message_at DESC NULLS LAST
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

// Get chat by ID with messages
export const getChatById = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.query;
  
  try {
    // Get chat details
    const chatResult = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Get participants
    const participantsResult = await pool.query(
      'SELECT user_id, status FROM chat_participants WHERE chat_id = $1',
      [chatId]
    );
    
    // Get messages
    const messagesResult = await pool.query(`
      SELECT m.*,
        COALESCE(
          (SELECT json_agg(json_build_object('userId', user_id, 'readAt', read_at))
           FROM message_read_receipts WHERE message_id = m.id),
          '[]'::json
        ) as read_by,
        COALESCE(
          (SELECT json_agg(json_build_object('emoji', emoji, 'userId', user_id))
           FROM message_reactions WHERE message_id = m.id),
          '[]'::json
        ) as reactions,
        COALESCE(
          (SELECT json_agg(user_id) FROM message_deletions WHERE message_id = m.id),
          '[]'::json
        ) as deleted_for
      FROM messages m
      WHERE m.chat_id = $1 AND (
        m.is_deleted_everyone = false
        AND NOT EXISTS (
          SELECT 1 FROM message_deletions md 
          WHERE md.message_id = m.id AND md.user_id = $2
        )
      )
      ORDER BY m.created_at ASC
    `, [chatId, userId]);
    
    const chat = {
      ...chatResult.rows[0],
      participantIds: participantsResult.rows.map(p => p.user_id),
      participantStatus: participantsResult.rows.reduce((acc, p) => {
        acc[p.user_id] = p.status;
        return acc;
      }, {}),
      messages: messagesResult.rows
    };
    
    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

// Create or get existing chat
export const createOrGetChat = async (req, res) => {
  const { participantIds, type = 'direct', name, avatarUrl } = req.body;
  
  try {
    // For direct chats, check if chat already exists
    if (type === 'direct' && participantIds.length === 2) {
      const existingChat = await pool.query(`
        SELECT c.* FROM chats c
        WHERE c.type = 'direct'
        AND c.id IN (
          SELECT chat_id FROM chat_participants 
          WHERE user_id = $1
          GROUP BY chat_id
          HAVING COUNT(DISTINCT user_id) = 2
        )
        AND c.id IN (
          SELECT chat_id FROM chat_participants 
          WHERE user_id = $2
        )
      `, participantIds);
      
      if (existingChat.rows.length > 0) {
        return res.json(existingChat.rows[0]);
      }
    }
    
    // Create new chat
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.query(
      'INSERT INTO chats (id, type, name, avatar_url) VALUES ($1, $2, $3, $4)',
      [chatId, type, name, avatarUrl]
    );
    
    // Add participants
    for (const userId of participantIds) {
      await pool.query(
        'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
        [chatId, userId]
      );
    }
    
    const result = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  const { chatId, senderId, content, isVoice = false } = req.body;
  
  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await pool.query(
      'INSERT INTO messages (id, chat_id, sender_id, content, is_voice) VALUES ($1, $2, $3, $4, $5)',
      [messageId, chatId, senderId, content, isVoice]
    );
    
    // Mark as read by sender
    await pool.query(
      'INSERT INTO message_read_receipts (message_id, user_id) VALUES ($1, $2)',
      [messageId, senderId]
    );
    
    // Update chat timestamp
    await pool.query(
      'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [chatId]
    );
    
    const result = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content, userId } = req.body;
  
  try {
    // Verify user owns the message
    const checkResult = await pool.query(
      'SELECT sender_id FROM messages WHERE id = $1',
      [messageId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (checkResult.rows[0].sender_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }
    
    await pool.query(
      'UPDATE messages SET content = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP WHERE id = $2',
      [content, messageId]
    );
    
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { userId, deleteForEveryone = false } = req.body;
  
  try {
    // Verify user owns the message
    const checkResult = await pool.query(
      'SELECT sender_id, chat_id FROM messages WHERE id = $1',
      [messageId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = checkResult.rows[0];
    
    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (message.sender_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete for everyone' });
      }
      
      await pool.query(
        'UPDATE messages SET is_deleted_everyone = true WHERE id = $1',
        [messageId]
      );
    } else {
      // Delete for self
      await pool.query(
        'INSERT INTO message_deletions (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [messageId, userId]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Add reaction to message
export const addReaction = async (req, res) => {
  const { messageId } = req.params;
  const { userId, emoji } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT (message_id, user_id, emoji) DO NOTHING',
      [messageId, userId, emoji]
    );
    
    const result = await pool.query(
      'SELECT emoji, user_id FROM message_reactions WHERE message_id = $1',
      [messageId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

// Remove reaction from message
export const removeReaction = async (req, res) => {
  const { messageId } = req.params;
  const { userId, emoji } = req.body;
  
  try {
    await pool.query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );
    
    const result = await pool.query(
      'SELECT emoji, user_id FROM message_reactions WHERE message_id = $1',
      [messageId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  
  try {
    // Get all unread messages in the chat
    const messagesResult = await pool.query(
      `SELECT m.id FROM messages m
       LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = $1
       WHERE m.chat_id = $2 AND m.sender_id != $1 AND mrr.id IS NULL`,
      [userId, chatId]
    );
    
    // Mark all as read
    for (const msg of messagesResult.rows) {
      await pool.query(
        'INSERT INTO message_read_receipts (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [msg.id, userId]
      );
    }
    
    res.json({ success: true, markedCount: messagesResult.rows.length });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Update typing status
export const updateTypingStatus = async (req, res) => {
  const { chatId } = req.params;
  const { userId, isTyping } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO typing_indicators (chat_id, user_id, is_typing, last_updated)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (chat_id, user_id)
       DO UPDATE SET is_typing = $3, last_updated = CURRENT_TIMESTAMP`,
      [chatId, userId, isTyping]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    res.status(500).json({ error: 'Failed to update typing status' });
  }
};

// Get typing users in a chat
export const getTypingUsers = async (req, res) => {
  const { chatId } = req.params;
  
  try {
    // Get typing indicators that were updated in the last 5 seconds
    const result = await pool.query(
      `SELECT user_id FROM typing_indicators 
       WHERE chat_id = $1 AND is_typing = true 
       AND last_updated > NOW() - INTERVAL '5 seconds'`,
      [chatId]
    );
    
    res.json(result.rows.map(r => r.user_id));
  } catch (error) {
    console.error('Error getting typing users:', error);
    res.status(500).json({ error: 'Failed to get typing users' });
  }
};
