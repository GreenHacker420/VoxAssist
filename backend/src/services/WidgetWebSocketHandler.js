const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ElevenLabs = require('elevenlabs-node');

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ElevenLabs voice service will be initialized when needed
let voice = null;

class WidgetWebSocketHandler {
    constructor(io) {
        this.io = io;
        this.activeSessions = new Map();
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Widget WebSocket connection established:', socket.id);

            socket.on('join_session', async (data) => {
                await this.handleJoinSession(socket, data);
            });

            socket.on('user_message', async (data) => {
                await this.handleUserMessage(socket, data);
            });

            socket.on('voice_data', async (data) => {
                await this.handleVoiceData(socket, data);
            });

            socket.on('typing_start', (data) => {
                this.handleTypingStart(socket, data);
            });

            socket.on('typing_stop', (data) => {
                this.handleTypingStop(socket, data);
            });

            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });

            socket.on('error', (error) => {
                console.error('Widget WebSocket error:', error);
            });
        });
    }

    async handleJoinSession(socket, data) {
        try {
            const { sessionId } = data;

            if (!sessionId) {
                socket.emit('error', { message: 'Session ID is required' });
                return;
            }

            // Verify session exists
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
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            // Join session room
            socket.join(sessionId);
            socket.sessionId = sessionId;

            // Store session info
            this.activeSessions.set(socket.id, {
                sessionId,
                session,
                joinedAt: new Date()
            });

            // Send session joined confirmation
            socket.emit('session_joined', {
                sessionId,
                widgetConfig: {
                    appearance: session.widget.appearance,
                    behavior: session.widget.behavior
                }
            });

            console.log(`Socket ${socket.id} joined session ${sessionId}`);

        } catch (error) {
            console.error('Join session error:', error);
            socket.emit('error', { message: 'Failed to join session' });
        }
    }

    async handleUserMessage(socket, data) {
        try {
            const { content, sessionId } = data;
            const sessionInfo = this.activeSessions.get(socket.id);

            if (!sessionInfo || sessionInfo.sessionId !== sessionId) {
                socket.emit('error', { message: 'Invalid session' });
                return;
            }

            // Emit typing indicator to session
            socket.to(sessionId).emit('ai_typing_start');

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
                sessionInfo.session
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
            if (sessionInfo.session.widget.behavior.enableVoice) {
                audioUrl = await this.generateAudio(aiResponse.text, sessionInfo.session.widget.organization);
            }

            // Update session stats
            await prisma.widgetSession.update({
                where: { sessionId },
                data: {
                    messageCount: { increment: 2 },
                    sentiment: aiResponse.sentiment,
                    sentimentScore: aiResponse.sentimentScore
                }
            });

            // Stop typing indicator
            socket.to(sessionId).emit('ai_typing_end');

            // Send AI response to session
            this.io.to(sessionId).emit('ai_response', {
                content: aiResponse.text,
                audioUrl,
                intent: aiResponse.intent,
                confidence: aiResponse.confidence,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Handle user message error:', error);
            socket.emit('error', { message: 'Failed to process message' });
        }
    }

    async handleVoiceData(socket, data) {
        try {
            const { audioData, sessionId } = data;
            const sessionInfo = this.activeSessions.get(socket.id);

            if (!sessionInfo || sessionInfo.sessionId !== sessionId) {
                socket.emit('error', { message: 'Invalid session' });
                return;
            }

            // Convert base64 audio to buffer
            const audioBuffer = Buffer.from(audioData, 'base64');

            // Transcribe audio using Whisper
            const transcript = await this.transcribeAudio(audioBuffer);

            if (transcript) {
                // Save voice interaction
                await prisma.widgetInteraction.create({
                    data: {
                        sessionId,
                        sequenceNumber: await this.getNextSequenceNumber(sessionId),
                        speaker: 'visitor',
                        content: transcript,
                        audioUrl: await this.saveAudioFile(audioBuffer, sessionId),
                        timestamp: new Date()
                    }
                });

                // Emit transcript to client
                socket.emit('voice_transcribed', {
                    transcript,
                    timestamp: new Date().toISOString()
                });

                // Process as text message
                await this.handleUserMessage(socket, {
                    content: transcript,
                    sessionId
                });
            }

        } catch (error) {
            console.error('Handle voice data error:', error);
            socket.emit('error', { message: 'Failed to process voice data' });
        }
    }

    handleTypingStart(socket, data) {
        const { sessionId } = data;
        socket.to(sessionId).emit('user_typing_start');
    }

    handleTypingStop(socket, data) {
        const { sessionId } = data;
        socket.to(sessionId).emit('user_typing_end');
    }

    handleDisconnect(socket) {
        const sessionInfo = this.activeSessions.get(socket.id);
        
        if (sessionInfo) {
            console.log(`Socket ${socket.id} disconnected from session ${sessionInfo.sessionId}`);
            
            // Update session end time if this was the last connection
            this.updateSessionEndTime(sessionInfo.sessionId);
            
            // Remove from active sessions
            this.activeSessions.delete(socket.id);
        }
    }

    async generateAIResponse(userMessage, session) {
        const startTime = Date.now();

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            
            const context = session.widget.contextExtracts[0]?.content || '';
            const organization = session.widget.organization;

            const prompt = `
You are VoxAssist, an AI customer support agent for ${organization.name}.

Website Context:
${context}

Previous conversation context (last 5 interactions):
${await this.getConversationHistory(session.sessionId, 5)}

Current user message: ${userMessage}

Instructions:
- Provide helpful, accurate responses based on the website context
- Be conversational, friendly, and professional
- Keep responses concise (max 150 words)
- If you cannot answer from the context, offer to escalate to human support
- Use natural language that works well for both text and voice

Response:
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Analyze sentiment and intent
            const sentiment = this.analyzeSentiment(userMessage);
            const intent = this.extractIntent(userMessage);

            return {
                text,
                confidence: 0.85,
                intent,
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

            const audioBuffer = Buffer.from(response.data);
            return await this.saveAudioFile(audioBuffer, `ai-${Date.now()}`);

        } catch (error) {
            console.error('Audio generation error:', error);
            return null;
        }
    }

    async transcribeAudio(audioBuffer) {
        try {
            // For now, return a placeholder message since we're using Gemini API only
            // You can integrate with Google Speech-to-Text API or other services
            return "Voice message received (transcription not implemented yet)";
        } catch (error) {
            console.error('Audio transcription error:', error);
            throw new Error('Failed to transcribe audio');
        }
    }

    async getNextSequenceNumber(sessionId) {
        const lastInteraction = await prisma.widgetInteraction.findFirst({
            where: { sessionId },
            orderBy: { sequenceNumber: 'desc' }
        });

        return (lastInteraction?.sequenceNumber || 0) + 1;
    }

    async getConversationHistory(sessionId, limit = 5) {
        const interactions = await prisma.widgetInteraction.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'desc' },
            take: limit * 2 // Get both user and AI messages
        });

        return interactions
            .reverse()
            .map(interaction => `${interaction.speaker}: ${interaction.content}`)
            .join('\n');
    }

    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing', 'perfect', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'problem', 'issue', 'broken', 'wrong'];

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
            'complaint': ['problem', 'issue', 'wrong', 'error', 'broken', 'not working', 'doesn\'t work'],
            'request': ['can you', 'could you', 'please', 'help', 'need', 'want'],
            'greeting': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
            'goodbye': ['bye', 'goodbye', 'see you', 'thanks', 'thank you'],
            'escalation': ['human', 'agent', 'person', 'speak to someone', 'transfer', 'escalate']
        };

        const lowerText = text.toLowerCase();
        
        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return intent;
            }
        }

        return 'general';
    }

    async updateSessionEndTime(sessionId) {
        try {
            // Check if there are any other active connections for this session
            const socketsInSession = await this.io.in(sessionId).allSockets();
            
            if (socketsInSession.size === 0) {
                // No more connections, update session end time
                await prisma.widgetSession.update({
                    where: { sessionId },
                    data: {
                        endTime: new Date(),
                        status: 'ended',
                        duration: await this.calculateSessionDuration(sessionId)
                    }
                });
            }
        } catch (error) {
            console.error('Update session end time error:', error);
        }
    }

    async calculateSessionDuration(sessionId) {
        try {
            const session = await prisma.widgetSession.findUnique({
                where: { sessionId },
                select: { startTime: true }
            });

            if (session) {
                const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
                return duration;
            }

            return 0;
        } catch (error) {
            console.error('Calculate session duration error:', error);
            return 0;
        }
    }

    // Get real-time session statistics
    getActiveSessionStats() {
        const stats = {
            totalActiveSessions: this.activeSessions.size,
            sessionsByWidget: {},
            averageSessionDuration: 0
        };

        for (const [socketId, sessionInfo] of this.activeSessions) {
            const widgetId = sessionInfo.session.widget.id;
            if (!stats.sessionsByWidget[widgetId]) {
                stats.sessionsByWidget[widgetId] = 0;
            }
            stats.sessionsByWidget[widgetId]++;
        }

        return stats;
    }

    // Broadcast message to all sessions of a widget
    broadcastToWidget(widgetId, event, data) {
        for (const [socketId, sessionInfo] of this.activeSessions) {
            if (sessionInfo.session.widget.id === widgetId) {
                this.io.to(socketId).emit(event, data);
            }
        }
    }

    // Broadcast message to all sessions of an organization
    broadcastToOrganization(organizationId, event, data) {
        for (const [socketId, sessionInfo] of this.activeSessions) {
            if (sessionInfo.session.widget.organization.id === organizationId) {
                this.io.to(socketId).emit(event, data);
            }
        }
    }
}

module.exports = WidgetWebSocketHandler;
