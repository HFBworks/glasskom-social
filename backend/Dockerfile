# Backend Dockerfile for GlassKom Social API
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

# Expose API port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
