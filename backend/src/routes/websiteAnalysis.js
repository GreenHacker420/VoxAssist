const express = require('express');
const websiteAnalyzer = require('../services/websiteAnalyzer');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateAnalysisRequest = [
  body('url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid HTTP or HTTPS URL')
    .isLength({ max: 2048 })
    .withMessage('URL is too long'),
  body('options.timeout')
    .optional()
    .isInt({ min: 1000, max: 30000 })
    .withMessage('Timeout must be between 1000 and 30000 milliseconds'),
  body('options.includePerformance')
    .optional()
    .isBoolean()
    .withMessage('includePerformance must be a boolean'),
];

/**
 * @route POST /api/website-analysis/analyze
 * @desc Analyze a website for widget integration
 * @access Private (requires authentication)
 */
router.post('/analyze', validateAnalysisRequest, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { url, options = {} } = req.body;

    // Log the analysis request
    console.log(`Website analysis requested for: ${url}`);

    // Perform the analysis
    const result = await websiteAnalyzer.analyzeWebsite(url);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        url: url,
        analyzedAt: result.analyzedAt
      });
    }

    // Filter sensitive information if needed
    const filteredData = {
      ...result.data,
      // Remove any potentially sensitive data
      performance: options.includePerformance ? result.data.performance : undefined
    };

    res.json({
      success: true,
      data: filteredData,
      url: url,
      analyzedAt: result.analyzedAt,
      cached: false // TODO: Implement caching
    });

  } catch (error) {
    console.error('Website analysis error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during website analysis',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/website-analysis/validate-url
 * @desc Validate if a URL is accessible for analysis
 * @access Private
 */
router.get('/validate-url', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }

    // Basic URL validation
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        valid: false
      });
    }

    // Quick accessibility check (HEAD request)
    const axios = require('axios');
    try {
      await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VoxAssist-URLValidator/1.0)'
        }
      });

      res.json({
        success: true,
        valid: true,
        url: url,
        message: 'URL is accessible'
      });

    } catch (error) {
      res.json({
        success: true,
        valid: false,
        url: url,
        message: 'URL may not be accessible',
        error: error.response?.status || 'Connection failed'
      });
    }

  } catch (error) {
    console.error('URL validation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during URL validation'
    });
  }
});

/**
 * @route GET /api/website-analysis/suggestions/:domain
 * @desc Get cached suggestions for a domain
 * @access Private
 */
router.get('/suggestions/:domain', async (req, res) => {
  try {
    const { domain } = req.params;

    // TODO: Implement caching and suggestion retrieval
    // For now, return empty suggestions
    res.json({
      success: true,
      domain: domain,
      suggestions: [],
      cached: false,
      message: 'No cached suggestions available'
    });

  } catch (error) {
    console.error('Suggestions retrieval error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during suggestions retrieval'
    });
  }
});

module.exports = router;
