const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const CryptoJS = require('crypto-js');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ElevenLabs = require('elevenlabs-node');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ElevenLabs voice service will be initialized when needed
let voice = null;

class WidgetController {
    // Initialize a new widget session
    async initializeSession(req, res) {
        try {
            const { contextUrl, userAgent, referrer } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Generate unique session ID
            const sessionId = uuidv4();
            
            // Extract visitor ID from cookies or generate new one
            const visitorId = req.cookies.voxassist_visitor_id || uuidv4();
            
            // Set visitor ID cookie if not exists
            if (!req.cookies.voxassist_visitor_id) {
                res.cookie('voxassist_visitor_id', visitorId, {
                    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                });
            }

            // Find widget configuration based on context URL
            const widget = await this.findWidgetByContext(contextUrl);
            
            if (!widget) {
                return res.status(404).json({
                    error: 'Widget configuration not found for this domain'
                });
            }

            // Create widget session
            const session = await prisma.widgetSession.create({
                data: {
                    sessionId,
                    widgetId: widget.id,
                    visitorId,
                    ipAddress,
                    userAgent,
                    referrerUrl: referrer,
                    metadata: {
                        browserInfo: this.parseBrowserInfo(userAgent),
                        timestamp: new Date().toISOString()
                    }
                }
            });

            // Extract context from the URL if not already cached
            this.extractContextAsync(widget.id, contextUrl);

            res.json({
                sessionId,
                widgetConfig: {
                    appearance: widget.appearance,
                    behavior: widget.behavior,
                    permissions: widget.permissions
                }
            });

        } catch (error) {
            console.error('Widget session initialization error:', error);
            res.status(500).json({ error: 'Failed to initialize widget session' });
        }
    }

    // Handle text messages from widget
    async handleTextMessage(req, res) {
        try {
            const { sessionId, content } = req.body;

            if (!sessionId || !content) {
                return res.status(400).json({ error: 'Session ID and content are required' });
            }

            // Get session and widget info
            const session = await prisma.widgetSession.findUnique({
                where: { sessionId },
                include: {
                    widget: {
                        include: {
                            organization: true,
                            contextExtracts: {
                                where: { isActive: true },
                                orderBy: { extractedAt: 'desc' },
                                take: 1
                            }
                        }
                    }
                }
            });

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            // Save user interaction
            const userInteraction = await prisma.widgetInteraction.create({
                data: {
                    sessionId,
                    sequenceNumber: await this.getNextSequenceNumber(sessionId),
                    speaker: 'visitor',
                    content,
                    timestamp: new Date()
                }
            });

            // Generate AI response
            const aiResponse = await this.generateAIResponse(
                content,
                session.widget.contextExtracts[0]?.content || '',
                session.widget.organization
            );

            // Save AI interaction
            const aiInteraction = await prisma.widgetInteraction.create({
                data: {
                    sessionId,
                    sequenceNumber: await this.getNextSequenceNumber(sessionId),
                    speaker: 'ai',
                    content: aiResponse.text,
                    aiConfidence: aiResponse.confidence,
                    intent: aiResponse.intent,
                    sentiment: aiResponse.sentiment,
                    sentimentScore: aiResponse.sentimentScore,
                    processingTime: aiResponse.processingTime,
                    timestamp: new Date()
                }
            });

            // Generate audio if voice is enabled
            let audioUrl = null;
            if (session.widget.behavior.enableVoice) {
                audioUrl = await this.generateAudio(aiResponse.text, session.widget.organization);
            }

            // Update session stats
            await prisma.widgetSession.update({
                where: { sessionId },
                data: {
                    messageCount: { increment: 2 }, // User + AI message
                    sentiment: aiResponse.sentiment,
                    sentimentScore: aiResponse.sentimentScore
                }
            });

            res.json({
                response: aiResponse.text,
                audioUrl,
                intent: aiResponse.intent,
                confidence: aiResponse.confidence
            });

        } catch (error) {
            console.error('Text message handling error:', error);
            res.status(500).json({ error: 'Failed to process message' });
        }
    }

