const request = require('supertest');
const app = require('../../src/server');
const { db } = require('../../src/database/connection');

describe('API Integration Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Setup test database
    await db.connect();
    
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'integration@test.com',
        password: 'testpassword123',
        name: 'Integration Test User'
      });

    authToken = registerResponse.body.data.token;
    testUserId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    await db.disconnect();
  });

  describe('Authentication Flow', () => {
    it('should complete full auth flow', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('token');

      // Get profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.email).toBe('integration@test.com');
    });
  });

  describe('Analytics Endpoints', () => {
    it('should fetch dashboard analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('callVolume');
      expect(response.body.data).toHaveProperty('hourlyDistribution');
      expect(response.body.data).toHaveProperty('sentimentAnalysis');
    });

    it('should fetch performance metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/performance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('trends');
    });
  });

  describe('Voice Processing', () => {
    it('should handle Twilio webhook', async () => {
      const response = await request(app)
        .post('/api/voice/incoming')
        .send({
          CallSid: 'test-call-sid',
          From: '+1234567890',
          To: '+0987654321'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('xml');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard');

      expect(response.status).toBe(401);
    });

    it('should handle invalid endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
