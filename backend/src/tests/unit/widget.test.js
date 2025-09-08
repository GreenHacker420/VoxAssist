const request = require('supertest');
const { app } = require('../../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Widget API Tests', () => {
  let testOrganization;
  let testWidget;

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

    // Create test widget
    testWidget = await prisma.widget.create({
      data: {
        organization_id: testOrganization.id,
        name: 'Test Widget',
        context_url: 'https://test.com',
        appearance: {
          position: 'bottom-right',
          theme: 'light',
          primaryColor: '#3B82F6'
        },
        behavior: {
          greeting: 'Hello! How can I help?',
          language: 'en'
        },
        is_active: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.widgetInteraction.deleteMany({
      where: { widget_id: testWidget.id }
    });
    await prisma.widgetSession.deleteMany({
      where: { widget_id: testWidget.id }
    });
    await prisma.widget.delete({
      where: { id: testWidget.id }
    });
    await prisma.organization.delete({
      where: { id: testOrganization.id }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/widget/session/init', () => {
    it('should initialize a new widget session', async () => {
      const response = await request(app)
        .post('/api/widget/session/init')
        .send({
          widget_id: testWidget.id,
          user_agent: 'Test Browser',
          page_url: 'https://test.com/page'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.session_id).toBeDefined();
      expect(response.body.widget_config).toBeDefined();
    });

    it('should return 404 for invalid widget ID', async () => {
      const response = await request(app)
        .post('/api/widget/session/init')
        .send({
          widget_id: 'invalid-id',
          user_agent: 'Test Browser',
          page_url: 'https://test.com/page'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/widget/message/text', () => {
    let sessionId;

    beforeEach(async () => {
      const session = await prisma.widgetSession.create({
        data: {
          widget_id: testWidget.id,
          user_agent: 'Test Browser',
          page_url: 'https://test.com/page',
          ip_address: '127.0.0.1'
        }
      });
      sessionId = session.id;
    });

    it('should process text message and return AI response', async () => {
      const response = await request(app)
        .post('/api/widget/message/text')
        .send({
          session_id: sessionId,
          message: 'Hello, I need help with my order'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response).toBeDefined();
      expect(response.body.audio_url).toBeDefined();
    });

    it('should return 404 for invalid session ID', async () => {
      const response = await request(app)
        .post('/api/widget/message/text')
        .send({
          session_id: 'invalid-session',
          message: 'Hello'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/widget/:id/config', () => {
    it('should return widget configuration', async () => {
      const response = await request(app)
        .get(`/api/widget/${testWidget.id}/config`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.widget.name).toBe('Test Widget');
      expect(response.body.widget.appearance).toBeDefined();
      expect(response.body.widget.behavior).toBeDefined();
    });

    it('should return 404 for non-existent widget', async () => {
      const response = await request(app)
        .get('/api/widget/non-existent/config');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/widget/:id/analytics', () => {
    it('should return widget analytics', async () => {
      const response = await request(app)
        .get(`/api/widget/${testWidget.id}/analytics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toBeDefined();
      expect(response.body.analytics.total_sessions).toBeDefined();
      expect(response.body.analytics.total_interactions).toBeDefined();
    });
  });
});