    // Handle voice message from widget
    async handleVoiceMessage(req, res) {
        try {
            const { sessionId } = req.body;
            const audioFile = req.file;

            if (!audioFile) {
                return res.status(400).json({
                    success: false,
                    error: 'No audio file provided'
                });
            }

            // Get session
            const session = await prisma.widgetSession.findUnique({
                where: { id: sessionId },
                include: { widget: true }
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            // For now, return a message that voice transcription needs to be implemented
            // You can integrate with Google Speech-to-Text API or other services
            const userMessage = "Voice message received (transcription not implemented yet)";

            // Process the message same as text message
            const response = await this.generateAIResponse(userMessage, session);
            
            // Generate audio response
            const audioUrl = await this.generateAudioResponse(response, session.widget);

            // Save interaction
            await prisma.widgetInteraction.create({
                data: {
                    session_id: sessionId,
                    user_message: userMessage,
                    ai_response: response,
                    interaction_type: 'voice',
                    audio_url: audioUrl
                }
            });

            res.json({
                success: true,
                transcription: userMessage,
                response: response,
                audio_url: audioUrl
            });

        } catch (error) {
            console.error('Voice message error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process voice message'
            });
        }
    }

    // Get widget configuration
    async getWidgetConfig(req, res) {
        try {
            const { widgetId } = req.params;

            const widget = await prisma.widget.findUnique({
                where: { id: widgetId },
                include: {
                    organization: true
                }
            });

            if (!widget) {
                return res.status(404).json({ error: 'Widget not found' });
            }

            res.json({
                id: widget.id,
                name: widget.name,
                appearance: widget.appearance,
                behavior: widget.behavior,
                permissions: widget.permissions,
                isActive: widget.isActive
            });

        } catch (error) {
            console.error('Widget config retrieval error:', error);
            res.status(500).json({ error: 'Failed to get widget configuration' });
        }
    }

    // Create new widget
    async createWidget(req, res) {
        try {
            const { organizationId, name, contextUrl, appearance, behavior, permissions } = req.body;

            const widget = await prisma.widget.create({
                data: {
                    organizationId,
                    name,
                    contextUrl,
                    appearance: appearance || this.getDefaultAppearance(),
                    behavior: behavior || this.getDefaultBehavior(),
                    permissions: permissions || this.getDefaultPermissions()
                }
            });

            // Start context extraction if URL provided
            if (contextUrl) {
                this.extractContextAsync(widget.id, contextUrl);
            }

            res.status(201).json(widget);

        } catch (error) {
            console.error('Widget creation error:', error);
            res.status(500).json({ error: 'Failed to create widget' });
        }
    }

    // Update widget configuration
    async updateWidget(req, res) {
        try {
            const { widgetId } = req.params;
            const updates = req.body;

            const widget = await prisma.widget.update({
                where: { id: widgetId },
                data: updates
            });

            res.json(widget);

        } catch (error) {
            console.error('Widget update error:', error);
            res.status(500).json({ error: 'Failed to update widget' });
        }
    }

    // Get widget analytics
    async getWidgetAnalytics(req, res) {
        try {
            const { widgetId } = req.params;
            const { startDate, endDate } = req.query;

            const analytics = await this.calculateWidgetAnalytics(widgetId, startDate, endDate);

            res.json(analytics);

        } catch (error) {
            console.error('Widget analytics error:', error);
            res.status(500).json({ error: 'Failed to get widget analytics' });
        }
    }

    // Private helper methods
    async findWidgetByContext(contextUrl) {
        try {
            const url = new URL(contextUrl);
            const domain = url.hostname;

            // First try exact context URL match
            let widget = await prisma.widget.findFirst({
                where: {
                    contextUrl: contextUrl,
                    isActive: true
                },
                include: {
                    organization: true
                }
            });

            // If not found, try domain match
            if (!widget) {
                widget = await prisma.widget.findFirst({
                    where: {
                        contextUrl: {
                            contains: domain
                        },
                        isActive: true
                    },
                    include: {
                        organization: true
                    }
                });
            }

            // If still not found, try organization domain match
            if (!widget) {
                widget = await prisma.widget.findFirst({
                    where: {
                        organization: {
                            domain: domain
                        },
                        isActive: true
                    },
                    include: {
                        organization: true
                    }
                });
            }

            return widget;
        } catch (error) {
            console.error('Error finding widget by context:', error);
            return null;
        }
    }

    async extractContextAsync(widgetId, url) {
        try {
            // Check if context already exists and is recent
            const existingContext = await prisma.contextExtract.findFirst({
                where: {
                    widgetId,
                    url,
                    extractedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
                    }
                }
            });

            if (existingContext) {
                return existingContext;
            }

            // Extract context using Puppeteer for dynamic content
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (compatible; VoxAssist-Bot/1.0)');
            
            try {
                await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
                
                const content = await page.evaluate(() => {
                    // Remove script and style elements
                    const scripts = document.querySelectorAll('script, style, noscript');
                    scripts.forEach(el => el.remove());

                    return {
                        title: document.title,
                        description: document.querySelector('meta[name="description"]')?.content || '',
                        content: document.body.innerText,
                        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
                        links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
                            text: a.textContent,
                            href: a.href
                        })).slice(0, 20)
                    };
                });

