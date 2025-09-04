const logger = require('../utils/logger');

/**
 * Internationalization Service for Multi-Language Support
 * Supports English and Hindi with dynamic language switching
 */

// Module state
let currentLanguage = 'en';
const fallbackLanguage = 'en';
const translations = new Map();

/**
 * Load translation data
 */
const loadTranslations = () => {
  // English translations
  translations.set('en', {
      // Common phrases
      greeting: 'Hello! How can I help you today?',
      goodbye: 'Thank you for calling. Have a great day!',
      hold_please: 'Please hold while I look that up for you.',
      transfer_agent: 'Let me transfer you to a human agent.',
      not_understand: 'I\'m sorry, I didn\'t understand that. Could you please repeat?',
      
      // Business responses
      business_hours: 'Our business hours are Monday to Friday, 9 AM to 6 PM.',
      contact_info: 'You can reach us at support@voxassist.com or call us at +1-800-VOXASSIST.',
      technical_support: 'For technical support, I can help you troubleshoot or connect you with our tech team.',
      billing_inquiry: 'For billing questions, let me access your account information.',
      
      // Error messages
      system_error: 'I\'m experiencing a technical issue. Please try again in a moment.',
      connection_lost: 'I\'m sorry, we seem to have lost connection. Please call back.',
      invalid_input: 'I didn\'t catch that. Could you please speak clearly?',
      
      // Voice prompts
      speak_after_beep: 'Please speak after the beep.',
      recording_started: 'Recording started.',
      recording_stopped: 'Recording stopped.',
      processing_request: 'Processing your request...',
      
      // Customer service
      satisfaction_survey: 'Would you like to take a quick satisfaction survey?',
      callback_offer: 'Would you like us to call you back when an agent is available?',
      escalation_notice: 'I\'m escalating your call to a supervisor.',
      
      // Product information
      product_features: 'Our AI voice assistant can help with customer support, sales, and technical queries.',
      pricing_info: 'For pricing information, let me connect you with our sales team.',
      demo_request: 'I can schedule a demo for you. What time works best?',
      
      // Appointment scheduling
      schedule_appointment: 'I can help you schedule an appointment. What date works for you?',
      confirm_appointment: 'Your appointment is confirmed for {date} at {time}.',
      reschedule_appointment: 'I can help you reschedule. What new date would you prefer?',
      
      // Order management
      order_status: 'Let me check your order status. Can you provide your order number?',
      track_shipment: 'Your order is currently {status} and will arrive by {date}.',
      return_policy: 'Our return policy allows returns within 30 days of purchase.',
      
      // Account management
      account_verification: 'For security, I need to verify your account. Can you provide your email?',
      password_reset: 'I can help you reset your password. Check your email for instructions.',
      profile_update: 'I can help you update your profile information.',
      
      // Emergency responses
      emergency_transfer: 'This sounds urgent. Let me immediately connect you with our emergency support.',
      priority_handling: 'I\'m marking this as high priority and escalating immediately.'
    });

  // Hindi translations (Devanagari script)
  translations.set('hi', {
      // Common phrases
      greeting: 'नमस्ते! आज मैं आपकी कैसे सहायता कर सकता हूँ?',
      goodbye: 'कॉल करने के लिए धन्यवाद। आपका दिन शुभ हो!',
      hold_please: 'कृपया प्रतीक्षा करें जब तक मैं आपके लिए जानकारी देखता हूँ।',
      transfer_agent: 'मैं आपको एक मानव एजेंट से जोड़ता हूँ।',
      not_understand: 'क्षमा करें, मैं समझ नहीं पाया। कृपया दोहराएं?',
      
      // Business responses
      business_hours: 'हमारे व्यावसायिक घंटे सोमवार से शुक्रवार, सुबह 9 बजे से शाम 6 बजे तक हैं।',
      contact_info: 'आप हमसे support@voxassist.com पर संपर्क कर सकते हैं या +1-800-VOXASSIST पर कॉल कर सकते हैं।',
      technical_support: 'तकनीकी सहायता के लिए, मैं आपकी समस्या निवारण में मदद कर सकता हूँ या आपको हमारी तकनीकी टीम से जोड़ सकता हूँ।',
      billing_inquiry: 'बिलिंग प्रश्नों के लिए, मैं आपकी खाता जानकारी देखता हूँ।',
      
      // Error messages
      system_error: 'मुझे तकनीकी समस्या हो रही है। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
      connection_lost: 'क्षमा करें, कनेक्शन टूट गया है। कृपया वापस कॉल करें।',
      invalid_input: 'मैं समझ नहीं पाया। कृपया स्पष्ट रूप से बोलें?',
      
      // Voice prompts
      speak_after_beep: 'कृपया बीप के बाद बोलें।',
      recording_started: 'रिकॉर्डिंग शुरू हुई।',
      recording_stopped: 'रिकॉर्डिंग बंद हुई।',
      processing_request: 'आपका अनुरोध प्रोसेस हो रहा है...',
      
      // Customer service
      satisfaction_survey: 'क्या आप एक संक्षिप्त संतुष्टि सर्वेक्षण लेना चाहेंगे?',
      callback_offer: 'क्या आप चाहते हैं कि जब एजेंट उपलब्ध हो तो हम आपको वापस कॉल करें?',
      escalation_notice: 'मैं आपकी कॉल को सुपरवाइजर को भेज रहा हूँ।',
      
      // Product information
      product_features: 'हमारा AI वॉयस असिस्टेंट ग्राहक सहायता, बिक्री और तकनीकी प्रश्नों में मदद कर सकता है।',
      pricing_info: 'मूल्य निर्धारण की जानकारी के लिए, मैं आपको हमारी बिक्री टीम से जोड़ता हूँ।',
      demo_request: 'मैं आपके लिए डेमो शेड्यूल कर सकता हूँ। कौन सा समय सबसे अच्छा है?',
      
      // Appointment scheduling
      schedule_appointment: 'मैं अपॉइंटमेंट शेड्यूल करने में मदद कर सकता हूँ। कौन सी तारीख आपके लिए ठीक है?',
      confirm_appointment: 'आपका अपॉइंटमेंट {date} को {time} बजे कन्फर्म है।',
      reschedule_appointment: 'मैं रीशेड्यूल करने में मदद कर सकता हूँ। कौन सी नई तारीख आप पसंद करेंगे?',
      
      // Order management
      order_status: 'मैं आपके ऑर्डर की स्थिति देखता हूँ। कृपया अपना ऑर्डर नंबर बताएं?',
      track_shipment: 'आपका ऑर्डर वर्तमान में {status} है और {date} तक पहुंच जाएगा।',
      return_policy: 'हमारी वापसी नीति खरीदारी के 30 दिनों के भीतर वापसी की अनुमति देती है।',
      
      // Account management
      account_verification: 'सुरक्षा के लिए, मुझे आपके खाते की पुष्टि करनी होगी। कृपया अपना ईमेल बताएं?',
      password_reset: 'मैं पासवर्ड रीसेट करने में मदद कर सकता हूँ। निर्देशों के लिए अपना ईमेल चेक करें।',
      profile_update: 'मैं आपकी प्रोफाइल जानकारी अपडेट करने में मदद कर सकता हूँ।',
      
      // Emergency responses
      emergency_transfer: 'यह जरूरी लगता है। मैं तुरंत आपको हमारी आपातकालीन सहायता से जोड़ता हूँ।',
      priority_handling: 'मैं इसे उच्च प्राथमिकता के रूप में चिह्नित कर रहा हूँ और तुरंत एस्केलेट कर रहा हूँ।'
  });

  logger.info('I18n translations loaded for languages: en, hi');
};

