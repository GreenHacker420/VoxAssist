const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const { initializeDatabase } = require('./database/prisma');
const { errorHandler } = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { initializeWebSocketServer } = require('./websocket/callMonitoring');
const {
  securityHeaders,
  securityLogger,
  corsOptions,
  sanitizeInput
} = require('./middleware/security');
const { auditAuth, auditDataAccess } = require('./middleware/audit');
const authRoutes = require('./routes/auth');
const callRoutes = require('./routes/calls');
const campaignsRoutes = require('./routes/campaigns');
const contactsRoutes = require('./routes/contacts');
const scriptsRoutes = require('./routes/scripts');
const analyticsRoutes = require('./routes/analytics');
const advancedAnalyticsRoutes = require('./routes/advancedAnalytics');
const crmRoutes = require('./routes/crm');
const mobileRoutes = require('./routes/mobile');
const webhookRoutes = require('./routes/webhooks');
const voiceRoutes = require('./routes/voice');
const i18nRoutes = require('./routes/i18n');
const providersRoutes = require('./routes/providers');
const billingRoutes = require('./routes/billing');
const surveyRoutes = require('./routes/survey');
const settingsRoutes = require('./routes/settings');
const widgetRoutes = require('./routes/widgetRoutes');
const embedRoutes = require('./routes/embed');
const gdprRoutes = require('./routes/gdprRoutes');
const whatsappRoutes = require('./routes/whatsapp');
const websiteAnalysisRoutes = require('./routes/websiteAnalysis');
const demoCallRoutes = require('./routes/demoCalls');
const speechRoutes = require('./routes/speech');

// Functional services
const voiceProcessingPipeline = require('./services/voiceProcessingPipeline');
const healthMonitoring = require('./services/healthMonitoring');
const maximIntegration = require('./services/maximIntegration');
const callQualityMonitoring = require('./services/callQualityMonitoring');
const WidgetWebSocketHandler = require('./services/WidgetWebSocketHandler');
const GDPRComplianceMiddleware = require('./middleware/gdprCompliance');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (widget.js)
app.use('/static', express.static('src/public'));

// Serve audio files for voice interaction
app.use('/audio', express.static('public/audio'));
app.use("/", (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'VoxAssist Backend'
  });
});

// Test audio generation endpoint
app.post('/api/test-audio', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const demoCallService = require('./services/demoCallService');
    const audioResult = await demoCallService.generateAIAudio(text);

    if (audioResult && audioResult.audioData) {
      res.json({
        success: true,
        audioData: audioResult.audioData,
        contentType: audioResult.contentType,
        size: audioResult.audioData.length
      });
    } else {
      res.json({
        success: false,
        error: 'Failed to generate audio'
      });
    }
  } catch (error) {
    console.error('Test audio generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Performance monitoring endpoint
app.get('/api/performance-report', async (req, res) => {
  try {
    const demoCallService = require('./services/demoCallService');
    const report = demoCallService.getPerformanceReport();
    res.json(report);
  } catch (error) {
    logger.error('Performance report endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes with audit middleware
app.use('/api/auth', auditAuth('auth'), authRoutes);
app.use('/api/calls', auditDataAccess('calls'), callRoutes);
app.use('/api/campaigns', auditDataAccess('campaigns'), campaignsRoutes);
app.use('/api/contacts', auditDataAccess('contacts'), contactsRoutes);
app.use('/api/scripts', auditDataAccess('scripts'), scriptsRoutes);
app.use('/api/analytics', auditDataAccess('analytics'), analyticsRoutes);
app.use('/api/advanced-analytics', auditDataAccess('advanced-analytics'), advancedAnalyticsRoutes);
app.use('/api/crm', auditDataAccess('crm'), crmRoutes);
app.use('/api/voice', auditDataAccess('voice'), voiceRoutes);
app.use('/api/providers', auditDataAccess('providers'), providersRoutes);
app.use('/api/billing', auditDataAccess('billing'), billingRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/i18n', i18nRoutes);
app.use('/api/widgets', auditDataAccess('widgets'), widgetRoutes);
app.use('/embed', embedRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/whatsapp', auditDataAccess('whatsapp'), whatsappRoutes);
app.use('/api/website-analysis', auditDataAccess('website-analysis'), websiteAnalysisRoutes);
app.use('/api/demo-calls', auditDataAccess('demo-calls'), demoCallRoutes);
app.use('/api/speech', auditDataAccess('speech'), speechRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/webhooks', webhookRoutes);

// Initialize Widget WebSocket Handler
let widgetWebSocketHandler;

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

// Initialize widget WebSocket namespace
const widgetNamespace = io.of('/widget');
widgetWebSocketHandler = new WidgetWebSocketHandler(widgetNamespace);

// Initialize functional services
const initializeServices = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize voice processing pipeline with socket.io
    voiceProcessingPipeline.setSocketIO(io);
    logger.info('Voice processing pipeline initialized');

    // Initialize health monitoring
    await healthMonitoring.startMonitoring();
    logger.info('Health monitoring started');

    // Initialize call quality monitoring
    await callQualityMonitoring.startQualityMonitoring();
    logger.info('Call quality monitoring started');

    // Initialize Maxim hardware integration
    try {
      if (!maximIntegration.isInitialized()) {
        await maximIntegration.initialize();
        logger.info('Maxim hardware integration initialized');
      } else {
        logger.info('Maxim hardware integration already initialized');
      }
    } catch (error) {
      logger.warn('Maxim hardware not available:', error.message);
    }

    // Initialize GDPR compliance
    GDPRComplianceMiddleware.initialize();
    logger.info('GDPR compliance middleware initialized');

    logger.info('All functional services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Make io available to routes and services
app.set('io', io);
module.exports = { io };

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server with functional services
const startServer = async () => {
  try {
    await initializeServices();
    
    // Initialize WebSocket server for real-time call monitoring
    const wss = initializeWebSocketServer(server);
    logger.info('WebSocket server initialized for call monitoring');
    
    server.listen(PORT, () => {
      logger.info(`VoxAssist Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info('All functional services are operational');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
