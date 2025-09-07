const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { getLanguageStats, i18nService } = require('../middleware/i18n');
const logger = require('../utils/logger');

// Language switching endpoint
router.post('/switch', authenticateToken, validate('languageSwitch'), asyncHandler(async (req, res) => {
  const { language } = req.body;
  
  if (!['en', 'hi'].includes(language)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported language. Supported languages: en, hi'
    });
  }

  // Update user's language preference
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.user.update({
    where: { id: req.user.userId },
    data: { preferredLanguage: language }
  });

  logger.info(`Language switched to ${language} for user ${req.user.userId}`);

  res.json({
    success: true,
    message: 'Language preference updated successfully',
    data: {
      language: language,
      languageInfo: i18nService.getCurrentLanguageInfo(),
      supportedLanguages: i18nService.getSupportedLanguages()
    }
  });
}));

// Get supported languages
router.get('/languages', asyncHandler(async (req, res) => {
  const languages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      region: 'US'
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      direction: 'ltr',
      region: 'IN'
    }
  ];

  res.json({
    success: true,
    data: {
      languages: languages,
      default: 'en'
    }
  });
}));

// Get user's current language preference
router.get('/preference', authenticateToken, asyncHandler(async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { preferredLanguage: true }
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const preferredLanguage = user.preferredLanguage || 'en';

  res.json({
    success: true,
    data: {
      preferredLanguage: preferredLanguage,
      currentLanguage: req.language || preferredLanguage,
      languageInfo: i18nService.getCurrentLanguageInfo()
    }
  });
}));

// Get translation for specific key
router.get('/translate/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { params } = req.query;
  
  let translationParams = {};
  if (params) {
    try {
      translationParams = JSON.parse(params);
    } catch (error) {
      logger.warn('Invalid translation parameters:', params);
    }
  }

  const translation = req.t(key, translationParams);

  res.json({
    success: true,
    data: {
      key: key,
      translation: translation,
      language: req.language,
      params: translationParams
    }
  });
}));

// Get all translations for current language
router.get('/translations', asyncHandler(async (req, res) => {
  const translations = i18nService.getAllTranslations();

  res.json({
    success: true,
    data: {
      language: req.language,
      translations: translations,
      count: Object.keys(translations).length
    }
  });
}));

// Language detection endpoint
router.post('/detect', asyncHandler(async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required for language detection'
    });
  }

  const detectedLanguage = i18nService.detectLanguage(text);
  const confidence = calculateDetectionConfidence(text, detectedLanguage);

  res.json({
    success: true,
    data: {
      text: text,
      detectedLanguage: detectedLanguage,
      confidence: confidence,
      supportedLanguages: i18nService.getSupportedLanguages()
    }
  });
}));

// Language statistics (admin only)
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const stats = await getLanguageStats();

  res.json({
    success: true,
    data: {
      languageStats: stats,
      totalUsers: stats.reduce((sum, stat) => sum + stat.user_count, 0),
      supportedLanguages: i18nService.getSupportedLanguages()
    }
  });
}));

// Voice settings for current language
router.get('/voice-settings', asyncHandler(async (req, res) => {
  const voiceSettings = i18nService.getVoiceSettings();
  const speechSettings = i18nService.getSpeechSettings();

  res.json({
    success: true,
    data: {
      language: req.language,
      voiceSettings: voiceSettings,
      speechSettings: speechSettings
    }
  });
}));

// Format number according to language locale
router.post('/format/number', asyncHandler(async (req, res) => {
  const { number, options = {} } = req.body;
  
  if (typeof number !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Valid number is required'
    });
  }

  const formatted = i18nService.formatNumber(number, options);

  res.json({
    success: true,
    data: {
      original: number,
      formatted: formatted,
      language: req.language,
      options: options
    }
  });
}));

// Format date according to language locale
router.post('/format/date', asyncHandler(async (req, res) => {
  const { date, options = {} } = req.body;
  
  let dateObj;
  try {
    dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Valid date is required'
    });
  }

  const formatted = i18nService.formatDate(dateObj, options);

  res.json({
    success: true,
    data: {
      original: date,
      formatted: formatted,
      language: req.language,
      options: options
    }
  });
}));

/**
 * Calculate confidence score for language detection
 */
function calculateDetectionConfidence(text, detectedLanguage) {
  const hindiPattern = /[\u0900-\u097F]/g;
  const englishPattern = /[a-zA-Z]/g;
  
  const hindiMatches = (text.match(hindiPattern) || []).length;
  const englishMatches = (text.match(englishPattern) || []).length;
  const totalChars = text.length;

  if (detectedLanguage === 'hi') {
    return Math.min(0.95, (hindiMatches / totalChars) * 1.2);
  } else if (detectedLanguage === 'en') {
    return Math.min(0.95, (englishMatches / totalChars) * 1.1);
  }

  return 0.5; // Default confidence
}

module.exports = router;
