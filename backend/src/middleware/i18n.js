const i18nService = require('../services/i18nService');
const logger = require('../utils/logger');

/**
 * I18n Middleware for Multi-Language Request Handling
 */

/**
 * Language detection and setup middleware
 */
const setupI18n = () => {
  return (req, res, next) => {
    // Detect language from various sources
    const languageFromHeader = req.headers['accept-language'];
    const languageFromQuery = req.query.lang;
    const languageFromBody = req.body?.language;
    const languageFromUser = req.user?.preferredLanguage;

    // Priority: user preference > query param > body > header
    let detectedLanguage = languageFromUser || 
                          languageFromQuery || 
                          languageFromBody || 
                          parseAcceptLanguage(languageFromHeader);

    // Validate and set language
    if (detectedLanguage && i18nService.setLanguage(detectedLanguage)) {
      req.language = detectedLanguage;
    } else {
      req.language = 'en'; // Default to English
      i18nService.setLanguage('en');
    }

    // Add i18n helper functions to request
    req.t = (key, params) => i18nService.translate(key, params);
    req.tc = (key, context) => i18nService.translateWithContext(key, context);
    req.detectLanguage = (text) => i18nService.detectLanguage(text);
    req.autoSwitchLanguage = (text) => i18nService.autoSwitchLanguage(text);
    req.formatNumber = (number, options) => i18nService.formatNumber(number, options);
    req.formatDate = (date, options) => i18nService.formatDate(date, options);
    req.getVoiceSettings = () => i18nService.getVoiceSettings();
    req.getSpeechSettings = () => i18nService.getSpeechSettings();

    // Add language info to response headers
    res.set('Content-Language', req.language);
    res.set('X-Supported-Languages', i18nService.getSupportedLanguages().join(','));

    next();
  };
};

/**
 * Parse Accept-Language header
 */
const parseAcceptLanguage = (acceptLanguage) => {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const parts = lang.trim().split(';');
      const code = parts[0].split('-')[0]; // Get base language code
      const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
      return { code, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Return the highest quality supported language
  for (const lang of languages) {
    if (['en', 'hi'].includes(lang.code)) {
      return lang.code;
    }
  }

  return null;
};

/**
 * Voice processing language middleware
 */
const voiceLanguageMiddleware = () => {
  return async (req, res, next) => {
    // Auto-detect language from speech input if available
    if (req.body.speechResult) {
      const detectedLang = req.detectLanguage(req.body.speechResult);
      if (detectedLang !== req.language) {
        logger.info(`Language auto-switched from ${req.language} to ${detectedLang}`);
        req.language = detectedLang;
        i18nService.setLanguage(detectedLang);
      }
    }

    // Add voice-specific settings to request
    req.voiceSettings = req.getVoiceSettings();
    req.speechSettings = req.getSpeechSettings();

    next();
  };
};

/**
 * Response localization middleware
 */
const localizeResponse = () => {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      // Localize response data if it contains translatable content
      if (data && typeof data === 'object') {
        data = localizeResponseData(data, req);
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Localize response data recursively
 */
const localizeResponseData = (data, req) => {
  if (Array.isArray(data)) {
    return data.map(item => localizeResponseData(item, req));
  }

  if (data && typeof data === 'object') {
    const localized = { ...data };

    // Localize specific fields
    if (localized.message && typeof localized.message === 'string') {
      // Try to translate if it looks like a translation key
      if (localized.message.includes('_') && !localized.message.includes(' ')) {
        localized.message = req.t(localized.message);
      }
    }

    if (localized.error && typeof localized.error === 'string') {
      // Try to translate error messages
      if (localized.error.includes('_') && !localized.error.includes(' ')) {
        localized.error = req.t(localized.error);
      }
    }

    // Localize dates and numbers
    if (localized.createdAt) {
      localized.createdAtFormatted = req.formatDate(new Date(localized.createdAt), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    if (localized.amount && typeof localized.amount === 'number') {
      localized.amountFormatted = req.formatNumber(localized.amount, {
        style: 'currency',
        currency: req.language === 'hi' ? 'INR' : 'USD'
      });
    }

    // Recursively localize nested objects
    for (const [key, value] of Object.entries(localized)) {
      if (value && typeof value === 'object') {
        localized[key] = localizeResponseData(value, req);
      }
    }

    return localized;
  }

  return data;
};

/**
 * Language preference storage middleware
 */
const storeLanguagePreference = () => {
  return async (req, res, next) => {
    // Store user's language preference if authenticated
    if (req.user && req.language && req.user.preferredLanguage !== req.language) {
      try {
        const { db } = require('../database/connection');
        await db.query(
          'UPDATE users SET preferred_language = ? WHERE id = ?',
          [req.language, req.user.userId]
        );
        
        logger.info(`Updated language preference for user ${req.user.userId}: ${req.language}`);
      } catch (error) {
        logger.error('Failed to store language preference:', error);
      }
    }

    next();
  };
};

/**
 * Get language statistics
 */
const getLanguageStats = async () => {
  try {
    const { db } = require('../database/connection');
    
    const stats = await db.query(`
      SELECT 
        preferred_language,
        COUNT(*) as user_count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users WHERE preferred_language IS NOT NULL)) as percentage
      FROM users 
      WHERE preferred_language IS NOT NULL
      GROUP BY preferred_language
      ORDER BY user_count DESC
    `);

    return stats.rows;
  } catch (error) {
    logger.error('Failed to get language statistics:', error);
    return [];
  }
};

/**
 * Language switching endpoint middleware
 */
const handleLanguageSwitch = () => {
  return (req, res, next) => {
    if (req.method === 'POST' && req.path === '/switch-language') {
      const { language } = req.body;
      
      if (!language || !['en', 'hi'].includes(language)) {
        return res.status(400).json({
          success: false,
          error: req.t('invalid_language')
        });
      }

      req.language = language;
      i18nService.setLanguage(language);

      return res.json({
        success: true,
        message: req.t('language_switched'),
        language: language,
        languageInfo: i18nService.getCurrentLanguageInfo()
      });
    }

    next();
  };
};

module.exports = {
  setupI18n,
  voiceLanguageMiddleware,
  localizeResponse,
  storeLanguagePreference,
  handleLanguageSwitch,
  getLanguageStats,
  i18nService
};
