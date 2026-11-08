FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application
COPY server/ ./server/
COPY client/ ./client/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

# Expose port
EXPOSE ${PORT:-3000}

# Start application
CMD ["node", "server/index.js"]
