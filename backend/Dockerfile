# VoxAssist Backend Dockerfile
FROM node:24.6.0-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci for better compatibility)
RUN npm install --production --no-optional

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source code
COPY src/ ./src/

# Create logs directory
RUN mkdir -p logs

# Expose port (updated to match server configuration)
EXPOSE 5005

# Health check (updated port)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
