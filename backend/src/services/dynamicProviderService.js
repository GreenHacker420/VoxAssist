const { prisma } = require('../database/prisma');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Import provider services
const twilioService = require('./twilioService');
const mockTwilioService = require('./mockTwilioService');

/**
 * Dynamic Provider Service
 * Selects and uses the appropriate calling provider based on user configuration
 */
class DynamicProviderService {
  constructor() {
    this.providerInstances = new Map();
  }

  /**
   * Decrypt credentials
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
      const algorithm = 'aes-256-cbc';
      const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const [ivHex, encrypted] = encryptedText.split(':');
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error(`Decryption error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get active provider configuration for user
   */
  async getActiveProvider(userId, type = 'phone') {
    try {
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId }
      });

      if (!userOrg) {
        logger.warn(`No organization found for user ${userId}`);
        return null;
      }

      const providerConfig = await prisma.providerConfig.findFirst({
        where: {
          organizationId: userOrg.organizationId,
          type,
          isActive: true,
          isPrimary: true
        }
      });

      if (!providerConfig) {
        logger.warn(`No active provider found for user ${userId}, type ${type}`);
        return null;
      }

      // Decrypt credentials
      const decryptedCredentials = {};
      if (providerConfig.credentials) {
        for (const [key, value] of Object.entries(providerConfig.credentials)) {
          decryptedCredentials[key] = this.decrypt(value);
        }
      }

      return {
        ...providerConfig,
        credentials: decryptedCredentials
      };
    } catch (error) {
      logger.error(`Error getting active provider: ${error.message}`);
      return null;
    }
  }

  /**
   * Get provider service instance
   */
  async getProviderService(userId, type = 'phone') {
    const cacheKey = `${userId}-${type}`;
    
    // Return cached instance if available
    if (this.providerInstances.has(cacheKey)) {
      return this.providerInstances.get(cacheKey);
    }

    const providerConfig = await this.getActiveProvider(userId, type);
    
    if (!providerConfig) {
      logger.warn(`No provider config found, using mock service for user ${userId}`);
      const mockService = this.createMockService();
      this.providerInstances.set(cacheKey, mockService);
      return mockService;
    }

    let service;
    
    try {
      switch (providerConfig.provider) {
        case 'twilio':
          service = this.createTwilioService(providerConfig);
          break;
        case 'plivo':
          service = this.createPlivoService(providerConfig);
          break;
        case 'ringg':
          service = this.createRinggService(providerConfig);
          break;
        case 'sarvam':
          service = this.createSarvamService(providerConfig);
          break;
        default:
          logger.warn(`Unknown provider ${providerConfig.provider}, using mock service`);
          service = this.createMockService();
      }
    } catch (error) {
      logger.error(`Error creating provider service: ${error.message}`);
      service = this.createMockService();
    }

    this.providerInstances.set(cacheKey, service);
    return service;
  }

  /**
   * Create Twilio service instance
   */
  createTwilioService(config) {
    const { credentials } = config;
    
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      logger.warn('Incomplete Twilio credentials, using mock service');
      return this.createMockService();
    }

    try {
      // Create Twilio client with user's credentials
      const twilio = require('twilio');
      const client = twilio(credentials.accountSid, credentials.authToken);
      
      return {
        provider: 'twilio',
        config,
        
        async initiateCall(phoneNumber, options = {}) {
          try {
            const call = await client.calls.create({
              to: phoneNumber,
              from: credentials.phoneNumber,
              url: options.callbackUrl || `${process.env.BASE_URL}/webhooks/twilio/voice`,
              statusCallback: options.statusCallback || `${process.env.BASE_URL}/webhooks/twilio/status`,
              statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
              record: config.settings?.enableRecording || false,
              recordingStatusCallback: config.settings?.enableRecording ? 
                `${process.env.BASE_URL}/webhooks/twilio/recording` : undefined
            });

            return {
              success: true,
              callSid: call.sid,
              status: call.status,
              provider: 'twilio'
            };
          } catch (error) {
            logger.error(`Twilio call initiation failed: ${error.message}`);
            throw error;
          }
        },

        async endCall(callSid) {
          try {
            await client.calls(callSid).update({ status: 'completed' });
            return { success: true };
          } catch (error) {
            logger.error(`Twilio call termination failed: ${error.message}`);
            throw error;
          }
        },

        async getCallStatus(callSid) {
          try {
            const call = await client.calls(callSid).fetch();
            return {
              status: call.status,
              duration: call.duration,
              startTime: call.startTime,
              endTime: call.endTime
            };
          } catch (error) {
            logger.error(`Twilio call status fetch failed: ${error.message}`);
            throw error;
          }
        }
      };
    } catch (error) {
      logger.error(`Failed to create Twilio service: ${error.message}`);
      return this.createMockService();
    }
  }

  /**
   * Create Plivo service instance
   */
  createPlivoService(config) {
    const { credentials } = config;
    
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      logger.warn('Incomplete Plivo credentials, using mock service');
      return this.createMockService();
    }

    try {
      const plivo = require('plivo');
      const client = new plivo.Client(credentials.accountSid, credentials.authToken);
      
      return {
        provider: 'plivo',
        config,
        
        async initiateCall(phoneNumber, options = {}) {
          try {
            const call = await client.calls.create(
              credentials.phoneNumber,
              phoneNumber,
              options.callbackUrl || `${process.env.BASE_URL}/webhooks/plivo/voice`,
              {
                answerMethod: 'GET',
                hangupUrl: `${process.env.BASE_URL}/webhooks/plivo/hangup`,
                record: config.settings?.enableRecording || false
              }
            );

            return {
              success: true,
              callSid: call.requestUuid,
              status: 'initiated',
              provider: 'plivo'
            };
          } catch (error) {
            logger.error(`Plivo call initiation failed: ${error.message}`);
            throw error;
          }
        },

        async endCall(callSid) {
          try {
            await client.calls.hangup(callSid);
            return { success: true };
          } catch (error) {
            logger.error(`Plivo call termination failed: ${error.message}`);
            throw error;
          }
        },

        async getCallStatus(callSid) {
          try {
            const call = await client.calls.get(callSid);
            return {
              status: call.callState,
              duration: call.billDuration,
              startTime: call.initiationTime,
              endTime: call.endTime
            };
          } catch (error) {
            logger.error(`Plivo call status fetch failed: ${error.message}`);
            throw error;
          }
        }
      };
    } catch (error) {
      logger.error(`Failed to create Plivo service: ${error.message}`);
      return this.createMockService();
    }
  }

  /**
   * Create Ringg AI service instance (mock implementation)
   */
  createRinggService(config) {
    return {
      provider: 'ringg',
      config,
      
      async initiateCall(phoneNumber, options = {}) {
        // Mock implementation for Ringg AI
        const callSid = `ringg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info(`Mock Ringg AI call initiated to ${phoneNumber}`);
        
        return {
          success: true,
          callSid,
          status: 'initiated',
          provider: 'ringg'
        };
      },

      async endCall(callSid) {
        logger.info(`Mock Ringg AI call ${callSid} ended`);
        return { success: true };
      },

      async getCallStatus(callSid) {
        return {
          status: 'completed',
          duration: Math.floor(Math.random() * 300) + 30,
          startTime: new Date(Date.now() - 120000),
          endTime: new Date()
        };
      }
    };
  }

  /**
   * Create Sarvam AI service instance (mock implementation)
   */
  createSarvamService(config) {
    return {
      provider: 'sarvam',
      config,
      
      async initiateCall(phoneNumber, options = {}) {
        // Mock implementation for Sarvam AI
        const callSid = `sarvam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info(`Mock Sarvam AI call initiated to ${phoneNumber}`);
        
        return {
          success: true,
          callSid,
          status: 'initiated',
          provider: 'sarvam'
        };
      },

      async endCall(callSid) {
        logger.info(`Mock Sarvam AI call ${callSid} ended`);
        return { success: true };
      },

      async getCallStatus(callSid) {
        return {
          status: 'completed',
          duration: Math.floor(Math.random() * 300) + 30,
          startTime: new Date(Date.now() - 120000),
          endTime: new Date()
        };
      }
    };
  }

  /**
   * Create mock service instance
   */
  createMockService() {
    return mockTwilioService;
  }

  /**
   * Clear cached provider instances
   */
  clearCache(userId = null, type = null) {
    if (userId && type) {
      const cacheKey = `${userId}-${type}`;
      this.providerInstances.delete(cacheKey);
    } else {
      this.providerInstances.clear();
    }
  }
}

module.exports = new DynamicProviderService();
