const TwilioProvider = require('./TwilioProvider');
const PlivoProvider = require('./PlivoProvider');

class ProviderFactory {
    static supportedProviders = {
        'twilio': TwilioProvider,
        'plivo': PlivoProvider,
        // Future providers can be added here
        // 'ringg': RinggProvider,
        // 'sarvam': SarvamProvider
    };

    static createProvider(config) {
        const providerClass = this.supportedProviders[config.provider.toLowerCase()];
        
        if (!providerClass) {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }

        // Validate provider configuration
        if (providerClass.validateConfig) {
            providerClass.validateConfig(config);
        }

        return new providerClass(config);
    }

    static getSupportedProviders() {
        return Object.keys(this.supportedProviders);
    }

    static getProviderCapabilities(providerName) {
        const capabilities = {
            'twilio': {
                voice: true,
                sms: true,
                whatsapp: true,
                recording: true,
                streaming: true,
                conferencing: true,
                regions: ['US', 'CA', 'GB', 'AU', 'IN', 'SG', 'JP', 'DE', 'FR', 'BR']
            },
            'plivo': {
                voice: true,
                sms: true,
                whatsapp: false,
                recording: true,
                streaming: true,
                conferencing: true,
                regions: ['US', 'CA', 'GB', 'AU', 'IN', 'SG', 'JP', 'DE', 'FR', 'BR']
            }
        };

        return capabilities[providerName.toLowerCase()] || null;
    }

    static getProviderPricing(providerName) {
        // This would typically come from a database or external API
        const pricing = {
            'twilio': {
                voice: {
                    inbound: 0.0085, // per minute
                    outbound: 0.013
                },
                sms: {
                    inbound: 0.0075, // per message
                    outbound: 0.0075
                },
                whatsapp: {
                    inbound: 0.005,
                    outbound: 0.005
                }
            },
            'plivo': {
                voice: {
                    inbound: 0.007,
                    outbound: 0.012
                },
                sms: {
                    inbound: 0.006,
                    outbound: 0.006
                }
            }
        };

        return pricing[providerName.toLowerCase()] || null;
    }

    static validateProviderConfig(providerName, credentials, settings = {}) {
        const errors = [];

        switch (providerName.toLowerCase()) {
            case 'twilio':
                if (!credentials.accountSid) errors.push('Twilio Account SID is required');
                if (!credentials.authToken) errors.push('Twilio Auth Token is required');
                break;

            case 'plivo':
                if (!credentials.authId) errors.push('Plivo Auth ID is required');
                if (!credentials.authToken) errors.push('Plivo Auth Token is required');
                break;

            default:
                errors.push(`Unsupported provider: ${providerName}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static async testProviderConnection(config) {
        try {
            const provider = this.createProvider(config);
            
            // Perform a simple test based on provider type
            switch (config.provider.toLowerCase()) {
                case 'twilio':
                    // Test by fetching account info
                    const twilioClient = provider.client;
                    await twilioClient.api.accounts(provider.credentials.accountSid).fetch();
                    break;

                case 'plivo':
                    // Test by fetching account info
                    const plivoClient = provider.client;
                    await plivoClient.account.get();
                    break;

                default:
                    throw new Error('Provider connection test not implemented');
            }

            return {
                success: true,
                message: 'Provider connection successful',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    static getProviderRequirements(providerName) {
        const requirements = {
            'twilio': {
                credentials: [
                    { name: 'accountSid', label: 'Account SID', type: 'text', required: true },
                    { name: 'authToken', label: 'Auth Token', type: 'password', required: true }
                ],
                settings: [
                    { name: 'recordCalls', label: 'Record Calls', type: 'boolean', default: false },
                    { name: 'timeout', label: 'Call Timeout (seconds)', type: 'number', default: 30 },
                    { name: 'greeting', label: 'Call Greeting', type: 'text', default: 'Hello! You have reached VoxAssist AI support.' },
                    { name: 'whatsappGreeting', label: 'WhatsApp Greeting', type: 'text', default: 'Hello! VoxAssist AI is here to help you.' }
                ]
            },
            'plivo': {
                credentials: [
                    { name: 'authId', label: 'Auth ID', type: 'text', required: true },
                    { name: 'authToken', label: 'Auth Token', type: 'password', required: true }
                ],
                settings: [
                    { name: 'recordCalls', label: 'Record Calls', type: 'boolean', default: false },
                    { name: 'timeout', label: 'Call Timeout (seconds)', type: 'number', default: 3600 },
                    { name: 'ringTimeout', label: 'Ring Timeout (seconds)', type: 'number', default: 30 },
                    { name: 'greeting', label: 'Call Greeting', type: 'text', default: 'Hello! You have reached VoxAssist AI support.' }
                ]
            }
        };

        return requirements[providerName.toLowerCase()] || null;
    }
}

module.exports = ProviderFactory;
