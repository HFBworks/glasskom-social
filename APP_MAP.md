
# 🗺️ App Hierarchy & Logic Map (VPS Supported)

## 📂 Directory Structure (Production)
- `/var/www/apps`
  - `docker-compose.yml`: Primary orchestration.
  - `uploads/`: Persistent user media storage (Mounted into Docker).
  - `logs/`: Application error and access logs.
  - `backend/`: Node.js/Express source code.
  - `frontend/`: Compiled React assets (served by Nginx).
  - `nginx/`: Host-side Nginx configuration.

## 🔄 Data Sync & Persistence
1. **Users**: Initial auth via Firebase. Profile data synced to local PostgreSQL via `/api/auth/sync`.
2. **Posts**: Stored in PostgreSQL. Media uploaded to VPS filesystem via `/api/upload`.
3. **Chat**: Real-time via Socket.IO. Messages persisted in PostgreSQL.
4. **AI**: State-less calls to Gemini for processing, then persisted to respective databases.

## 🛠️ Infrastructure Features
- **Dockerized API**: Scalable, isolated Node.js environment.
- **Reverse Proxy**: Nginx handles SSL and proxies requests to the appropriate service.
- **PWA Ready**: Offline capabilities and home-screen installation.
