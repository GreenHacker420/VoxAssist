const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class WebsiteAnalyzer {
  constructor() {
    this.timeout = 10000; // 10 seconds timeout
    this.userAgent = 'Mozilla/5.0 (compatible; VoxAssist-WebAnalyzer/1.0)';
  }

  async analyzeWebsite(url) {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
      }

      // Fetch website content
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract basic information
      const analysis = {
        url: url,
        title: this.extractTitle($),
        description: this.extractDescription($),
        favicon: this.extractFavicon($, parsedUrl),
        colors: this.extractColors($, html),
        fonts: this.extractFonts($),
        language: this.extractLanguage($),
        viewport: this.extractViewport($),
        socialMedia: this.extractSocialMedia($),
        branding: this.extractBranding($),
        theme: this.detectTheme($, html),
        accessibility: this.checkAccessibility($),
        performance: this.analyzePerformance(response),
        suggestions: []
      };

      // Generate suggestions based on analysis
      analysis.suggestions = this.generateSuggestions(analysis);

      return {
        success: true,
        data: analysis,
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Website analysis failed:', error);
      
      return {
        success: false,
        error: error.message,
        data: null,
        analyzedAt: new Date().toISOString()
      };
    }
  }

  extractTitle($) {
    return $('title').first().text().trim() || 
           $('meta[property="og:title"]').attr('content') || 
           $('meta[name="twitter:title"]').attr('content') || 
           'Untitled Website';
  }

  extractDescription($) {
    return $('meta[name="description"]').attr('content') || 
           $('meta[property="og:description"]').attr('content') || 
           $('meta[name="twitter:description"]').attr('content') || 
           '';
  }

  extractFavicon($, parsedUrl) {
    let favicon = $('link[rel="icon"]').attr('href') || 
                  $('link[rel="shortcut icon"]').attr('href') || 
                  $('link[rel="apple-touch-icon"]').attr('href') ||
                  '/favicon.ico';

    // Convert relative URLs to absolute
    if (favicon && !favicon.startsWith('http')) {
      if (favicon.startsWith('//')) {
        favicon = parsedUrl.protocol + favicon;
      } else if (favicon.startsWith('/')) {
        favicon = `${parsedUrl.protocol}//${parsedUrl.host}${favicon}`;
      } else {
        favicon = `${parsedUrl.protocol}//${parsedUrl.host}/${favicon}`;
      }
    }

    return favicon;
  }

  extractColors($, html) {
    const colors = new Set();
    
    // Extract colors from CSS
    const cssColorRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    const rgbColorRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
    
    let match;
    while ((match = cssColorRegex.exec(html)) !== null) {
      colors.add(match[0].toUpperCase());
    }
    
    while ((match = rgbColorRegex.exec(html)) !== null) {
      const hex = this.rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
      colors.add(hex);
    }

    // Extract theme colors from meta tags
    const themeColor = $('meta[name="theme-color"]').attr('content');
    if (themeColor) colors.add(themeColor.toUpperCase());

    // Extract colors from common CSS properties
    $('*').each((i, elem) => {
      const style = $(elem).attr('style');
      if (style) {
        const colorMatches = style.match(cssColorRegex) || [];
        colorMatches.forEach(color => colors.add(color.toUpperCase()));
      }
    });

    return Array.from(colors).slice(0, 10); // Return top 10 colors
  }

  extractFonts($) {
    const fonts = new Set();
    
    // Extract from Google Fonts links
    $('link[href*="fonts.googleapis.com"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const fontMatch = href.match(/family=([^&:]+)/);
      if (fontMatch) {
        fonts.add(fontMatch[1].replace(/\+/g, ' '));
      }
    });

    // Extract from CSS font-family declarations
    $('*').each((i, elem) => {
      const style = $(elem).attr('style');
      if (style && style.includes('font-family')) {
        const fontMatch = style.match(/font-family:\s*([^;]+)/);
        if (fontMatch) {
          const fontFamily = fontMatch[1].replace(/['"]/g, '').split(',')[0].trim();
          if (fontFamily && !fontFamily.includes('serif') && !fontFamily.includes('sans-serif')) {
            fonts.add(fontFamily);
          }
        }
      }
    });

    return Array.from(fonts).slice(0, 5);
  }

  extractLanguage($) {
    return $('html').attr('lang') || 
           $('meta[http-equiv="content-language"]').attr('content') || 
           'en';
  }

  extractViewport($) {
    return $('meta[name="viewport"]').attr('content') || '';
  }

  extractSocialMedia($) {
    return {
      ogImage: $('meta[property="og:image"]').attr('content'),
      twitterCard: $('meta[name="twitter:card"]').attr('content'),
      twitterSite: $('meta[name="twitter:site"]').attr('content'),
    };
  }

  extractBranding($) {
    const brandElements = {
      logo: $('img[alt*="logo" i], img[class*="logo" i], img[id*="logo" i]').first().attr('src'),
      brandName: $('meta[property="og:site_name"]').attr('content') || 
                 $('.brand, .logo, .site-title').first().text().trim(),
    };

    return brandElements;
  }

  detectTheme($, html) {
    const darkKeywords = ['dark', 'night', 'black'];
    const lightKeywords = ['light', 'white', 'bright'];
    
    const bodyClass = $('body').attr('class') || '';
    const htmlClass = $('html').attr('class') || '';
    const classes = (bodyClass + ' ' + htmlClass).toLowerCase();
    
    if (darkKeywords.some(keyword => classes.includes(keyword))) {
      return 'dark';
    } else if (lightKeywords.some(keyword => classes.includes(keyword))) {
      return 'light';
    }
    
    return 'auto';
  }

  checkAccessibility($) {
    const issues = [];
    
    // Check for alt attributes on images
    const imagesWithoutAlt = $('img:not([alt])').length;
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images missing alt attributes`);
    }

    // Check for heading structure
    const headings = $('h1, h2, h3, h4, h5, h6').length;
    if (headings === 0) {
      issues.push('No heading elements found');
    }

    return {
      score: Math.max(0, 100 - (issues.length * 20)),
      issues
    };
  }

  analyzePerformance(response) {
    const contentLength = response.headers['content-length'] || 0;
    const responseTime = response.config.metadata?.endTime - response.config.metadata?.startTime || 0;
    
    return {
      contentLength: parseInt(contentLength),
      responseTime,
      compression: response.headers['content-encoding'] || 'none'
    };
  }

  generateSuggestions(analysis) {
    const suggestions = [];

    // Color suggestions
    if (analysis.colors.length > 0) {
      suggestions.push({
        type: 'color',
        title: 'Brand Colors Detected',
        description: `We found ${analysis.colors.length} brand colors. Consider using ${analysis.colors[0]} as your primary widget color.`,
        action: 'apply_primary_color',
        value: analysis.colors[0]
      });
    }

    // Theme suggestions
    if (analysis.theme !== 'auto') {
      suggestions.push({
        type: 'theme',
        title: `${analysis.theme.charAt(0).toUpperCase() + analysis.theme.slice(1)} Theme Detected`,
        description: `Your website uses a ${analysis.theme} theme. We recommend matching your widget theme.`,
        action: 'apply_theme',
        value: analysis.theme
      });
    }

    // Position suggestions based on layout
    suggestions.push({
      type: 'position',
      title: 'Optimal Widget Position',
      description: 'Based on your website layout, we recommend placing the widget in the bottom-right corner for maximum visibility.',
      action: 'apply_position',
      value: 'bottom-right'
    });

    return suggestions;
  }

  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
}

module.exports = new WebsiteAnalyzer();
