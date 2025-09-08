const BaseProvider = require('./BaseProvider');
const twilio = require('twilio');

class TwilioProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.client = twilio(this.credentials.accountSid, this.credentials.authToken);
    }

    async initiateCall(fromNumber, toNumber, callbackUrl) {
        try {
            const formattedFrom = this.formatPhoneNumber(fromNumber);
            const formattedTo = this.formatPhoneNumber(toNumber);

            if (!this.validatePhoneNumber(formattedFrom) || !this.validatePhoneNumber(formattedTo)) {
                throw new Error('Invalid phone number format');
            }

            let callOptions = {
                from: formattedFrom,
                to: formattedTo,
                statusCallback: callbackUrl,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST',
                record: this.settings.recordCalls || false,
                timeout: this.settings.timeout || 30
            };

            if (this.type === 'phone') {
                // Traditional phone call with TwiML
                callOptions.twiml = this.generateCallTwiML();
            } else if (this.type === 'whatsapp') {
                // WhatsApp call - use messaging API first, then voice if supported
                return await this.initiateWhatsAppInteraction(formattedFrom, formattedTo, callbackUrl);
            }

            const call = await this.client.calls.create(callOptions);

            return this.formatSuccessResponse({
                externalCallId: call.sid,
                status: call.status,
                from: call.from,
                to: call.to,
                direction: call.direction,
                startTime: call.dateCreated
            });

        } catch (error) {
            return this.handleProviderError(error, 'initiateCall');
        }
    }

    async initiateWhatsAppInteraction(fromNumber, toNumber, callbackUrl) {
        try {
            // For WhatsApp, we start with a message and then can escalate to voice
            const whatsappFrom = `whatsapp:${fromNumber}`;
            const whatsappTo = `whatsapp:${toNumber}`;

            const message = await this.client.messages.create({
                from: whatsappFrom,
                to: whatsappTo,
                body: this.settings.whatsappGreeting || 'Hello! VoxAssist AI is here to help you. You can reply with text or request a voice call.',
                statusCallback: callbackUrl
            });

            return this.formatSuccessResponse({
                externalCallId: message.sid,
                status: message.status,
                from: message.from,
                to: message.to,
                type: 'whatsapp_message',
                startTime: message.dateCreated
            });

        } catch (error) {
            return this.handleProviderError(error, 'initiateWhatsAppInteraction');
        }
    }

    async sendMessage(fromNumber, toNumber, message) {
        try {
            const formattedFrom = this.formatPhoneNumber(fromNumber);
            const formattedTo = this.formatPhoneNumber(toNumber);

            let messageOptions = {
                body: message,
                from: this.type === 'whatsapp' ? `whatsapp:${formattedFrom}` : formattedFrom,
                to: this.type === 'whatsapp' ? `whatsapp:${formattedTo}` : formattedTo
            };

            const sentMessage = await this.client.messages.create(messageOptions);

            return this.formatSuccessResponse({
                messageId: sentMessage.sid,
                status: sentMessage.status,
                from: sentMessage.from,
                to: sentMessage.to
            });

        } catch (error) {
            return this.handleProviderError(error, 'sendMessage');
        }
    }

    async sendWhatsAppAudio(fromNumber, toNumber, audioUrl) {
        try {
            const whatsappFrom = `whatsapp:${this.formatPhoneNumber(fromNumber)}`;
            const whatsappTo = `whatsapp:${this.formatPhoneNumber(toNumber)}`;

            const message = await this.client.messages.create({
                from: whatsappFrom,
                to: whatsappTo,
                mediaUrl: [audioUrl]
            });

            return this.formatSuccessResponse({
                messageId: message.sid,
                status: message.status,
                type: 'whatsapp_audio'
            });

        } catch (error) {
            return this.handleProviderError(error, 'sendWhatsAppAudio');
        }
    }

    async getCallStatus(externalCallId) {
        try {
            const call = await this.client.calls(externalCallId).fetch();

            return this.formatSuccessResponse({
                externalCallId: call.sid,
                status: call.status,
                duration: call.duration,
                startTime: call.startTime,
                endTime: call.endTime,
                price: call.price,
                priceUnit: call.priceUnit
            });

        } catch (error) {
            return this.handleProviderError(error, 'getCallStatus');
        }
    }

    async endCall(externalCallId) {
        try {
            const call = await this.client.calls(externalCallId).update({
                status: 'completed'
            });

            return this.formatSuccessResponse({
                externalCallId: call.sid,
                status: call.status,
                endTime: new Date().toISOString()
            });

        } catch (error) {
            return this.handleProviderError(error, 'endCall');
        }
    }

    async handleWebhook(webhookData) {
        try {
            const { CallSid, MessageSid, CallStatus, MessageStatus, From, To, Body, MediaUrl0 } = webhookData;

            // Handle call webhooks
            if (CallSid) {
                return this.handleCallWebhook({
                    externalCallId: CallSid,
                    status: CallStatus,
                    from: From,
                    to: To,
                    ...webhookData
                });
            }

            // Handle message webhooks (including WhatsApp)
            if (MessageSid) {
                return this.handleMessageWebhook({
                    messageId: MessageSid,
                    status: MessageStatus,
                    from: From,
                    to: To,
                    body: Body,
                    mediaUrl: MediaUrl0,
                    ...webhookData
                });
            }

            throw new Error('Unknown webhook type');

        } catch (error) {
            return this.handleProviderError(error, 'handleWebhook');
        }
    }

    async handleCallWebhook(data) {
        const statusMapping = {
            'initiated': 'initiated',
            'ringing': 'ringing',
            'in-progress': 'in_progress',
            'completed': 'completed',
            'busy': 'failed',
            'failed': 'failed',
            'no-answer': 'failed'
        };

        return this.formatWebhookResponse('call_status_update', {
            externalCallId: data.externalCallId,
            status: statusMapping[data.status] || data.status,
            duration: data.CallDuration || 0,
            recordingUrl: data.RecordingUrl,
            from: data.from,
            to: data.to
        });
    }

    async handleMessageWebhook(data) {
        const isWhatsApp = data.from?.includes('whatsapp:') || data.to?.includes('whatsapp:');
        
        // Handle incoming WhatsApp messages
        if (isWhatsApp && data.body) {
            return this.formatWebhookResponse('whatsapp_message_received', {
                messageId: data.messageId,
                from: data.from.replace('whatsapp:', ''),
                to: data.to.replace('whatsapp:', ''),
                body: data.body,
                mediaUrl: data.mediaUrl,
                timestamp: new Date().toISOString()
            });
        }

        // Handle message status updates
        return this.formatWebhookResponse('message_status_update', {
            messageId: data.messageId,
            status: data.status,
            from: data.from,
            to: data.to
        });
    }

    generateCallTwiML() {
        const greeting = this.settings.greeting || 'Hello! You have reached VoxAssist AI support. Please hold while we connect you.';
        
        return `
            <Response>
                <Say voice="alice">${greeting}</Say>
                <Dial>
                    <Stream url="${this.generateStreamUrl()}" />
                </Dial>
            </Response>
        `;
    }

    generateStreamUrl() {
        const baseUrl = process.env.API_BASE_URL || 'https://api.voxassist.com';
        return `${baseUrl}/api/voice/stream`;
    }

    // Twilio-specific configuration validation
    static validateConfig(config) {
        const required = ['accountSid', 'authToken'];
        const credentials = JSON.parse(config.credentials);

        for (const field of required) {
            if (!credentials[field]) {
                throw new Error(`Missing required Twilio credential: ${field}`);
            }
        }

        return true;
    }

    // Get available phone numbers from Twilio
    async getAvailableNumbers(countryCode = 'US') {
        try {
            const numbers = await this.client.availablePhoneNumbers(countryCode)
                .local
                .list({ limit: 20 });

            return this.formatSuccessResponse({
                numbers: numbers.map(num => ({
                    phoneNumber: num.phoneNumber,
                    friendlyName: num.friendlyName,
                    capabilities: num.capabilities
                }))
            });

        } catch (error) {
            return this.handleProviderError(error, 'getAvailableNumbers');
        }
    }

    // Purchase a phone number
    async purchaseNumber(phoneNumber) {
        try {
            const number = await this.client.incomingPhoneNumbers.create({
                phoneNumber: phoneNumber,
                voiceUrl: `${process.env.API_BASE_URL}/api/providers/webhook/twilio/voice`,
                smsUrl: `${process.env.API_BASE_URL}/api/providers/webhook/twilio/sms`
            });

            return this.formatSuccessResponse({
                phoneNumber: number.phoneNumber,
                sid: number.sid,
                friendlyName: number.friendlyName
            });

        } catch (error) {
            return this.handleProviderError(error, 'purchaseNumber');
        }
    }
}

module.exports = TwilioProvider;
