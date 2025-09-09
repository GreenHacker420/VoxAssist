const axios = require('axios');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Get WhatsApp configuration for a user
   */
  async getWhatsAppConfig(userId) {
    try {
      const config = await prisma.providerConfig.findFirst({
        where: {
          userId: userId,
          provider: 'whatsapp',
          isActive: true
        }
      });

      if (!config) {
        throw new Error('WhatsApp configuration not found');
      }

      // Decrypt credentials
      const decryptedCredentials = this.decryptCredentials(config.credentials);
      return {
        ...config,
        credentials: decryptedCredentials
      };
    } catch (error) {
      console.error('Error getting WhatsApp config:', error);
      throw error;
    }
  }

  /**
   * Decrypt WhatsApp credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedCredentials, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting credentials:', error);
      throw new Error('Failed to decrypt WhatsApp credentials');
    }
  }

  /**
   * Initiate a WhatsApp voice call
   */
  async initiateCall(userId, phoneNumber, callOptions = {}) {
    try {
      const config = await this.getWhatsAppConfig(userId);
      const { accessToken, phoneNumberId } = config.credentials;

      const callData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          header: {
            type: 'text',
            text: callOptions.headerText || 'Voice Call Request'
          },
          body: {
            text: callOptions.bodyText || 'Click to start voice call'
          },
          footer: {
            text: callOptions.footerText || 'Powered by VoxAssist'
          },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: 'Start Call',
              url: `https://wa.me/${phoneNumberId}?call=voice`
            }
          }
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${phoneNumberId}/messages`,
        callData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the call initiation
      await this.logCallEvent(userId, phoneNumber, 'call_initiated', {
        messageId: response.data.messages[0].id,
        callOptions
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'call_initiated'
      };

    } catch (error) {
      console.error('Error initiating WhatsApp call:', error);
      
      await this.logCallEvent(userId, phoneNumber, 'call_failed', {
        error: error.message
      });

      throw new Error(`Failed to initiate WhatsApp call: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp message with call button
   */
  async sendCallMessage(userId, phoneNumber, messageOptions = {}) {
    try {
      const config = await this.getWhatsAppConfig(userId);
      const { accessToken, phoneNumberId } = config.credentials;

      const messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: messageOptions.templateName || 'call_invitation',
          language: {
            code: messageOptions.languageCode || 'en_US'
          },
          components: [
            {
              type: 'header',
              parameters: [
                {
                  type: 'text',
                  text: messageOptions.headerText || 'Voice Call Available'
                }
              ]
            },
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: messageOptions.bodyText || 'We are ready to assist you via voice call.'
                }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                {
                  type: 'text',
                  text: phoneNumberId
                }
              ]
            }
          ]
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'message_sent'
      };

    } catch (error) {
      console.error('Error sending WhatsApp call message:', error);
      throw new Error(`Failed to send WhatsApp call message: ${error.message}`);
    }
  }

  /**
   * Handle incoming WhatsApp call webhook
   */
  async handleCallWebhook(webhookData) {
    try {
      const { entry } = webhookData;
      
      for (const entryItem of entry) {
        const { changes } = entryItem;
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const { messages, statuses } = change.value;
            
            // Handle call status updates
            if (statuses) {
              for (const status of statuses) {
                await this.processCallStatus(status);
              }
            }
            
            // Handle incoming call messages
            if (messages) {
              for (const message of messages) {
                await this.processIncomingCall(message);
              }
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling WhatsApp call webhook:', error);
      throw error;
    }
  }

  /**
   * Process call status updates
   */
  async processCallStatus(status) {
    try {
      const { id, status: callStatus, timestamp, recipient_id } = status;
      
      await this.logCallEvent(null, recipient_id, `call_${callStatus}`, {
        messageId: id,
        timestamp: new Date(parseInt(timestamp) * 1000)
      });

      // Emit real-time update via Socket.IO if available
      if (global.io) {
        global.io.emit('whatsapp_call_status', {
          messageId: id,
          status: callStatus,
          recipientId: recipient_id,
          timestamp: new Date(parseInt(timestamp) * 1000)
        });
      }

    } catch (error) {
      console.error('Error processing call status:', error);
    }
  }

  /**
   * Process incoming call messages
   */
  async processIncomingCall(message) {
    try {
      const { from, id, timestamp, type } = message;
      
      if (type === 'interactive' && message.interactive?.type === 'button_reply') {
        const buttonId = message.interactive.button_reply.id;
        
        if (buttonId === 'start_call') {
          await this.logCallEvent(null, from, 'incoming_call_accepted', {
            messageId: id,
            timestamp: new Date(parseInt(timestamp) * 1000)
          });

          // Emit real-time update
          if (global.io) {
            global.io.emit('whatsapp_incoming_call', {
              from,
              messageId: id,
              status: 'accepted',
              timestamp: new Date(parseInt(timestamp) * 1000)
            });
          }
        }
      }

    } catch (error) {
      console.error('Error processing incoming call:', error);
    }
  }

  /**
   * Test WhatsApp configuration
   */
  async testConnection(credentials) {
    try {
      const { accessToken, phoneNumberId } = credentials;
      
      const response = await axios.get(
        `${this.baseURL}/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return {
        success: true,
        phoneNumber: response.data.display_phone_number,
        verifiedName: response.data.verified_name,
        status: 'connected'
      };

    } catch (error) {
      console.error('WhatsApp connection test failed:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Log call events for audit trail
   */
  async logCallEvent(userId, phoneNumber, eventType, metadata = {}) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: `whatsapp_${eventType}`,
          resource: 'whatsapp_call',
          resourceId: phoneNumber,
          metadata: {
            phoneNumber,
            eventType,
            timestamp: new Date(),
            ...metadata
          },
          ipAddress: metadata.ipAddress || 'system',
          userAgent: metadata.userAgent || 'WhatsApp Service'
        }
      });
    } catch (error) {
      console.error('Error logging call event:', error);
    }
  }

  /**
   * Get call history for a user
   */
  async getCallHistory(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, phoneNumber } = options;
      
      const whereClause = {
        userId: userId,
        action: {
          startsWith: 'whatsapp_call'
        }
      };

      if (phoneNumber) {
        whereClause.resourceId = phoneNumber;
      }

      const callHistory = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return callHistory.map(log => ({
        id: log.id,
        phoneNumber: log.resourceId,
        eventType: log.action.replace('whatsapp_', ''),
        timestamp: log.createdAt,
        metadata: log.metadata
      }));

    } catch (error) {
      console.error('Error getting call history:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppService;
