# Quick Start Guide - Direct Messaging Backend

This guide will help you get the direct messaging backend up and running quickly.

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed (for containerized deployment)
- PostgreSQL 15+ (if running locally without Docker)

## Option 1: Docker Deployment (Recommended)

### 1. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

Required environment variables:
```env
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=glasskom
JWT_SECRET=your_jwt_secret_here
API_KEY=your_gemini_api_key_here
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Verify Installation

```bash
# Run the test script
chmod +x test-deployment.sh
./test-deployment.sh
```

Or manually:
```bash
# Test API health
curl http://localhost:3001/health

# Test frontend
curl http://localhost
```

### 4. Access Application

- Frontend: http://localhost
- API: http://localhost:3001
- Database: localhost:5432

## Option 2: Local Development

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL (if using Docker for DB only)
docker run -d \
  --name glasskom-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=glasskom \
  -p 5432:5432 \
  postgres:15-alpine

# Or use your local PostgreSQL instance
# and create a database named 'glasskom'
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env

# Edit .env with local settings
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=glasskom
DB_PORT=5432
JWT_SECRET=your_secret_here
PORT=3001
CLIENT_URL=http://localhost:5173
```

### 4. Start Backend

```bash
cd backend
npm run dev
```

The backend will:
- Start on port 3001
- Auto-create database tables from schema.sql
- Initialize Socket.io for real-time messaging

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 6. Configure Frontend

```bash
cd frontend
cp .env.example .env.local

# No special configuration needed for local dev
# The frontend will auto-detect localhost
```

### 7. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

## Testing the Messaging System

### 1. Create Test Users

You'll need to create user accounts through the app. The messaging system supports:

- Firebase authentication (for production)
- Local user creation (for development)

### 2. Test Direct Messaging

1. Open two browser windows
2. Login as different users
3. Navigate to Messages
4. Start a conversation
5. Test features:
   - ✅ Send messages
   - ✅ Edit messages
   - ✅ Delete messages
   - ✅ Add reactions
   - ✅ See typing indicators
   - ✅ Real-time updates

### 3. Test API Endpoints

```bash
# Get chats for a user
curl http://localhost:3001/api/chats/user/USER_ID

# Send a message
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "CHAT_ID",
    "senderId": "USER_ID",
    "content": "SGVsbG8gV29ybGQh"
  }'

# Add a reaction
curl -X POST http://localhost:3001/api/messages/MSG_ID/reactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "emoji": "👍"
  }'
```

## Database Schema

The database tables are automatically created on first run:

- `users` - User accounts
- `chats` - Chat metadata
- `chat_participants` - User membership in chats
- `messages` - Encrypted message content
- `message_reactions` - Emoji reactions
- `message_read_receipts` - Read status tracking
- `message_deletions` - Soft delete for users
- `typing_indicators` - Real-time typing status
- `user_encryption_keys` - E2E encryption keys

View the complete schema in `backend/schema.sql`

## Troubleshooting

### Backend won't start

```bash
# Check if port 3001 is already in use
lsof -i :3001

# Check logs
docker-compose logs api  # for Docker
# or check terminal output for local dev
```

### Database connection errors

```bash
# Verify database is running
docker-compose ps db  # for Docker
# or
psql -h localhost -U postgres -d glasskom  # for local

# Check environment variables
cat .env
```

### Socket.io connection issues

- Verify CORS settings in backend/src/app.js
- Check CLIENT_URL environment variable
- Ensure firewall allows port 3001
- Check browser console for errors

### Frontend can't connect to backend

- Verify API_URL in frontend service
- Check if backend is running: `curl http://localhost:3001/health`
- Verify CORS configuration
- Check browser network tab for failed requests

## Next Steps

1. **Security**: Implement proper JWT authentication
2. **Encryption**: Upgrade to Signal Protocol for E2E encryption
3. **Features**: Add file attachments, voice messages
4. **Scaling**: Add Redis for session management
5. **Monitoring**: Set up logging and error tracking

## Production Deployment

For production deployment on Hostinger VPS:

1. Follow the [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) guide
2. Set up SSL certificates with Let's Encrypt
3. Configure nginx reverse proxy
4. Set secure environment variables
5. Enable firewall rules
6. Set up backup strategy

See [MESSAGING_FEATURE.md](MESSAGING_FEATURE.md) for detailed feature documentation.

## Support

For issues or questions:
- Check the [MESSAGING_FEATURE.md](MESSAGING_FEATURE.md) documentation
- Review backend logs: `docker-compose logs api`
- Check database connections
- Verify environment variables

## Development Tips

- Use `npm run dev` for hot-reloading in development
- Check browser console for frontend errors
- Use `docker-compose logs -f api` to monitor backend
- Test with multiple browser windows/incognito mode
- Use PostgreSQL client to inspect database state

## Performance Optimization

- Enable connection pooling (already configured)
- Add database indexes (already in schema)
- Use Redis for caching (optional)
- Enable gzip compression
- Optimize Socket.io rooms
- Consider message pagination for large chats
QUICKSTART.md
