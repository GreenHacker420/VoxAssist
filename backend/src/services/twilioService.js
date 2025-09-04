const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials are required');
    }
    
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async initiateCall(to, callbackUrl) {
    try {
      const call = await this.client.calls.create({
        url: callbackUrl,
        to: to,
        from: this.phoneNumber,
        record: true,
        recordingStatusCallback: `${callbackUrl}/recording-status`,
        statusCallback: `${callbackUrl}/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      logger.info(`Call initiated: ${call.sid} to ${to}`);
      return {
        callSid: call.sid,
        status: call.status,
        to: call.to,
        from: call.from
      };
    } catch (error) {
      logger.error(`Error initiating call: ${error.message}`);
      throw new Error('Failed to initiate call');
    }
  }

  generateTwiML(message, options = {}) {
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (options.gather) {
      const gather = twiml.gather({
        input: 'speech',
        timeout: options.timeout || 5,
        speechTimeout: options.speechTimeout || 'auto',
        action: options.action,
        method: 'POST'
      });
      gather.say(message, {
        voice: options.voice || 'Polly.Joanna',
        language: options.language || 'en-US'
      });
    } else {
      twiml.say(message, {
        voice: options.voice || 'Polly.Joanna',
        language: options.language || 'en-US'
      });
    }

    if (options.redirect) {
      twiml.redirect(options.redirect);
    }

    if (options.hangup) {
      twiml.hangup();
    }

    return twiml.toString();
  }

  generateTwiMLWithAudio(audioUrl, options = {}) {
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (options.gather) {
      const gather = twiml.gather({
        input: 'speech',
        timeout: options.timeout || 5,
        speechTimeout: options.speechTimeout || 'auto',
        action: options.action,
        method: 'POST'
      });
      gather.play(audioUrl);
    } else {
      twiml.play(audioUrl);
    }

    if (options.redirect) {
      twiml.redirect(options.redirect);
    }

    if (options.hangup) {
      twiml.hangup();
    }

    return twiml.toString();
  }

  async getCallDetails(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        from: call.from,
        to: call.to,
        price: call.price,
        priceUnit: call.priceUnit
      };
    } catch (error) {
      logger.error(`Error fetching call details: ${error.message}`);
      throw new Error('Failed to fetch call details');
    }
  }

  async getRecordings(callSid) {
    try {
      const recordings = await this.client.recordings.list({
        callSid: callSid,
        limit: 20
      });

      return recordings.map(recording => ({
        sid: recording.sid,
        duration: recording.duration,
        dateCreated: recording.dateCreated,
        uri: recording.uri,
        mediaUrl: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`
      }));
    } catch (error) {
      logger.error(`Error fetching recordings: ${error.message}`);
      throw new Error('Failed to fetch recordings');
    }
  }

  async endCall(callSid) {
    try {
      const call = await this.client.calls(callSid).update({
        status: 'completed'
      });

      logger.info(`Call ended: ${callSid}`);
      return call;
    } catch (error) {
      logger.error(`Error ending call: ${error.message}`);
      throw new Error('Failed to end call');
    }
  }

  async sendSMS(to, message) {
    try {
      const sms = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: to
      });

      logger.info(`SMS sent: ${sms.sid} to ${to}`);
      return sms;
    } catch (error) {
      logger.error(`Error sending SMS: ${error.message}`);
      throw new Error('Failed to send SMS');
    }
  }

  validateWebhook(signature, url, params) {
    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  }
}

module.exports = new TwilioService();