/**
 * Set current language
 */
const setLanguage = (languageCode) => {
  if (translations.has(languageCode)) {
    currentLanguage = languageCode;
    logger.info(`Language switched to: ${languageCode}`);
    return true;
  }
  logger.warn(`Unsupported language code: ${languageCode}`);
  return false;
};

/**
 * Get translation for a key
 */
const translate = (key, params = {}) => {
  const langTranslations = translations.get(currentLanguage) || 
                          translations.get(fallbackLanguage);
  
  let translation = langTranslations[key];
  
  if (!translation) {
    logger.warn(`Translation not found for key: ${key} in language: ${currentLanguage}`);
    return key; // Return key as fallback
  }

  // Replace parameters in translation
  for (const [param, value] of Object.entries(params)) {
    translation = translation.replace(`{${param}}`, value);
  }

  return translation;
};

/**
 * Get all translations for current language
 */
const getAllTranslations = () => {
  return translations.get(currentLanguage) || {};
};

/**
 * Detect language from text input
 */
const detectLanguage = (text) => {
  // Simple language detection based on character sets
  const hindiPattern = /[\u0900-\u097F]/; // Devanagari Unicode range
  const englishPattern = /[a-zA-Z]/;

  if (hindiPattern.test(text)) {
    return 'hi';
  } else if (englishPattern.test(text)) {
    return 'en';
  }

  return currentLanguage; // Default to current language
};

