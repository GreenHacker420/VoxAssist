const crypto = require('crypto-js');

class BaseProvider {
    constructor(config) {
        this.config = config;
        this.credentials = this.decryptCredentials(config.credentials);
        this.settings = config.settings || {};
        this.type = config.type; // 'phone' or 'whatsapp'
        this.provider = config.provider;
    }

    // Abstract methods that must be implemented by each provider
    async initiateCall(fromNumber, toNumber, callbackUrl) {
        throw new Error('initiateCall method must be implemented by provider');
    }

    async sendMessage(fromNumber, toNumber, message) {
        throw new Error('sendMessage method must be implemented by provider');
    }

    async getCallStatus(externalCallId) {
        throw new Error('getCallStatus method must be implemented by provider');
    }

    async endCall(externalCallId) {
        throw new Error('endCall method must be implemented by provider');
    }

    async handleWebhook(webhookData) {
        throw new Error('handleWebhook method must be implemented by provider');
    }

    // Common utility methods
    decryptCredentials(encryptedCredentials) {
        try {
            const secretKey = process.env.ENCRYPTION_SECRET_KEY;
            const decrypted = crypto.AES.decrypt(encryptedCredentials, secretKey);
            return JSON.parse(decrypted.toString(crypto.enc.Utf8));
        } catch (error) {
            console.error('Failed to decrypt credentials:', error);
            throw new Error('Invalid credentials configuration');
        }
    }

    encryptCredentials(credentials) {
        const secretKey = process.env.ENCRYPTION_SECRET_KEY;
        return crypto.AES.encrypt(JSON.stringify(credentials), secretKey).toString();
    }

    validatePhoneNumber(phoneNumber) {
        // Basic E.164 format validation
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }

    formatPhoneNumber(phoneNumber) {
        // Remove all non-digit characters except +
        let formatted = phoneNumber.replace(/[^\d+]/g, '');
        
        // Add + if not present
        if (!formatted.startsWith('+')) {
            formatted = '+' + formatted;
        }
        
        return formatted;
    }

    generateCallbackUrl(externalCallId) {
        const baseUrl = process.env.API_BASE_URL || 'https://api.voxassist.com';
        return `${baseUrl}/api/providers/webhook/${this.provider}/${externalCallId}`;
    }

    // Standard webhook response format
    formatWebhookResponse(status, data = {}) {
        return {
            status,
            timestamp: new Date().toISOString(),
            provider: this.provider,
            type: this.type,
            data
        };
    }

    // Error handling
    handleProviderError(error, context = '') {
        console.error(`${this.provider} Provider Error [${context}]:`, error);
        
        return {
            success: false,
            error: {
                code: error.code || 'PROVIDER_ERROR',
                message: error.message || 'Unknown provider error',
                provider: this.provider,
                context
            }
        };
    }

    // Success response format
    formatSuccessResponse(data) {
        return {
            success: true,
            provider: this.provider,
            type: this.type,
            data,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = BaseProvider;
