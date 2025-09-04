const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { 
  generalLimiter, 
  authLimiter, 
  securityHeaders, 
  securityLogger, 
  corsOptions, 
  sanitizeInput 
} = require('./middleware/security');
const { auditAuth, auditDataAccess } = require('./middleware/audit');
const authRoutes = require('./routes/auth');
const callRoutes = require('./routes/calls');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const voiceRoutes = require('./routes/voice');
const voiceProcessingPipeline = require('./services/voiceProcessingPipeline');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(compression());
app.use(securityLogger);
app.use(sanitizeInput);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'VoxAssist Backend'
  });
});

// Routes with audit middleware
app.use('/api/auth', auditAuth('auth'), authRoutes);
app.use('/api/calls', auditDataAccess('calls'), callRoutes);
app.use('/api/analytics', auditDataAccess('analytics'), analyticsRoutes);
app.use('/api/voice', auditDataAccess('voice'), voiceRoutes);
app.use('/webhooks', webhookRoutes);

// Socket.io for real-time communication
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-call', (callId) => {
    socket.join(`call-${callId}`);
    logger.info(`Client ${socket.id} joined call ${callId}`);
  });
  
  socket.on('leave-call', (callId) => {
    socket.leave(`call-${callId}`);
    logger.info(`Client ${socket.id} left call ${callId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Initialize voice processing pipeline with socket.io
voiceProcessingPipeline.setSocketIO(io);

// Make io available to routes and services
app.set('io', io);
module.exports = { io };

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`VoxAssist Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
