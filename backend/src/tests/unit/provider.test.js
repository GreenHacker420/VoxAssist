const request = require('supertest');
const { app } = require('../../server');
const { PrismaClient } = require('@prisma/client');
const ProviderFactory = require('../../services/providers/ProviderFactory');

const prisma = new PrismaClient();

describe('Provider API Tests', () => {
  let testOrganization;
  let testProviderConfig;

  beforeAll(async () => {
    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        domain: 'test.com',
        subscription_plan: 'premium',
        is_active: true
      }
    });

    // Create test provider config
    testProviderConfig = await prisma.providerConfig.create({
      data: {
        organization_id: testOrganization.id,
        provider_type: 'twilio',
        name: 'Test Twilio Provider',
        config: {
          accountSid: 'test_sid',
          authToken: 'test_token',
          phoneNumber: '+1234567890'
        },
        is_active: true,
        is_primary: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.providerCall.deleteMany({
      where: { provider_config_id: testProviderConfig.id }
    });
    await prisma.providerConfig.delete({
      where: { id: testProviderConfig.id }
    });
    await prisma.organization.delete({
      where: { id: testOrganization.id }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/providers', () => {
    it('should return list of provider configurations', async () => {
      const response = await request(app)
        .get('/api/providers')
        .query({ organization_id: testOrganization.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/providers', () => {
    it('should create a new provider configuration', async () => {
      const providerData = {
        organization_id: testOrganization.id,
        provider_type: 'plivo',
        name: 'Test Plivo Provider',
        config: {
          authId: 'test_auth_id',
          authToken: 'test_auth_token',
          phoneNumber: '+1987654321'
        }
      };

      const response = await request(app)
        .post('/api/providers')
        .send(providerData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.provider.name).toBe(providerData.name);
      expect(response.body.provider.provider_type).toBe(providerData.provider_type);

      // Cleanup
      await prisma.providerConfig.delete({
        where: { id: response.body.provider.id }
      });
    });

    it('should validate provider configuration', async () => {
      const invalidProviderData = {
        organization_id: testOrganization.id,
        provider_type: 'twilio',
        name: 'Invalid Provider',
        config: {
          // Missing required fields
        }
      };

      const response = await request(app)
        .post('/api/providers')
        .send(invalidProviderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/providers/:id/test', () => {
    it('should test provider connection', async () => {
      const response = await request(app)
        .post(`/api/providers/${testProviderConfig.id}/test`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBeDefined();
    });
  });

  describe('POST /api/providers/:id/call', () => {
    it('should initiate a call using the provider', async () => {
      const callData = {
        to_number: '+1234567890',
        message: 'This is a test call'
      };

      const response = await request(app)
        .post(`/api/providers/${testProviderConfig.id}/call`)
        .send(callData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.call_id).toBeDefined();
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .post('/api/providers/non-existent/call')
        .send({
          to_number: '+1234567890',
          message: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/providers/supported', () => {
    it('should return list of supported providers', async () => {
      const response = await request(app)
        .get('/api/providers/supported');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.providers)).toBe(true);
      
      const providerTypes = response.body.providers.map(p => p.type);
      expect(providerTypes).toContain('twilio');
      expect(providerTypes).toContain('plivo');
    });
  });

  describe('GET /api/providers/:id/analytics', () => {
    it('should return provider analytics', async () => {
      const response = await request(app)
        .get(`/api/providers/${testProviderConfig.id}/analytics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toBeDefined();
      expect(response.body.analytics.total_calls).toBeDefined();
      expect(response.body.analytics.success_rate).toBeDefined();
    });
  });
});

describe('Provider Factory Tests', () => {
  describe('createProvider', () => {
    it('should create Twilio provider instance', () => {
      const config = {
        accountSid: 'test_sid',
        authToken: 'test_token',
        phoneNumber: '+1234567890'
      };

      const provider = ProviderFactory.createProvider('twilio', config);
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('TwilioProvider');
    });

    it('should create Plivo provider instance', () => {
      const config = {
        authId: 'test_auth_id',
        authToken: 'test_auth_token',
        phoneNumber: '+1234567890'
      };

      const provider = ProviderFactory.createProvider('plivo', config);
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('PlivoProvider');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        ProviderFactory.createProvider('unsupported', {});
      }).toThrow('Unsupported provider type: unsupported');
    });
  });

  describe('validateConfig', () => {
    it('should validate Twilio configuration', () => {
      const validConfig = {
        accountSid: 'test_sid',
        authToken: 'test_token',
        phoneNumber: '+1234567890'
      };

      const result = ProviderFactory.validateConfig('twilio', validConfig);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid Twilio configuration', () => {
      const invalidConfig = {
        accountSid: 'test_sid'
        // Missing authToken and phoneNumber
      };

      const result = ProviderFactory.validateConfig('twilio', invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      
      const providerTypes = providers.map(p => p.type);
      expect(providerTypes).toContain('twilio');
      expect(providerTypes).toContain('plivo');
    });
  });
});
