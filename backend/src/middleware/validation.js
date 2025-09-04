const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas
const schemas = {
  // Authentication schemas
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
    role: Joi.string().valid('user', 'admin', 'agent').default('user')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional()
  }).min(1),

  // Voice processing schemas
  twilioWebhook: Joi.object({
    CallSid: Joi.string().required(),
    From: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    To: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    CallStatus: Joi.string().valid('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled').optional(),
    Direction: Joi.string().valid('inbound', 'outbound').optional()
  }),

  speechInput: Joi.object({
    callSid: Joi.string().required(),
    speechResult: Joi.string().min(1).max(1000).required(),
    confidence: Joi.number().min(0).max(1).optional()
  }),

  // Analytics schemas
  analyticsQuery: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    period: Joi.string().valid('1d', '7d', '30d', '90d').default('7d'),
    organizationId: Joi.number().integer().positive().optional()
  }),

  // Knowledge base schemas
  knowledgeBase: Joi.object({
    category: Joi.string().min(2).max(100).required(),
    question: Joi.string().min(5).max(500).required(),
    answer: Joi.string().min(10).max(2000).required(),
    keywords: Joi.array().items(Joi.string().min(2).max(50)).min(1).max(20).required(),
    priority: Joi.number().integer().min(1).max(10).default(1),
    active: Joi.boolean().default(true)
  }),

  // Call feedback schema
  callFeedback: Joi.object({
    callId: Joi.number().integer().positive().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().max(1000).optional(),
    category: Joi.string().valid('technical', 'billing', 'general', 'complaint').optional()
  }),

  // Language switching schema
  languageSwitch: Joi.object({
    language: Joi.string().valid('en', 'hi').required().messages({
      'any.only': 'Language must be either "en" (English) or "hi" (Hindi)',
      'any.required': 'Language is required'
    })
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn(`Validation failed for ${schemaName}:`, errorMessages);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Query parameter validation
const validateQuery = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Query validation schema '${schemaName}' not found`);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }

    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: errorMessages
      });
    }

    req.query = value;
    next();
  };
};

// Custom validation for file uploads
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        error: 'File upload is required'
      });
    }

    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
        });
      }

      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
};

// Sanitization helpers
const sanitizeInput = {
  // Remove potentially dangerous characters
  cleanString: (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  },

  // Clean phone numbers
  cleanPhone: (phone) => {
    if (typeof phone !== 'string') return phone;
    return phone.replace(/[^\d+]/g, '');
  },

  // Clean email
  cleanEmail: (email) => {
    if (typeof email !== 'string') return email;
    return email.toLowerCase().trim();
  }
};

module.exports = {
  validate,
  validateQuery,
  validateFileUpload,
  sanitizeInput,
  schemas
};
