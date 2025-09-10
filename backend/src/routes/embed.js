const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Embeddable Widget Routes
 * Provides cross-domain widget embedding functionality
 */

// CORS configuration for widget embedding
const widgetCorsOptions = {
  origin: true, // Allow all origins for widget embedding
  credentials: false, // No credentials needed for public widgets
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-widget-id', 'x-api-key'],
  exposedHeaders: ['x-widget-version']
};

// Apply CORS to all widget embed routes
router.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-widget-id, x-api-key');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('X-Frame-Options', 'ALLOWALL'); // Allow embedding in iframes
  res.header('Content-Security-Policy', "frame-ancestors *"); // Allow all frame ancestors
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * GET /embed/widget.js - Main widget JavaScript file
 * This is the core embeddable script that websites include
 */
router.get('/widget.js', async (req, res) => {
  try {
    const widgetId = req.query.id;
    const version = req.query.v || 'latest';
    
    if (!widgetId) {
      return res.status(400).send('// Error: Widget ID required');
    }

    // Get widget configuration
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: { organization: true }
    });

    if (!widget || !widget.isActive) {
      return res.status(404).send('// Error: Widget not found or inactive');
    }

    // Generate the widget JavaScript
    const widgetScript = await generateWidgetScript(widget, req.headers.origin);
    
    res.set({
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Widget-Version': version,
      'X-Widget-ID': widgetId
    });
    
    res.send(widgetScript);

  } catch (error) {
    logger.error('Widget script generation error:', error);
    res.status(500).send('// Error: Failed to load widget');
  }
});

/**
 * GET /embed/widget/:id/config - Widget configuration endpoint
 */
router.get('/widget/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const origin = req.headers.origin;

    const widget = await prisma.widget.findUnique({
      where: { id },
      include: { organization: true }
    });

    if (!widget || !widget.isActive) {
      return res.status(404).json({ error: 'Widget not found or inactive' });
    }

    // Check domain restrictions if configured
    if (widget.permissions.domainRestrictions && widget.permissions.domainRestrictions.length > 0) {
      const allowed = widget.permissions.domainRestrictions.some(domain => 
        origin && origin.includes(domain)
      );
      
      if (!allowed) {
        return res.status(403).json({ error: 'Domain not authorized' });
      }
    }

    // Return sanitized widget configuration
    res.json({
      id: widget.id,
      name: widget.name,
      appearance: widget.appearance,
      behavior: {
        ...widget.behavior,
        // Remove sensitive behavior settings
        apiEndpoints: undefined,
        internalSettings: undefined
      },
      permissions: {
        collectPersonalData: widget.permissions.collectPersonalData,
        storeCookies: widget.permissions.storeCookies,
        recordAudio: widget.permissions.recordAudio
      },
      organization: {
        name: widget.organization.name,
        // Don't expose sensitive org data
        id: undefined,
        apiKeys: undefined
      }
    });

  } catch (error) {
    logger.error('Widget config error:', error);
    res.status(500).json({ error: 'Failed to load widget configuration' });
  }
});

/**
 * GET /embed/widget/:id/iframe - Widget iframe content
 */
router.get('/widget/:id/iframe', async (req, res) => {
  try {
    const { id } = req.params;
    const origin = req.headers.origin;

    const widget = await prisma.widget.findUnique({
      where: { id },
      include: { organization: true }
    });

    if (!widget || !widget.isActive) {
      return res.status(404).send('<html><body>Widget not found</body></html>');
    }

    // Generate iframe HTML content
    const iframeContent = await generateIframeContent(widget, origin);
    
    res.set({
      'Content-Type': 'text/html',
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'no-cache'
    });
    
    res.send(iframeContent);

  } catch (error) {
    logger.error('Widget iframe error:', error);
    res.status(500).send('<html><body>Error loading widget</body></html>');
  }
});

/**
 * POST /embed/widget/:id/session - Initialize widget session
 */
