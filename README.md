<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GlassKom Social

A modern, full-stack social media platform with AI-powered features, real-time messaging, and comprehensive social interactions.

## 🚀 Quick Start

### Docker Deployment (Recommended)

**Prerequisites:** Docker & Docker Compose

```bash
# Clone the repository
git clone https://github.com/HFBworks/glasskom-social.git
cd glasskom-social

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d
```

Access the app at `http://localhost`

📚 **Full Docker Guide:** See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)

### Dockploy Deployment

1. Connect your Dockploy instance to this repository
2. Set environment variables in Dockploy UI
3. Deploy using `docker-compose.yml`
4. Configure reverse proxy for your domain

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for detailed Dockploy setup.

## 🛠️ Local Development

**Prerequisites:** Node.js 18+

### Frontend
```bash
npm install
cp .env.example .env.local
# Set GEMINI_API_KEY and other variables
npm run dev
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure database and JWT_SECRET
npm run dev
```

View your app in AI Studio: https://ai.studio/apps/drive/1024kKZxqSz-StTQ4w9189pVTRoze1bWP

## 📦 Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS
- **Backend:** Node.js, Express, Socket.io
- **Database:** PostgreSQL
- **AI:** Google Gemini AI
- **Deployment:** Docker, Nginx

## 🌟 Features

- Real-time messaging and notifications
- AI-powered assistant
- Post creation with media uploads
- Social interactions (likes, comments, follows)
- User profiles and communities
- Progressive Web App (PWA)

## 📖 Documentation

- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md)
- [Local Setup Guide](LOCAL_SETUP.md)
- [App Structure](APP_MAP.md)

## 🔧 Configuration

Key environment variables:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials
- `JWT_SECRET` - Authentication secret
- `API_KEY` - Gemini API key
- `CLIENT_URL` - Frontend URL
- `API_URL` - Backend API URL

## 📝 License

See LICENSE file for details.
