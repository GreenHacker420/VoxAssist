const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Initialize Prisma Client
const prisma = new PrismaClient();

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL database connected successfully via Prisma');
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection test successful');
    
    return prisma;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

// Graceful shutdown
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  prisma,
  initializeDatabase,
  disconnectDatabase,
};
