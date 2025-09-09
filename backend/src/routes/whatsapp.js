const express = require('express');
const { authenticateToken, authorizeUser } = require('../middleware/auth');
const WhatsAppService = require('../services/whatsappService');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();
const whatsappService = new WhatsAppService();

/**
 * Encrypt credentials for storage
 */
function encryptCredentials(credentials) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
}

/**
 * Configure WhatsApp provider settings
 */
router.post('/configure', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { accessToken, phoneNumberId, webhookVerifyToken, businessAccountId } = req.body;
    const userId = req.user.id;

    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        error: 'Access token and phone number ID are required'
      });
    }

    // Test the configuration before saving
    const testResult = await whatsappService.testConnection({
      accessToken,
      phoneNumberId
    });

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: `Configuration test failed: ${testResult.error}`
      });
    }

    // Encrypt credentials
    const credentials = {
      accessToken,
      phoneNumberId,
      webhookVerifyToken,
      businessAccountId
    };
    const encryptedCredentials = encryptCredentials(credentials);

    // Save or update WhatsApp configuration
    const existingConfig = await prisma.providerConfig.findFirst({
      where: {
        userId: userId,
        provider: 'whatsapp'
      }
    });

    let config;
    if (existingConfig) {
      config = await prisma.providerConfig.update({
        where: { id: existingConfig.id },
        data: {
          credentials: encryptedCredentials,
          isActive: true,
          updatedAt: new Date()
        }
      });
    } else {
      config = await prisma.providerConfig.create({
        data: {
          userId: userId,
          provider: 'whatsapp',
          credentials: encryptedCredentials,
          isActive: true
        }
      });
    }

    // Log the configuration
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'whatsapp_configured',
        resource: 'whatsapp_config',
        resourceId: config.id,
        metadata: {
          phoneNumber: testResult.phoneNumber,
          verifiedName: testResult.verifiedName
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'WhatsApp configuration saved successfully',
      config: {
        id: config.id,
        provider: config.provider,
        phoneNumber: testResult.phoneNumber,
        verifiedName: testResult.verifiedName,
        isActive: config.isActive
      }
    });

  } catch (error) {
    console.error('Error configuring WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure WhatsApp'
    });
  }
});

/**
 * Initiate WhatsApp voice call
 */
router.post('/call', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { phoneNumber, callOptions } = req.body;
    const userId = req.user.id;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    const result = await whatsappService.initiateCall(userId, phoneNumber, callOptions);

    res.json({
      success: true,
      message: 'WhatsApp call initiated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error initiating WhatsApp call:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate WhatsApp call'
    });
  }
});

/**
 * Send WhatsApp message with call button
 */
router.post('/send-call-message', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { phoneNumber, messageOptions } = req.body;
    const userId = req.user.id;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await whatsappService.sendCallMessage(userId, phoneNumber, messageOptions);

    res.json({
      success: true,
      message: 'WhatsApp call message sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Error sending WhatsApp call message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send WhatsApp call message'
    });
  }
});

/**
 * Get WhatsApp configuration
 */
router.get('/config', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const config = await prisma.providerConfig.findFirst({
      where: {
        userId: userId,
        provider: 'whatsapp',
        isActive: true
      }
    });

    if (!config) {
      return res.json({
        success: true,
        configured: false,
        message: 'WhatsApp not configured'
      });
    }

    // Test current configuration
    const testResult = await whatsappService.testConnection(
      whatsappService.decryptCredentials(config.credentials)
    );

    res.json({
      success: true,
      configured: true,
      config: {
        id: config.id,
        provider: config.provider,
        phoneNumber: testResult.success ? testResult.phoneNumber : 'Unknown',
        verifiedName: testResult.success ? testResult.verifiedName : 'Unknown',
        isActive: config.isActive,
        status: testResult.success ? 'connected' : 'disconnected'
      }
    });

  } catch (error) {
    console.error('Error getting WhatsApp config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp configuration'
    });
  }
});

/**
 * Test WhatsApp connection
 */
router.post('/test', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { accessToken, phoneNumberId } = req.body;

    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        error: 'Access token and phone number ID are required'
      });
    }

    const result = await whatsappService.testConnection({
      accessToken,
      phoneNumberId
    });

    res.json(result);

  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test WhatsApp connection'
    });
  }
});

/**
 * Get call history
 */
router.get('/call-history', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, offset, phoneNumber } = req.query;

    const options = {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };

    if (phoneNumber) {
      options.phoneNumber = phoneNumber;
    }

    const callHistory = await whatsappService.getCallHistory(userId, options);

    res.json({
      success: true,
      data: callHistory,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: callHistory.length
      }
    });

  } catch (error) {
    console.error('Error getting call history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call history'
    });
  }
});

/**
 * WhatsApp webhook endpoint for receiving call events
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature (optional but recommended)
    // const signature = req.get('X-Hub-Signature-256');
    // if (!verifyWebhookSignature(req.body, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    await whatsappService.handleCallWebhook(webhookData);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

/**
 * WhatsApp webhook verification endpoint
 */
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify the webhook
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('WhatsApp webhook verification failed');
      res.status(403).json({ error: 'Verification failed' });
    }

  } catch (error) {
    console.error('Error verifying WhatsApp webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify webhook'
    });
  }
});

/**
 * Delete WhatsApp configuration
 */
router.delete('/config', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.providerConfig.updateMany({
      where: {
        userId: userId,
        provider: 'whatsapp'
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'whatsapp_config_deleted',
        resource: 'whatsapp_config',
        resourceId: userId,
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'WhatsApp configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting WhatsApp config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete WhatsApp configuration'
    });
  }
});

module.exports = router;
