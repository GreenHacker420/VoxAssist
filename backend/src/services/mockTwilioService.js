const logger = require('../utils/logger');

/**
 * Mock Twilio service for testing and development
 * This service simulates Twilio API responses when credentials are not available
 */

const mockCallData = {
  'test-call-123': {
    sid: 'test-call-123',
    status: 'completed',
    duration: 120,
    startTime: new Date(Date.now() - 300000).toISOString(),
    endTime: new Date(Date.now() - 180000).toISOString(),
    from: '+1234567890',
    to: '+0987654321',
    price: '-0.0075',
    priceUnit: 'USD'
  }
};

/**
 * Mock call initiation
 */
const initiateCall = async (to, callbackUrl = null) => {
  try {
    logger.info(`Mock call initiated to ${to}${callbackUrl ? ` with callback ${callbackUrl}` : ' (no callback)'}`);
    
    const callId = `mock-call-${Date.now()}`;
    const mockCall = {
      sid: callId,
      status: 'initiated',
      to: to,
      from: '+1234567890'
    };
    
    // Store mock call data
    mockCallData[callId] = {
      ...mockCall,
      duration: null,
      startTime: new Date().toISOString(),
      endTime: null,
      price: null,
      priceUnit: 'USD'
    };
    
    // Simulate successful call initiation
    logger.info(`Mock call ${callId} successfully initiated to ${to}`);
    
    return {
      callSid: mockCall.sid,
      status: mockCall.status,
      to: mockCall.to,
      from: mockCall.from
    };
  } catch (error) {
    logger.error(`Mock call initiation error: ${error.message}`);
    throw new Error('Failed to initiate call');
  }
};

/**
 * Mock call details retrieval
 */
const getCallDetails = async (callSid) => {
  try {
    logger.info(`Fetching mock call details for ${callSid}`);
    
    const callData = mockCallData[callSid];
    if (!callData) {
      // Return default mock data for unknown call IDs
      return {
        sid: callSid,
        status: 'completed',
        duration: 95,
        startTime: new Date(Date.now() - 200000).toISOString(),
        endTime: new Date(Date.now() - 105000).toISOString(),
        from: '+1234567890',
        to: '+0987654321',
        price: '-0.0065',
        priceUnit: 'USD'
      };
    }
    
    return callData;
  } catch (error) {
    logger.error(`Mock call details error: ${error.message}`);
    throw new Error('Failed to fetch call details');
  }
};

/**
 * Mock recordings retrieval
 */
const getRecordings = async (callSid) => {
  try {
    logger.info(`Fetching mock recordings for call ${callSid}`);
    
    return [
      {
        sid: `rec-${callSid}-1`,
        duration: 95,
        dateCreated: new Date(Date.now() - 100000).toISOString(),
        uri: `/2010-04-01/Accounts/mock/Recordings/rec-${callSid}-1.json`,
        mediaUrl: `https://api.twilio.com/2010-04-01/Accounts/mock/Recordings/rec-${callSid}-1.mp3`
      }
    ];
  } catch (error) {
    logger.error(`Mock recordings error: ${error.message}`);
    throw new Error('Failed to fetch recordings');
  }
};

/**
 * Mock call termination
 */
const endCall = async (callSid) => {
  try {
    logger.info(`Ending mock call ${callSid}`);
    
    if (mockCallData[callSid]) {
      mockCallData[callSid].status = 'completed';
      mockCallData[callSid].endTime = new Date().toISOString();
      mockCallData[callSid].duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
    }
    
    return {
      sid: callSid,
      status: 'completed'
    };
  } catch (error) {
    logger.error(`Mock call end error: ${error.message}`);
    throw new Error('Failed to end call');
  }
};

/**
 * Mock TwiML generation
 */
const generateTwiML = (message, options = {}) => {
  logger.info(`Generating mock TwiML for message: ${message}`);
  
  // Return a simple TwiML-like response
  let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
  
  if (options.gather) {
    twiml += `<Gather input="speech" timeout="${options.timeout || 5}" action="${options.action}" method="POST">`;
    twiml += `<Say voice="${options.voice || 'Polly.Joanna'}" language="${options.language || 'en-US'}">${message}</Say>`;
    twiml += `</Gather>`;
  } else {
    twiml += `<Say voice="${options.voice || 'Polly.Joanna'}" language="${options.language || 'en-US'}">${message}</Say>`;
  }
  
  if (options.redirect) {
    twiml += `<Redirect>${options.redirect}</Redirect>`;
  }
  
  if (options.hangup) {
    twiml += `<Hangup/>`;
  }
  
  twiml += `</Response>`;
  return twiml;
};

/**
 * Mock TwiML with audio
 */
const generateTwiMLWithAudio = (audioUrl, options = {}) => {
  logger.info(`Generating mock TwiML with audio: ${audioUrl}`);
  
  let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
  
  if (options.gather) {
    twiml += `<Gather input="speech" timeout="${options.timeout || 5}" action="${options.action}" method="POST">`;
    twiml += `<Play>${audioUrl}</Play>`;
    twiml += `</Gather>`;
  } else {
    twiml += `<Play>${audioUrl}</Play>`;
  }
  
  if (options.redirect) {
    twiml += `<Redirect>${options.redirect}</Redirect>`;
  }
  
  if (options.hangup) {
    twiml += `<Hangup/>`;
  }
  
  twiml += `</Response>`;
  return twiml;
};

/**
 * Mock SMS sending
 */
const sendSMS = async (to, message) => {
  try {
    logger.info(`Mock SMS sent to ${to}: ${message}`);
    
    return {
      sid: `sms-mock-${Date.now()}`,
      status: 'sent',
      to: to,
      from: '+1234567890',
      body: message
    };
  } catch (error) {
    logger.error(`Mock SMS error: ${error.message}`);
    throw new Error('Failed to send SMS');
  }
};

/**
 * Mock webhook validation
 */
const validateWebhook = (signature, url, params) => {
  logger.info(`Mock webhook validation for ${url}`);
  return true; // Always return true for mock
};

/**
 * Get mock phone number
 */
const getPhoneNumber = () => '+1234567890';

module.exports = {
  initiateCall,
  generateTwiML,
  generateTwiMLWithAudio,
  getCallDetails,
  getRecordings,
  endCall,
  sendSMS,
  validateWebhook,
  getPhoneNumber
};
