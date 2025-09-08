(function() {
    'use strict';

    // VoxAssist Widget Configuration
    const WIDGET_CONFIG = {
        apiBaseUrl: window.VOXASSIST_API_URL || 'https://api.voxassist.com',
        version: '1.0.0',
        defaultAppearance: {
            position: 'bottom-right',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            textColor: '#FFFFFF',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            size: 'medium',
            zIndex: 9999
        },
        defaultBehavior: {
            autoOpen: false,
            greeting: 'Hi! How can I help you today?',
            language: 'en',
            enableVoice: true,
            enableText: true
        }
    };

    class VoxAssistWidget {
        constructor(config = {}) {
            this.config = { ...WIDGET_CONFIG, ...config };
            this.isOpen = false;
            this.isRecording = false;
            this.sessionId = null;
            this.websocket = null;
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.contextUrl = config.contextUrl || window.location.href;
            
            this.init();
        }

        async init() {
            try {
                await this.loadStyles();
                await this.createWidget();
                await this.initializeSession();
                this.setupEventListeners();
                
                if (this.config.defaultBehavior.autoOpen) {
                    setTimeout(() => this.open(), 2000);
                }
            } catch (error) {
                console.error('VoxAssist Widget initialization failed:', error);
            }
        }

        async loadStyles() {
            const styles = `
                .voxassist-widget {
                    position: fixed;
                    ${this.config.defaultAppearance.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                    ${this.config.defaultAppearance.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                    z-index: ${this.config.defaultAppearance.zIndex};
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .voxassist-trigger {
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, ${this.config.defaultAppearance.primaryColor}, ${this.config.defaultAppearance.secondaryColor});
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    color: ${this.config.defaultAppearance.textColor};
                }

                .voxassist-trigger:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
                }

                .voxassist-chat {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 350px;
                    height: 500px;
                    background: ${this.config.defaultAppearance.backgroundColor};
                    border-radius: ${this.config.defaultAppearance.borderRadius};
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                }

                .voxassist-header {
                    background: linear-gradient(135deg, ${this.config.defaultAppearance.primaryColor}, ${this.config.defaultAppearance.secondaryColor});
                    color: ${this.config.defaultAppearance.textColor};
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .voxassist-title {
                    font-weight: 600;
                    font-size: 16px;
                }

                .voxassist-close {
                    background: none;
                    border: none;
                    color: ${this.config.defaultAppearance.textColor};
                    cursor: pointer;
                    font-size: 20px;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .voxassist-messages {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .voxassist-message {
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: 18px;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .voxassist-message.ai {
                    background: #f3f4f6;
                    color: #374151;
                    align-self: flex-start;
                }

                .voxassist-message.user {
                    background: ${this.config.defaultAppearance.primaryColor};
                    color: ${this.config.defaultAppearance.textColor};
                    align-self: flex-end;
                }

                .voxassist-controls {
                    padding: 20px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .voxassist-input {
                    flex: 1;
                    border: 1px solid #d1d5db;
                    border-radius: 20px;
                    padding: 10px 16px;
                    font-size: 14px;
                    outline: none;
                }

                .voxassist-input:focus {
                    border-color: ${this.config.defaultAppearance.primaryColor};
                }

                .voxassist-voice-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: ${this.config.defaultAppearance.primaryColor};
                    color: ${this.config.defaultAppearance.textColor};
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .voxassist-voice-btn:hover {
                    background: ${this.config.defaultAppearance.secondaryColor};
                }

                .voxassist-voice-btn.recording {
                    background: #ef4444;
                    animation: pulse 1s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                .voxassist-typing {
                    display: flex;
                    gap: 4px;
                    padding: 12px 16px;
                }

                .voxassist-typing-dot {
                    width: 6px;
                    height: 6px;
                    background: #9ca3af;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }

                .voxassist-typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .voxassist-typing-dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-10px); }
                }

                @media (max-width: 480px) {
                    .voxassist-chat {
                        width: calc(100vw - 40px);
                        height: calc(100vh - 100px);
                        bottom: 80px;
                        right: 20px;
                    }
                }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }

        async createWidget() {
            const widgetHtml = `
                <div class="voxassist-widget">
                    <button class="voxassist-trigger" id="voxassist-trigger">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                    </button>
                    
                    <div class="voxassist-chat" id="voxassist-chat">
                        <div class="voxassist-header">
                            <div class="voxassist-title">VoxAssist</div>
                            <button class="voxassist-close" id="voxassist-close">×</button>
                        </div>
                        
                        <div class="voxassist-messages" id="voxassist-messages">
                            <div class="voxassist-message ai">
                                ${this.config.defaultBehavior.greeting}
                            </div>
                        </div>
                        
                        <div class="voxassist-controls">
                            <input type="text" class="voxassist-input" id="voxassist-input" 
                                   placeholder="Type your message..." />
                            <button class="voxassist-voice-btn" id="voxassist-voice-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', widgetHtml);
        }

        async initializeSession() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/widget/session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contextUrl: this.contextUrl,
                        userAgent: navigator.userAgent,
                        referrer: document.referrer,
                        timestamp: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                this.sessionId = data.sessionId;
                this.initWebSocket();
            } catch (error) {
                console.error('Failed to initialize session:', error);
            }
        }

        initWebSocket() {
            const wsUrl = this.config.apiBaseUrl.replace(/^https?/, 'wss') + `/ws/widget/${this.sessionId}`;
            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                console.log('VoxAssist WebSocket connected');
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.websocket.onclose = () => {
                console.log('VoxAssist WebSocket disconnected');
                // Attempt to reconnect after 3 seconds
                setTimeout(() => this.initWebSocket(), 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('VoxAssist WebSocket error:', error);
            };
        }

        handleWebSocketMessage(data) {
            switch (data.type) {
                case 'ai_response':
                    this.addMessage(data.content, 'ai');
                    if (data.audioUrl) {
                        this.playAudio(data.audioUrl);
                    }
                    break;
                case 'typing_start':
                    this.showTypingIndicator();
                    break;
                case 'typing_end':
                    this.hideTypingIndicator();
                    break;
                case 'error':
                    console.error('Widget error:', data.message);
                    break;
            }
        }

        setupEventListeners() {
            const trigger = document.getElementById('voxassist-trigger');
            const close = document.getElementById('voxassist-close');
            const input = document.getElementById('voxassist-input');
            const voiceBtn = document.getElementById('voxassist-voice-btn');

            trigger.addEventListener('click', () => this.toggle());
            close.addEventListener('click', () => this.close());
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage(input.value);
                    input.value = '';
                }
            });

            voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());

            // Handle clicks outside widget to close
            document.addEventListener('click', (e) => {
                const widget = document.querySelector('.voxassist-widget');
                if (this.isOpen && !widget.contains(e.target)) {
                    this.close();
                }
            });
        }

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }

        open() {
            const chat = document.getElementById('voxassist-chat');
            chat.style.display = 'flex';
            this.isOpen = true;
        }

        close() {
            const chat = document.getElementById('voxassist-chat');
            chat.style.display = 'none';
            this.isOpen = false;
        }

        async sendMessage(content) {
            if (!content.trim() || !this.sessionId) return;

            this.addMessage(content, 'user');
            
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'user_message',
                    content: content,
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString()
                }));
            }
        }

        async toggleVoiceRecording() {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        }

        async startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.sendAudioMessage(audioBlob);
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                
                const voiceBtn = document.getElementById('voxassist-voice-btn');
                voiceBtn.classList.add('recording');
            } catch (error) {
                console.error('Failed to start recording:', error);
                alert('Microphone access is required for voice messages.');
            }
        }

        stopRecording() {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop();
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                this.isRecording = false;
                
                const voiceBtn = document.getElementById('voxassist-voice-btn');
                voiceBtn.classList.remove('recording');
            }
        }

        async sendAudioMessage(audioBlob) {
            if (!this.sessionId) return;

            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-message.wav');
            formData.append('sessionId', this.sessionId);

            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/widget/voice`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.transcript) {
                    this.addMessage(data.transcript, 'user');
                }
            } catch (error) {
                console.error('Failed to send audio message:', error);
            }
        }

        addMessage(content, sender) {
            const messages = document.getElementById('voxassist-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `voxassist-message ${sender}`;
            messageDiv.textContent = content;
            
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }

        showTypingIndicator() {
            const messages = document.getElementById('voxassist-messages');
            const typingDiv = document.createElement('div');
            typingDiv.className = 'voxassist-typing';
            typingDiv.id = 'voxassist-typing-indicator';
            typingDiv.innerHTML = `
                <div class="voxassist-typing-dot"></div>
                <div class="voxassist-typing-dot"></div>
                <div class="voxassist-typing-dot"></div>
            `;
            
            messages.appendChild(typingDiv);
            messages.scrollTop = messages.scrollHeight;
        }

        hideTypingIndicator() {
            const indicator = document.getElementById('voxassist-typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }

        async playAudio(audioUrl) {
            try {
                const audio = new Audio(audioUrl);
                await audio.play();
            } catch (error) {
                console.error('Failed to play audio:', error);
            }
        }
    }

    // Auto-initialize widget when DOM is ready
    function initVoxAssistWidget() {
        const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
        const contextUrl = script?.getAttribute('data-context-url') || window.location.href;
        
        new VoxAssistWidget({
            contextUrl: contextUrl
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVoxAssistWidget);
    } else {
        initVoxAssistWidget();
    }

    // Expose widget class globally for manual initialization
    window.VoxAssistWidget = VoxAssistWidget;
})();
