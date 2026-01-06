# GlassKom Social - Docker Deployment Guide

This application is fully containerized and ready to deploy with Docker and Dockploy.

## 🐳 Architecture

The application consists of 3 services:
- **Frontend**: React + Vite app served by Nginx (Port 80)
- **API**: Node.js/Express backend (Port 3001)
- **Database**: PostgreSQL 15 (Port 5432)

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose V2
- Git

## 🚀 Quick Start with Dockploy

### 1. Clone the Repository
```bash
git clone https://github.com/HFBworks/glasskom-social.git
cd glasskom-social
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and set your values:
```env
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=glasskom
JWT_SECRET=your_jwt_secret_key
API_KEY=your_api_key
CLIENT_URL=http://your-domain.com
API_URL=http://your-domain.com/api
```

### 3. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Dockploy Configuration

When deploying via Dockploy:

1. **Repository**: `https://github.com/HFBworks/glasskom-social.git`
2. **Branch**: `main`
3. **Docker Compose File**: `docker-compose.yml` (root directory)
4. **Environment Variables**: Set in Dockploy UI or .env file
5. **Port Mapping**:
   - Frontend: 80 → Your domain
   - API: 3001 → Your domain/api (with reverse proxy)
   - Database: 5432 (internal only)

### Required Environment Variables in Dockploy
```
DB_USER=postgres
DB_PASSWORD=<secure-password>
DB_NAME=glasskom
JWT_SECRET=<random-secret>
API_KEY=<your-api-key>
CLIENT_URL=https://your-domain.com
API_URL=https://your-domain.com
```

## 🏗️ Service Details

### Frontend Service
- **Build Context**: Root directory
- **Dockerfile**: `./Dockerfile`
- **Port**: 80
- **Dependencies**: API service
- **Health Check**: HTTP GET on port 80

### API Service
- **Build Context**: `./backend`
- **Dockerfile**: `./backend/Dockerfile`
- **Port**: 3001
- **Dependencies**: Database service
- **Health Check**: HTTP GET `/health`
- **Volumes**: `./uploads:/app/uploads`

### Database Service
- **Image**: `postgres:15-alpine`
- **Port**: 5432
- **Volumes**: Named volume `pgdata`
- **Health Check**: `pg_isready`

## 📦 Build Process

### Frontend Build
1. Install dependencies with npm
2. Build with Vite
3. Copy build artifacts to Nginx
4. Serve on port 80

### Backend Build
1. Install production dependencies
2. Copy source code
3. Create uploads directory
4. Start with `npm start`

## 🔐 Security Considerations

1. **Change default passwords** in production
2. **Set strong JWT_SECRET** (minimum 32 characters)
3. **Configure firewall** to restrict database port
4. **Use HTTPS** in production (configure reverse proxy)
5. **Set NODE_ENV=production** for backend

## 🌐 Networking

All services communicate via the `glasskom-network` bridge network:
- Services can reach each other by service name
- Database is accessible at `db:5432` from API
- API is accessible at `api:3001` from frontend

## 💾 Data Persistence

- **Database**: Data stored in `pgdata` volume
- **Uploads**: Mapped to `./uploads` directory

## 🔍 Troubleshooting

### Check Service Health
```bash
docker-compose ps
docker-compose logs api
docker-compose logs frontend
docker-compose logs db
```

### Database Connection Issues
```bash
# Check if database is ready
docker-compose exec db pg_isready -U postgres

# Connect to database
docker-compose exec db psql -U postgres -d glasskom
```

### Rebuild Services
```bash
# Rebuild all services
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache api
```

### Reset Everything
```bash
# Stop and remove all containers, volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up -d --build
```

## 📊 Monitoring

Health check endpoints:
- Frontend: `http://localhost:80/`
- API: `http://localhost:3001/health`
- Database: Internal health check via `pg_isready`

## 🔄 Updates and Maintenance

### Pull Latest Changes
```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup Database
```bash
docker-compose exec db pg_dump -U postgres glasskom > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T db psql -U postgres glasskom
```

## 📝 Notes

- First startup may take 2-3 minutes as services initialize
- Database schema is automatically created on first run
- Uploads directory is created automatically if it doesn't exist
- All services have automatic restart policy enabled

## 🆘 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify environment variables: `docker-compose config`
- Rebuild from scratch if needed: `docker-compose down -v && docker-compose up -d --build`
