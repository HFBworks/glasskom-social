#!/bin/bash

# GlassKom Social - Deployment Test Script
# This script tests the Docker deployment and verifies all services are working

set -e

echo "🚀 GlassKom Social - Deployment Test"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please update with your configuration.${NC}"
fi

# Check Docker
echo ""
echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose is installed${NC}"

# Build and start services
echo ""
echo "Building and starting Docker services..."
docker-compose up -d --build

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "Checking service status..."

# Check database
if docker-compose ps | grep -q "glasskom_db.*Up"; then
    echo -e "${GREEN}✅ Database is running${NC}"
else
    echo -e "${RED}❌ Database is not running${NC}"
fi

# Check API
if docker-compose ps | grep -q "glasskom_api.*Up"; then
    echo -e "${GREEN}✅ API is running${NC}"
else
    echo -e "${RED}❌ API is not running${NC}"
fi

# Check frontend
if docker-compose ps | grep -q "glasskom_frontend.*Up"; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
fi

# Test API health endpoint
echo ""
echo "Testing API health endpoint..."
sleep 5
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed (may still be starting up)${NC}"
fi

# Test frontend
echo ""
echo "Testing frontend..."
if curl -s http://localhost > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is not accessible yet${NC}"
fi

# Show logs
echo ""
echo "Recent logs:"
echo "============"
docker-compose logs --tail=20

# Final status
echo ""
echo "===================================="
echo -e "${GREEN}✅ Deployment test completed!${NC}"
echo ""
echo "Access your application at:"
echo "  - Frontend: http://localhost"
echo "  - API: http://localhost:3001"
echo "  - Database: localhost:5432"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo ""
