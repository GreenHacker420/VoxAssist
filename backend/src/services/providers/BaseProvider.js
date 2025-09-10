const crypto = require('crypto-js');

/**
 * Create a base provider instance with common functionality
 */
const createBaseProvider = (config) => {
  const credentials = decryptCredentials(config.credentials);
  const settings = config.settings || {};
  const type = config.type; // 'phone' or 'whatsapp'
  const provider = config.provider;

  return {
    config,
    credentials,
    settings,
    type,
    provider,

    // Abstract methods that must be implemented by each provider
    async initiateCall(fromNumber, toNumber, callbackUrl) {
      throw new Error('initiateCall method must be implemented by provider');
    },

    async sendMessage(fromNumber, toNumber, message) {
      throw new Error('sendMessage method must be implemented by provider');
    },

    async getCallStatus(externalCallId) {
      throw new Error('getCallStatus method must be implemented by provider');
    },

    async endCall(externalCallId) {
      throw new Error('endCall method must be implemented by provider');
    },

    async handleWebhook(webhookData) {
      throw new Error('handleWebhook method must be implemented by provider');
    },

    // Common utility methods
    decryptCredentials: decryptCredentials,
    encryptCredentials: encryptCredentials,
    validatePhoneNumber: validatePhoneNumber,
    formatPhoneNumber: formatPhoneNumber,
    generateCallbackUrl: generateCallbackUrl,
    formatWebhookResponse: formatWebhookResponse,
    handleProviderError: handleProviderError,
    formatSuccessResponse: formatSuccessResponse
  };
};

/**
 * Decrypt credentials
 */
const decryptCredentials = (encryptedCredentials) => {
  try {
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    const decrypted = crypto.AES.decrypt(encryptedCredentials, secretKey);
    return JSON.parse(decrypted.toString(crypto.enc.Utf8));
  } catch (error) {
    console.error('Failed to decrypt credentials:', error);
    throw new Error('Invalid credentials configuration');
  }
};

/**
 * Encrypt credentials
 */
const encryptCredentials = (credentials) => {
  const secretKey = process.env.ENCRYPTION_SECRET_KEY;
  return crypto.AES.encrypt(JSON.stringify(credentials), secretKey).toString();
};

/**
 * Validate phone number format
 */
const validatePhoneNumber = (phoneNumber) => {
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

/**
 * Format phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters except +
  let formatted = phoneNumber.replace(/[^\d+]/g, '');

  // Add + if not present
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }

  return formatted;
};

/**
 * Generate callback URL
 */
const generateCallbackUrl = (provider, externalCallId) => {
  const baseUrl = process.env.API_BASE_URL || 'https://api.voxassist.com';
  return `${baseUrl}/api/providers/webhook/${provider}/${externalCallId}`;
};

/**
 * Standard webhook response format
 */
const formatWebhookResponse = (provider, type, status, data = {}) => {
  return {
    status,
    timestamp: new Date().toISOString(),
    provider,
    type,
    data
  };
};

/**
 * Error handling
 */
const handleProviderError = (provider, error, context = '') => {
  console.error(`${provider} Provider Error [${context}]:`, error);

  return {
    success: false,
    error: {
      code: error.code || 'PROVIDER_ERROR',
      message: error.message || 'Unknown provider error',
      provider,
      context
    }
  };
};

/**
 * Success response format
 */
const formatSuccessResponse = (provider, type, data) => {
  return {
    success: true,
    provider,
    type,
    data,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  createBaseProvider,
  decryptCredentials,
  encryptCredentials,
  validatePhoneNumber,
  formatPhoneNumber,
  generateCallbackUrl,
  formatWebhookResponse,
  handleProviderError,
  formatSuccessResponse
};