/**
 * Auto-switch language based on input
 */
const autoSwitchLanguage = (text) => {
  const detectedLanguage = detectLanguage(text);
  if (detectedLanguage !== currentLanguage) {
    setLanguage(detectedLanguage);
    return detectedLanguage;
  }
  return currentLanguage;
};

/**
 * Get supported languages
 */
const getSupportedLanguages = () => {
  return Array.from(translations.keys());
};

/**
 * Format numbers according to language locale
 */
const formatNumber = (number, options = {}) => {
  const locales = {
    'en': 'en-US',
    'hi': 'hi-IN'
  };

  const locale = locales[currentLanguage] || locales['en'];
  return new Intl.NumberFormat(locale, options).format(number);
};

/**
 * Format dates according to language locale
 */
const formatDate = (date, options = {}) => {
  const locales = {
    'en': 'en-US',
    'hi': 'hi-IN'
  };

  const locale = locales[currentLanguage] || locales['en'];
  return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Get language-specific voice settings for TTS
 */
const getVoiceSettings = () => {
  const voiceSettings = {
    'en': {
      voice: 'en-US-AriaNeural',
      rate: '0.9',
      pitch: '0',
      language: 'en-US'
    },
    'hi': {
      voice: 'hi-IN-SwaraNeural',
      rate: '0.8',
      pitch: '0',
      language: 'hi-IN'
    }
  };

  return voiceSettings[currentLanguage] || voiceSettings['en'];
};

/**
 * Get language-specific STT settings
 */
const getSpeechSettings = () => {
  const speechSettings = {
    'en': {
      language: 'en-US',
      model: 'latest_long',
      enhanced: true
    },
    'hi': {
      language: 'hi-IN',
      model: 'latest_long',
      enhanced: true
    }
  };

  return speechSettings[currentLanguage] || speechSettings['en'];
};

/**
 * Translate dynamic content with context
 */
const translateWithContext = (key, context = {}) => {
  const translation = translate(key, context);
  
  // Add language-specific formatting
  if (currentLanguage === 'hi') {
    // Add respectful suffixes for Hindi
    if (key.includes('greeting') || key.includes('goodbye')) {
      return translation + ' 🙏';
    }
  }

  return translation;
};

/**
 * Get current language info
 */
const getCurrentLanguageInfo = () => {
  const languageInfo = {
    'en': {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      region: 'US'
    },
    'hi': {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      direction: 'ltr',
      region: 'IN'
    }
  };

  return languageInfo[currentLanguage] || languageInfo['en'];
};

// Initialize translations on module load
loadTranslations();

// Export all functions
module.exports = {
  loadTranslations,
  setLanguage,
  translate,
  getAllTranslations,
  detectLanguage,
  autoSwitchLanguage,
  getSupportedLanguages,
  formatNumber,
  formatDate,
  getVoiceSettings,
  getSpeechSettings,
  translateWithContext,
  getCurrentLanguageInfo,
  getCurrentLanguage: () => currentLanguage,
  getFallbackLanguage: () => fallbackLanguage
};