router.post('/widget/:id/session', async (req, res) => {
  try {
    const { id } = req.params;
    const { contextUrl, userAgent, referrer } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const origin = req.headers.origin;

    const widget = await prisma.widget.findUnique({
      where: { id },
      include: { organization: true }
    });

    if (!widget || !widget.isActive) {
      return res.status(404).json({ error: 'Widget not found or inactive' });
    }

    // Generate session ID
    const sessionId = require('uuid').v4();
    const visitorId = req.headers['x-visitor-id'] || require('uuid').v4();

    // Create widget session
    const session = await prisma.widgetSession.create({
      data: {
        sessionId,
        widgetId: widget.id,
        visitorId,
        ipAddress,
        userAgent,
        referrerUrl: referrer || origin,
        contextUrl: contextUrl || origin,
        metadata: {
          origin,
          timestamp: new Date().toISOString()
        }
      }
    });

    res.json({
      sessionId,
      visitorId,
      widgetConfig: {
        appearance: widget.appearance,
        behavior: widget.behavior,
        permissions: widget.permissions
      }
    });

  } catch (error) {
    logger.error('Widget session initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

/**
 * POST /embed/widget/:id/message - Handle widget messages
 */
router.post('/widget/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, content, type = 'text' } = req.body;

    if (!sessionId || !content) {
      return res.status(400).json({ error: 'Session ID and content required' });
    }

    // Get session
    const session = await prisma.widgetSession.findUnique({
      where: { sessionId },
      include: {
        widget: {
          include: { organization: true }
        }
      }
    });

    if (!session || session.widgetId !== id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Use existing widget controller logic
    const widgetController = require('../controllers/widgetController');
    
    // Create a mock request object for the controller
    const mockReq = {
      body: { sessionId, content },
      ip: req.ip
    };
    
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({ json: (data) => res.status(code).json(data) })
    };

    await widgetController.handleTextMessage(mockReq, mockRes);

  } catch (error) {
    logger.error('Widget message handling error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * Generate the main widget JavaScript code
 */
async function generateWidgetScript(widget, origin) {
  const config = {
    widgetId: widget.id,
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
    appearance: widget.appearance,
    behavior: widget.behavior,
    permissions: widget.permissions,
    origin: origin
  };

  return `
(function() {
  'use strict';
  
  // VoxAssist Widget Configuration
  const WIDGET_CONFIG = ${JSON.stringify(config, null, 2)};
  
  // Widget state
  let widgetState = {
    initialized: false,
    sessionId: null,
    visitorId: null,
    isOpen: false,
    isMinimized: true
  };
  
  // Create widget container
  function createWidgetContainer() {
    const container = document.createElement('div');
    container.id = 'voxassist-widget-container';
    container.style.cssText = \`
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    \`;
    
    document.body.appendChild(container);
    return container;
  }
  
  // Create widget button
  function createWidgetButton(container) {
    const button = document.createElement('button');
    button.id = 'voxassist-widget-button';
    button.innerHTML = '💬';
    button.style.cssText = \`
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: \${WIDGET_CONFIG.appearance.primaryColor};
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    \`;
    
    button.addEventListener('click', toggleWidget);
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    container.appendChild(button);
    return button;
  }
  
  // Create widget iframe
  function createWidgetIframe(container) {
    const iframe = document.createElement('iframe');
    iframe.id = 'voxassist-widget-iframe';
    iframe.src = \`\${WIDGET_CONFIG.apiBaseUrl}/embed/widget/\${WIDGET_CONFIG.widgetId}/iframe?origin=\${encodeURIComponent(window.location.origin)}\`;
    iframe.style.cssText = \`
      width: 350px;
      height: 500px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      background: white;
      position: absolute;
      bottom: 80px;
      right: 0;
      display: none;
      transition: all 0.3s ease;
    \`;
    
    container.appendChild(iframe);
    return iframe;
  }
  
  // Toggle widget visibility
  function toggleWidget() {
    const iframe = document.getElementById('voxassist-widget-iframe');
    const button = document.getElementById('voxassist-widget-button');
    
    if (widgetState.isOpen) {
      iframe.style.display = 'none';
      button.innerHTML = '💬';
      widgetState.isOpen = false;
    } else {
      iframe.style.display = 'block';
      button.innerHTML = '✕';
      widgetState.isOpen = true;
      
      if (!widgetState.initialized) {
        initializeWidget();
      }
    }
  }
  
  // Initialize widget session
  async function initializeWidget() {
    try {
      const response = await fetch(\`\${WIDGET_CONFIG.apiBaseUrl}/embed/widget/\${WIDGET_CONFIG.widgetId}/session\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextUrl: window.location.href,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        widgetState.sessionId = data.sessionId;
        widgetState.visitorId = data.visitorId;
        widgetState.initialized = true;
        
        // Store visitor ID in localStorage
        localStorage.setItem('voxassist_visitor_id', data.visitorId);
      }
    } catch (error) {
      console.error('VoxAssist Widget initialization failed:', error);
    }
  }
  
  // Initialize widget when DOM is ready
  function initWidget() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWidget);
      return;
    }
    
    const container = createWidgetContainer();
    createWidgetButton(container);
    createWidgetIframe(container);
    
    // Auto-open if configured
    if (WIDGET_CONFIG.behavior.autoOpen) {
      setTimeout(toggleWidget, WIDGET_CONFIG.behavior.autoOpenDelay || 3000);
    }
  }
  
  // Start initialization
  initWidget();
  
  // Expose widget API
  window.VoxAssistWidget = {
    open: () => {
      if (!widgetState.isOpen) toggleWidget();
    },
    close: () => {
      if (widgetState.isOpen) toggleWidget();
    },
    toggle: toggleWidget,
    getState: () => ({ ...widgetState })
  };
  
})();
`;
}

/**
 * Generate iframe content for the widget
 */
async function generateIframeContent(widget, origin) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VoxAssist Widget</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${widget.appearance.backgroundColor || '#ffffff'};
            color: ${widget.appearance.textColor || '#333333'};
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .widget-header {
            background: ${widget.appearance.primaryColor || '#3B82F6'};
            color: white;
            padding: 16px;
            text-align: center;
            font-weight: 600;
        }
        
        .widget-content {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
        }
        
        .message {
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
        }
        
        .message.user {
            background: ${widget.appearance.primaryColor || '#3B82F6'};
            color: white;
            margin-left: auto;
        }
        
        .message.ai {
            background: #f3f4f6;
            color: #374151;
        }
        
        .widget-input {
            padding: 16px;
            border-top: 1px solid #e5e7eb;
        }
        
        .input-container {
            display: flex;
            gap: 8px;
        }
        
        .message-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            outline: none;
        }
        
        .send-button {
            padding: 8px 16px;
            background: ${widget.appearance.primaryColor || '#3B82F6'};
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        
        .send-button:hover {
            opacity: 0.9;
        }
        
        .typing-indicator {
            display: none;
            padding: 8px 12px;
            color: #6b7280;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="widget-header">
        ${widget.organization.name} Support
    </div>
    
    <div class="widget-content" id="messages">
        <div class="message ai">
            ${widget.behavior.greeting || 'Hi! How can I help you today?'}
        </div>
    </div>
    
    <div class="typing-indicator" id="typing">
        AI is typing...
    </div>
    
    <div class="widget-input">
        <div class="input-container">
            <input type="text" class="message-input" id="messageInput" placeholder="Type your message...">
            <button class="send-button" id="sendButton">Send</button>
        </div>
    </div>
    
    <script>
        const widgetConfig = ${JSON.stringify(widget, null, 2)};
        const apiBaseUrl = '${process.env.API_BASE_URL || 'http://localhost:5000'}';
        let sessionId = null;
        
        // Initialize session
        async function initSession() {
            try {
                const response = await fetch(\`\${apiBaseUrl}/embed/widget/\${widgetConfig.id}/session\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contextUrl: window.parent.location.href,
                        userAgent: navigator.userAgent,
                        referrer: document.referrer
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    sessionId = data.sessionId;
                }
            } catch (error) {
                console.error('Session initialization failed:', error);
            }
        }
        
        // Send message
        async function sendMessage(content) {
            if (!sessionId || !content.trim()) return;
            
            const messagesContainer = document.getElementById('messages');
            const typingIndicator = document.getElementById('typing');
            
            // Add user message
            const userMessage = document.createElement('div');
            userMessage.className = 'message user';
            userMessage.textContent = content;
            messagesContainer.appendChild(userMessage);
            
            // Show typing indicator
            typingIndicator.style.display = 'block';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            try {
                const response = await fetch(\`\${apiBaseUrl}/embed/widget/\${widgetConfig.id}/message\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        content,
                        type: 'text'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Hide typing indicator
                    typingIndicator.style.display = 'none';
                    
                    // Add AI response
                    const aiMessage = document.createElement('div');
                    aiMessage.className = 'message ai';
                    aiMessage.textContent = data.response;
                    messagesContainer.appendChild(aiMessage);
                    
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            } catch (error) {
                console.error('Message sending failed:', error);
                typingIndicator.style.display = 'none';
            }
        }
        
        // Event listeners
        document.getElementById('sendButton').addEventListener('click', () => {
            const input = document.getElementById('messageInput');
            sendMessage(input.value);
            input.value = '';
        });
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage(e.target.value);
                e.target.value = '';
            }
        });
        
        // Initialize
        initSession();
    </script>
</body>
</html>
`;
}

module.exports = router;
