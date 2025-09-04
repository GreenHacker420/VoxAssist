// Test setup and global configurations
require('dotenv').config({ path: '.env.test' });

// Mock external services for testing
jest.mock('../src/services/geminiService');
jest.mock('../src/services/elevenlabsService');
jest.mock('../src/services/twilioService');

// Global test timeout
jest.setTimeout(10000);

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
