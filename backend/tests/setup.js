// Test setup and configuration
require('dotenv').config({ path: '.env.test' });

// Mock database connection for tests
jest.mock('../src/database/connection', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
  getPool: jest.fn(),
  getRedis: jest.fn(),
  setCache: jest.fn(),
  getCache: jest.fn(),
  deleteCache: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  initializeDatabase: jest.fn().mockResolvedValue({
    query: jest.fn(),
    getConnection: jest.fn(),
    getPool: jest.fn(),
    getRedis: jest.fn(),
    setCache: jest.fn(),
    getCache: jest.fn(),
    deleteCache: jest.fn(),
    disconnect: jest.fn(),
    isConnected: () => true
  }),
  isConnected: () => true
}));

// Mock functional services
jest.mock('../src/services/geminiService', () => ({
  processCustomerQuery: jest.fn(),
  extractIntent: jest.fn(),
  calculateConfidence: jest.fn(),
  shouldEscalateToHuman: jest.fn(),
  initializeGemini: jest.fn()
}));

jest.mock('../src/services/elevenlabsService', () => ({
  textToSpeech: jest.fn(),
  getVoices: jest.fn(),
  cloneVoice: jest.fn(),
  initializeElevenLabs: jest.fn()
}));

jest.mock('../src/services/twilioService', () => ({
  initiateCall: jest.fn(),
  generateTwiML: jest.fn(),
  updateCallStatus: jest.fn(),
  sendSMS: jest.fn(),
  initializeTwilio: jest.fn()
}));

jest.mock('../src/services/voiceProcessingPipeline', () => ({
  setSocketIO: jest.fn(),
  handleIncomingCall: jest.fn(),
  processVoiceInput: jest.fn(),
  generateResponse: jest.fn()
}));

jest.mock('../src/services/healthMonitoring', () => ({
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  getHealthStatus: jest.fn()
}));

jest.mock('../src/services/maximIntegration', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  getHardwareStatus: jest.fn()
}));

// Set test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Global test database setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'voxassist_test';
});

afterAll(async () => {
  // Cleanup after all tests
  if (global.testDb) {
    await global.testDb.end();
  }
});
