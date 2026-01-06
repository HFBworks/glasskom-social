# Direct Messaging Feature

## Overview
Full-featured real-time messaging system with end-to-end encryption support for the GlassKom Social platform.

## Features

### ✅ Core Messaging
- **Direct Messaging**: One-on-one conversations between users
- **Group Chats**: Multi-user conversations
- **AI Assistant Chat**: Built-in AI chatbot support
- **Send Messages**: Text and voice message support
- **Edit Messages**: Update sent messages
- **Delete Messages**: 
  - Delete for yourself
  - Delete for everyone (if you're the sender)

### ✅ Real-time Updates
- **Socket.io Integration**: Live message delivery
- **Typing Indicators**: See when others are typing
- **Read Receipts**: Know when messages are read
- **Live Reactions**: See reactions in real-time

### ✅ Message Reactions
- Quick emoji reactions (👍, ❤️, 😂, 😮, 😢, 🙏, 🎉, 🔥)
- Multiple users can react to the same message
- Add/remove reactions

### ✅ End-to-End Encryption
- **Client-side Encryption**: Messages encrypted before sending
- **Base64 Encoding**: Simple encryption for demo (can be upgraded)
- **AES-256-GCM**: Server-side encryption utilities available
- **RSA Key Pairs**: Support for asymmetric encryption

## Architecture

### Backend (Node.js + Express + Socket.io)
```
backend/
├── src/
│   ├── controllers/
│   │   └── messagesController.js    # Message CRUD operations
│   ├── routes/
│   │   └── messages.js               # API endpoints
│   ├── utils/
│   │   ├── encryption.js             # Encryption utilities
│   │   └── initDb.js                 # Database initialization
│   └── app.js                        # Main app with Socket.io
└── schema.sql                        # Database schema
```

### Frontend (React + TypeScript + Socket.io Client)
```
frontend/
├── services/
│   └── messagingService.ts          # Backend API integration
└── components/
    └── MessagesViewEnhanced.tsx     # Full-featured chat UI
```

### Database Schema
- **chats**: Chat metadata
- **chat_participants**: User membership in chats
- **messages**: Encrypted message content
- **message_reactions**: Emoji reactions
- **message_read_receipts**: Read status tracking
- **message_deletions**: Soft delete for users
- **typing_indicators**: Real-time typing status
- **user_encryption_keys**: E2E encryption keys

## API Endpoints

### Chat Management
- `GET /api/chats/user/:userId` - Get all chats for a user
- `GET /api/chats/:chatId` - Get chat details with messages
- `POST /api/chats` - Create or get existing chat

### Messages
- `POST /api/messages` - Send a message
- `PUT /api/messages/:messageId` - Edit a message
- `DELETE /api/messages/:messageId` - Delete a message

### Reactions
- `POST /api/messages/:messageId/reactions` - Add reaction
- `DELETE /api/messages/:messageId/reactions` - Remove reaction

### Read Receipts & Typing
- `POST /api/chats/:chatId/read` - Mark messages as read
- `POST /api/chats/:chatId/typing` - Update typing status
- `GET /api/chats/:chatId/typing` - Get typing users

## Socket.io Events

### Client → Server
- `join_user` - Join user's personal room
- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `new_message` - Broadcast new message
- `message_edited` - Broadcast message edit
- `message_deleted` - Broadcast message deletion
- `reaction_added` - Broadcast reaction addition
- `reaction_removed` - Broadcast reaction removal
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `messages_read` - Broadcast read receipt

### Server → Client
- `message_received` - New message in chat
- `message_updated` - Message was edited
- `message_removed` - Message was deleted
- `reaction_update` - Reaction was added/removed
- `user_typing` - User typing status changed
- `messages_read_by` - Messages read by user

## Usage Example

### Backend
```javascript
import messagingService from './services/messagingService';

// Connect to socket
messagingService.connectSocket(userId);

// Send a message
const message = await messagingService.sendMessage(
  chatId,
  userId,
  encryptedContent
);

// Add reaction
await messagingService.addReaction(messageId, userId, '👍', chatId);

// Edit message
await messagingService.editMessage(messageId, userId, newContent, chatId);

// Delete message
await messagingService.deleteMessage(messageId, userId, chatId, true);
```

### Real-time Listeners
```javascript
// Listen for new messages
messagingService.onMessageReceived((message) => {
  console.log('New message:', message);
});

// Listen for typing indicators
messagingService.onUserTyping(({ userId, isTyping }) => {
  console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
});
```

## Security

### Current Implementation
- **Base64 Encoding**: Simple client-side encoding
- **HTTPS Required**: For production deployment
- **JWT Authentication**: Token-based auth (when implemented)

### Recommended Enhancements
1. **Signal Protocol**: Industry-standard E2E encryption
2. **Perfect Forward Secrecy**: New keys for each session
3. **Key Exchange**: Diffie-Hellman for secure key sharing
4. **Message Authentication**: Verify message integrity
5. **Double Ratchet**: Advanced key rotation

## Docker Deployment

The messaging system is fully Docker-compatible:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Restart services
docker-compose restart api
```

## Environment Variables

Required for backend:
```env
DB_HOST=db
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=glasskom
DB_PORT=5432
JWT_SECRET=your_secret
PORT=3001
CLIENT_URL=http://localhost
```

## Hostinger VPS Compatibility

✅ **Compatible with Hostinger VPS Docker Manager**

The application is designed to work with:
- Docker Compose
- Standard PostgreSQL database
- Port mapping (3001 for API, 80 for frontend)
- Volume mounting for uploads
- Environment variable configuration
- Health checks for services

### VPS Deployment Steps
1. Set up Docker on Hostinger VPS
2. Clone repository
3. Configure `.env` file
4. Run `docker-compose up -d`
5. Configure reverse proxy (nginx) for domain
6. Set up SSL certificates (Let's Encrypt)

## Performance Considerations

- **Connection Pooling**: PostgreSQL connection pool
- **Indexed Queries**: Database indexes on frequently queried fields
- **Socket.io Rooms**: Efficient event broadcasting
- **Lazy Loading**: Messages loaded on-demand
- **Pagination**: Support for loading older messages

## Future Enhancements

- [ ] Voice and video messages
- [ ] File attachments
- [ ] Message search
- [ ] Mentions and notifications
- [ ] Message forwarding
- [ ] Chat archiving
- [ ] Delivery status (sent, delivered, read)
- [ ] Message threading/replies
- [ ] Pinned messages
- [ ] Chat folders (inbox, archived, requests)
- [ ] Block/report functionality
- [ ] Group admin controls

## Testing

### Manual Testing
1. Start backend: `npm run dev` in backend folder
2. Start frontend: `npm run dev` in frontend folder
3. Open two browser windows
4. Login as different users
5. Start a conversation
6. Test features:
   - Send messages
   - Edit messages
   - Delete messages
   - Add reactions
   - Check typing indicators

### With Docker
```bash
docker-compose up --build
# Access at http://localhost
```

## Troubleshooting

### Socket.io not connecting
- Check CORS settings in backend
- Verify CLIENT_URL environment variable
- Check firewall rules (port 3001)

### Messages not encrypting
- Ensure encryption functions are imported
- Check browser console for errors
- Verify message content format

### Database errors
- Run schema.sql to initialize tables
- Check database connection settings
- Verify PostgreSQL is running

## License

Part of GlassKom Social platform.
