const GeminiService = require('../../../src/services/geminiService');

describe('GeminiService', () => {
  let geminiService;

  beforeEach(() => {
    geminiService = new GeminiService();
  });

  describe('processCustomerQuery', () => {
    it('should process a simple customer query', async () => {
      const query = 'How do I reset my password?';
      const context = { customerPhone: '+1234567890' };

      const result = await geminiService.processCustomerQuery(query, context);

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('shouldEscalate');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle billing-related queries', async () => {
      const query = 'I want to see my bill';
      
      const result = await geminiService.processCustomerQuery(query);

      expect(result.intent).toContain('billing');
      expect(result.response).toContain('bill');
    });

    it('should detect escalation scenarios', async () => {
      const query = 'I am very angry and want to speak to a manager immediately!';
      
      const result = await geminiService.processCustomerQuery(query);

      expect(result.shouldEscalate).toBe(true);
    });

    it('should handle empty queries gracefully', async () => {
      const query = '';
      
      await expect(geminiService.processCustomerQuery(query))
        .rejects.toThrow('Query cannot be empty');
    });
  });

  describe('extractIntent', () => {
    it('should extract billing intent', () => {
      const response = 'This is about billing and payments';
      const intent = geminiService.extractIntent(response);
      expect(intent).toBe('billing');
    });

    it('should extract technical intent', () => {
      const response = 'Technical support issue with the service';
      const intent = geminiService.extractIntent(response);
      expect(intent).toBe('technical');
    });

    it('should default to general for unclear intents', () => {
      const response = 'Hello there';
      const intent = geminiService.extractIntent(response);
      expect(intent).toBe('general');
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for clear responses', () => {
      const response = 'I can definitely help you with your billing question';
      const confidence = geminiService.calculateConfidence(response);
      expect(confidence).toBeGreaterThan(0.8);
    });

    it('should return low confidence for uncertain responses', () => {
      const response = 'I am not sure about this';
      const confidence = geminiService.calculateConfidence(response);
      expect(confidence).toBeLessThan(0.5);
    });
  });
});
