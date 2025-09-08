const BaseProvider = require('./BaseProvider');
const plivo = require('plivo');

class PlivoProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.client = new plivo.Client(this.credentials.authId, this.credentials.authToken);
    }

    async initiateCall(fromNumber, toNumber, callbackUrl) {
        try {
            const formattedFrom = this.formatPhoneNumber(fromNumber);
            const formattedTo = this.formatPhoneNumber(toNumber);

            if (!this.validatePhoneNumber(formattedFrom) || !this.validatePhoneNumber(formattedTo)) {
                throw new Error('Invalid phone number format');
            }

            const callOptions = {
                from: formattedFrom,
                to: formattedTo,
                answer_url: this.generateAnswerUrl(),
                hangup_url: callbackUrl,
                fallback_url: callbackUrl,
                answer_method: 'POST',
                hangup_method: 'POST',
                time_limit: this.settings.timeout || 3600, // seconds
                timeout: this.settings.ringTimeout || 30
            };

            if (this.settings.recordCalls) {
                callOptions.record = true;
                callOptions.record_callback_url = callbackUrl;
            }

            const response = await this.client.calls.create(callOptions);

            return this.formatSuccessResponse({
                externalCallId: response.requestUuid,
                status: 'initiated',
                from: formattedFrom,
                to: formattedTo,
                startTime: new Date().toISOString()
            });

        } catch (error) {
            return this.handleProviderError(error, 'initiateCall');
        }
    }

    async sendMessage(fromNumber, toNumber, message) {
        try {
            const formattedFrom = this.formatPhoneNumber(fromNumber);
            const formattedTo = this.formatPhoneNumber(toNumber);

            const messageOptions = {
                src: formattedFrom,
                dst: formattedTo,
                text: message,
                url: `${process.env.API_BASE_URL}/api/providers/webhook/plivo/sms`,
                method: 'POST'
            };

            const response = await this.client.messages.create(messageOptions);

            return this.formatSuccessResponse({
                messageId: response.messageUuid,
                status: 'queued',
                from: formattedFrom,
                to: formattedTo
            });

        } catch (error) {
            return this.handleProviderError(error, 'sendMessage');
        }
    }

    async getCallStatus(externalCallId) {
        try {
            const call = await this.client.calls.get(externalCallId);

            return this.formatSuccessResponse({
                externalCallId: call.callUuid,
                status: this.mapPlivoStatus(call.callStatus),
                duration: call.duration || 0,
                startTime: call.initiationTime,
                endTime: call.endTime,
                hangupCause: call.hangupCause
            });

        } catch (error) {
            return this.handleProviderError(error, 'getCallStatus');
        }
    }

    async endCall(externalCallId) {
        try {
            await this.client.calls.hangup(externalCallId);

            return this.formatSuccessResponse({
                externalCallId,
                status: 'completed',
                endTime: new Date().toISOString()
            });

        } catch (error) {
            return this.handleProviderError(error, 'endCall');
        }
    }

    async handleWebhook(webhookData) {
        try {
            const { CallUUID, MessageUUID, Status, From, To, Text, Duration, HangupCause } = webhookData;

            // Handle call webhooks
            if (CallUUID) {
                return this.handleCallWebhook({
                    externalCallId: CallUUID,
                    status: Status,
                    from: From,
                    to: To,
                    duration: Duration,
                    hangupCause: HangupCause,
                    ...webhookData
                });
            }

            // Handle message webhooks
            if (MessageUUID) {
                return this.handleMessageWebhook({
                    messageId: MessageUUID,
                    status: Status,
                    from: From,
                    to: To,
                    text: Text,
                    ...webhookData
                });
            }

            throw new Error('Unknown webhook type');

        } catch (error) {
            return this.handleProviderError(error, 'handleWebhook');
        }
    }

    async handleCallWebhook(data) {
        return this.formatWebhookResponse('call_status_update', {
            externalCallId: data.externalCallId,
            status: this.mapPlivoStatus(data.status),
            duration: parseInt(data.duration) || 0,
            hangupCause: data.hangupCause,
            from: data.from,
            to: data.to
        });
    }

    async handleMessageWebhook(data) {
        return this.formatWebhookResponse('message_status_update', {
            messageId: data.messageId,
            status: this.mapPlivoMessageStatus(data.status),
            from: data.from,
            to: data.to,
            text: data.text
        });
    }

    mapPlivoStatus(plivoStatus) {
        const statusMapping = {
            'queued': 'initiated',
            'ringing': 'ringing',
            'in-progress': 'in_progress',
            'completed': 'completed',
            'failed': 'failed',
            'busy': 'failed',
            'no-answer': 'failed',
            'canceled': 'failed'
        };

        return statusMapping[plivoStatus] || plivoStatus;
    }

    mapPlivoMessageStatus(plivoStatus) {
        const statusMapping = {
            'queued': 'queued',
            'sent': 'sent',
            'delivered': 'delivered',
            'undelivered': 'failed',
            'failed': 'failed'
        };

        return statusMapping[plivoStatus] || plivoStatus;
    }

    generateAnswerUrl() {
        const baseUrl = process.env.API_BASE_URL || 'https://api.voxassist.com';
        return `${baseUrl}/api/providers/plivo/answer`;
    }

    generateAnswerXML() {
        const greeting = this.settings.greeting || 'Hello! You have reached VoxAssist AI support. Please hold while we connect you.';
        
        return `
            <Response>
                <Speak voice="WOMAN">${greeting}</Speak>
                <Stream bidirectional="true" keepCallAlive="true">
                    ${this.generateStreamUrl()}
                </Stream>
            </Response>
        `;
    }

    generateStreamUrl() {
        const baseUrl = process.env.API_BASE_URL || 'https://api.voxassist.com';
        return `${baseUrl}/api/voice/stream/plivo`;
    }

    static validateConfig(config) {
        const required = ['authId', 'authToken'];
        const credentials = JSON.parse(config.credentials);

        for (const field of required) {
            if (!credentials[field]) {
                throw new Error(`Missing required Plivo credential: ${field}`);
            }
        }

        return true;
    }

    async getAvailableNumbers(countryCode = 'US') {
        try {
            const response = await this.client.phoneNumbers.search(countryCode, {
                type: 'local',
                limit: 20
            });

            return this.formatSuccessResponse({
                numbers: response.objects.map(num => ({
                    phoneNumber: num.number,
                    region: num.region,
                    monthlyRentalRate: num.monthlyRentalRate,
                    setupRate: num.setupRate,
                    capabilities: {
                        voice: num.voiceEnabled,
                        sms: num.smsEnabled
                    }
                }))
            });

        } catch (error) {
            return this.handleProviderError(error, 'getAvailableNumbers');
        }
    }

    async purchaseNumber(phoneNumber) {
        try {
            const response = await this.client.phoneNumbers.buy({
                number: phoneNumber
            });

            return this.formatSuccessResponse({
                phoneNumber: response.number,
                status: response.status,
                monthlyRentalRate: response.monthlyRentalRate
            });

        } catch (error) {
            return this.handleProviderError(error, 'purchaseNumber');
        }
    }
}

module.exports = PlivoProvider;
