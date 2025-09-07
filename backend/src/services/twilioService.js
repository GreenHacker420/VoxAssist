const twilio = require('twilio');
const logger = require('../utils/logger');

// Module state
let client = null;
let phoneNumber = null;

/**
 * Initialize Twilio service
 */
const initializeTwilio = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are required');
  }
  
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  logger.info('Twilio service initialized');
};

/**
 * Initiate a call using Twilio
 */
const initiateCall = async (to, callbackUrl) => {
  try {
    if (!client) {
      initializeTwilio();
    }
    
    const call = await client.calls.create({
      url: callbackUrl,
      to: to,
      from: phoneNumber,
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
};

/**
 * Generate TwiML for voice response
 */
const generateTwiML = (message, options = {}) => {
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
};

/**
 * Generate TwiML with audio playback
 */
const generateTwiMLWithAudio = (audioUrl, options = {}) => {
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
};

/**
 * Get call details from Twilio
 */
const getCallDetails = async (callSid) => {
  try {
    if (!client) {
      initializeTwilio();
    }
    
    const call = await client.calls(callSid).fetch();
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
};

/**
 * Get recordings for a call
 */
const getRecordings = async (callSid) => {
  try {
    if (!client) {
      initializeTwilio();
    }
    
    const recordings = await client.recordings.list({
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
};

/**
 * End a call
 */
const endCall = async (callSid) => {
  try {
    if (!client) {
      initializeTwilio();
    }
    
    const call = await client.calls(callSid).update({
      status: 'completed'
    });

    logger.info(`Call ended: ${callSid}`);
    return call;
  } catch (error) {
    logger.error(`Error ending call: ${error.message}`);
    throw new Error('Failed to end call');
  }
};

/**
 * Send SMS message
 */
const sendSMS = async (to, message) => {
  try {
    if (!client) {
      initializeTwilio();
    }
    
    const sms = await client.messages.create({
      body: message,
      from: phoneNumber,
      to: to
    });

    logger.info(`SMS sent: ${sms.sid} to ${to}`);
    return sms;
  } catch (error) {
    logger.error(`Error sending SMS: ${error.message}`);
    throw new Error('Failed to send SMS');
  }
};

/**
 * Validate Twilio webhook
 */
const validateWebhook = (signature, url, params) => {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params
  );
};

// Initialize on module load only if credentials are available
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    initializeTwilio();
  } else {
    logger.warn('Twilio credentials not found, service will not be initialized');
  }
} catch (error) {
  logger.warn(`Twilio initialization failed: ${error.message}`);
}

// Export all functions
module.exports = {
  initializeTwilio,
  initiateCall,
  generateTwiML,
  generateTwiMLWithAudio,
  getCallDetails,
  getRecordings,
  endCall,
  sendSMS,
  validateWebhook,
  getPhoneNumber: () => phoneNumber
};