                await browser.close();

                // Save extracted context
                const contextExtract = await prisma.contextExtract.create({
                    data: {
                        widgetId,
                        url,
                        title: content.title,
                        description: content.description,
                        content: content.content.substring(0, 10000), // Limit content size
                        keywords: content.headings,
                        metadata: {
                            links: content.links,
                            extractMethod: 'puppeteer'
                        }
                    }
                });

                return contextExtract;

            } catch (pageError) {
                await browser.close();
                
                // Fallback to simple HTTP request with Cheerio
                const response = await axios.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; VoxAssist-Bot/1.0)'
                    }
                });

                const $ = cheerio.load(response.data);
                
                // Remove script and style elements
                $('script, style, noscript').remove();

                const contextExtract = await prisma.contextExtract.create({
                    data: {
                        widgetId,
                        url,
                        title: $('title').text(),
                        description: $('meta[name="description"]').attr('content') || '',
                        content: $('body').text().substring(0, 10000),
                        keywords: $('h1, h2, h3').map((i, el) => $(el).text()).get(),
                        metadata: {
                            extractMethod: 'cheerio'
                        }
                    }
                });

                return contextExtract;
            }

        } catch (error) {
            console.error('Context extraction error:', error);
            return null;
        }
    }

    async generateAIResponse(userMessage, context, organization) {
        const startTime = Date.now();

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = `
You are VoxAssist, an AI customer support agent for ${organization.name}. 
You have access to the following context about the website:

${context}

User message: ${userMessage}

Please provide a helpful, concise response. Be friendly and professional.
If you cannot answer based on the available context, politely say so and offer to escalate to a human agent.

Response format should be natural conversational text, maximum 150 words.
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Simple sentiment analysis
            const sentiment = this.analyzeSentiment(userMessage);

            return {
                text,
                confidence: 0.85, // Default confidence
                intent: this.extractIntent(userMessage),
                sentiment: sentiment.label,
                sentimentScore: sentiment.score,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('AI response generation error:', error);
            return {
                text: "I'm sorry, I'm having trouble processing your request right now. Would you like me to connect you with a human agent?",
                confidence: 0.5,
                intent: 'error',
                sentiment: 'neutral',
                sentimentScore: 0.5,
                processingTime: Date.now() - startTime
            };
        }
    }

    async generateAudio(text, organization) {
        try {
            // Use ElevenLabs API for audio generation
            const response = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
                {
                    text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': process.env.ELEVENLABS_API_KEY
                    },
                    responseType: 'arraybuffer'
                }
            );

            // Save audio file and return URL
            const audioBuffer = Buffer.from(response.data);
            const audioUrl = await this.saveAudioFile(audioBuffer, `ai-${Date.now()}`);
            
            return audioUrl;

        } catch (error) {
            console.error('Audio generation error:', error);
            return null;
        }
    }

    async transcribeAudio(audioBuffer) {
        try {
            // Convert buffer to file for OpenAI Whisper
            const transcription = await openai.audio.transcriptions.create({
                file: audioBuffer,
                model: "whisper-1",
            });

            return transcription.text;

        } catch (error) {
            console.error('Audio transcription error:', error);
            return null;
        }
    }

    async saveAudioFile(buffer, identifier) {
        // In production, save to cloud storage (S3, etc.)
        // For now, return a placeholder URL
        return `${process.env.API_BASE_URL}/audio/${identifier}.mp3`;
    }

    async getNextSequenceNumber(sessionId) {
        const lastInteraction = await prisma.widgetInteraction.findFirst({
            where: { sessionId },
            orderBy: { sequenceNumber: 'desc' }
        });

        return (lastInteraction?.sequenceNumber || 0) + 1;
    }

    analyzeSentiment(text) {
        // Simple keyword-based sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'problem'];

        const words = text.toLowerCase().split(/\s+/);
        let score = 0.5; // neutral

        words.forEach(word => {
            if (positiveWords.includes(word)) score += 0.1;
            if (negativeWords.includes(word)) score -= 0.1;
        });

        score = Math.max(0, Math.min(1, score));

        let label = 'neutral';
        if (score > 0.6) label = 'positive';
        if (score < 0.4) label = 'negative';

        return { label, score };
    }

    extractIntent(text) {
        const intents = {
            'question': ['what', 'how', 'when', 'where', 'why', 'which', '?'],
            'complaint': ['problem', 'issue', 'wrong', 'error', 'broken', 'not working'],
            'request': ['can you', 'could you', 'please', 'help', 'need'],
            'greeting': ['hello', 'hi', 'hey', 'good morning', 'good afternoon']
        };

        const lowerText = text.toLowerCase();
        
        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return intent;
            }
        }

        return 'general';
    }

    parseBrowserInfo(userAgent) {
        // Simple browser detection
        const browsers = {
            'Chrome': /Chrome\/([0-9.]+)/,
            'Firefox': /Firefox\/([0-9.]+)/,
            'Safari': /Safari\/([0-9.]+)/,
            'Edge': /Edge\/([0-9.]+)/
        };

        for (const [name, regex] of Object.entries(browsers)) {
            const match = userAgent.match(regex);
            if (match) {
                return { name, version: match[1] };
            }
        }

        return { name: 'Unknown', version: '0.0' };
    }

    getDefaultAppearance() {
        return {
            position: 'bottom-right',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            textColor: '#FFFFFF',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            size: 'medium'
        };
    }

    getDefaultBehavior() {
        return {
            autoOpen: false,
            greeting: 'Hi! How can I help you today?',
            language: 'en',
            enableVoice: true,
            enableText: true
        };
    }

    getDefaultPermissions() {
        return {
            collectPersonalData: false,
            storeCookies: true,
            recordAudio: false,
            shareWithThirdParty: false
        };
    }

    async calculateWidgetAnalytics(widgetId, startDate, endDate) {
        const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = new Date(endDate || Date.now());

        const [sessions, interactions, avgSentiment] = await Promise.all([
            prisma.widgetSession.count({
                where: {
                    widgetId,
                    startTime: { gte: start, lte: end }
                }
            }),
            prisma.widgetInteraction.count({
                where: {
                    session: {
                        widgetId,
                        startTime: { gte: start, lte: end }
                    }
                }
            }),
            prisma.widgetSession.aggregate({
                where: {
                    widgetId,
                    startTime: { gte: start, lte: end },
                    sentimentScore: { not: null }
                },
                _avg: { sentimentScore: true }
            })
        ]);

        return {
            totalSessions: sessions,
            totalInteractions: interactions,
            avgSentimentScore: avgSentiment._avg.sentimentScore || 0.5,
            period: { start, end }
        };
    }
}

module.exports = new WidgetController();
