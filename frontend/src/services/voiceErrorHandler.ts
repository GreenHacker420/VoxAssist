/**
 * Voice Error Handler Service
 * Provides comprehensive error handling and fallback mechanisms for voice features
 */

export interface ErrorContext {
  component: string;
  action: string;
  timestamp: Date;
  userAgent: string;
  additionalInfo?: Record<string, unknown>;
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackMode?: boolean;
  notifyUser?: boolean;
  logError?: boolean;
  onError?: (error: VoiceError) => void;
}

export interface VoiceError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context: ErrorContext;
  timestamp: Date;
}

export class VoiceErrorHandler {
  private errorLog: VoiceError[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private fallbackModes: Map<string, boolean> = new Map();
  private errorCallbacks: Map<string, (error: VoiceError) => void> = new Map();

  // Error codes and their configurations
  private errorConfigs: Record<string, {
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
    fallback: string;
    userMessage: string;
    recovery: () => Promise<boolean>;
  }> = {
    // Audio/Microphone Errors
    'MICROPHONE_ACCESS_DENIED': {
      severity: 'high' as const,
      recoverable: false,
      fallback: 'text-input',
      userMessage: 'Microphone access denied. Please enable microphone permissions and try again.',
      recovery: () => this.handleMicrophoneAccessDenied()
    },
    'MICROPHONE_NOT_FOUND': {
      severity: 'high' as const,
      recoverable: false,
      fallback: 'text-input',
      userMessage: 'No microphone found. Please connect a microphone and refresh the page.',
      recovery: () => this.handleMicrophoneNotFound()
    },
    'AUDIO_CONTEXT_FAILED': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'basic-audio',
      userMessage: 'Audio processing unavailable. Using basic audio mode.',
      recovery: () => this.handleAudioContextFailed()
    },

    // Speech Recognition Errors
    'SPEECH_RECOGNITION_NOT_SUPPORTED': {
      severity: 'high' as const,
      recoverable: false,
      fallback: 'manual-input',
      userMessage: 'Speech recognition not supported in this browser. Please use manual input.',
      recovery: () => this.handleSpeechRecognitionNotSupported()
    },
    'SPEECH_RECOGNITION_FAILED': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'retry',
      userMessage: 'Speech recognition failed. Retrying...',
      recovery: () => this.handleSpeechRecognitionFailed()
    },
    'SPEECH_NO_MATCH': {
      severity: 'low' as const,
      recoverable: true,
      fallback: 'prompt-retry',
      userMessage: 'Could not understand speech. Please try speaking more clearly.',
      recovery: () => this.handleSpeechNoMatch()
    },

    // Network/Connection Errors
    'WEBSOCKET_CONNECTION_FAILED': {
      severity: 'high' as const,
      recoverable: true,
      fallback: 'http-polling',
      userMessage: 'Connection failed. Attempting to reconnect...',
      recovery: () => this.handleWebSocketConnectionFailed()
    },
    'WEBSOCKET_DISCONNECTED': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'reconnect',
      userMessage: 'Connection lost. Reconnecting...',
      recovery: () => this.handleWebSocketDisconnected()
    },
    'NETWORK_ERROR': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'offline-mode',
      userMessage: 'Network error. Some features may be limited.',
      recovery: () => this.handleNetworkError()
    },

    // AI/TTS Errors
    'AI_SERVICE_UNAVAILABLE': {
      severity: 'high' as const,
      recoverable: true,
      fallback: 'mock-responses',
      userMessage: 'AI service temporarily unavailable. Using demo responses.',
      recovery: () => this.handleAIServiceUnavailable()
    },
    'TTS_SERVICE_FAILED': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'text-only',
      userMessage: 'Voice synthesis unavailable. Showing text responses only.',
      recovery: () => this.handleTTSServiceFailed()
    },
    'AI_RESPONSE_TIMEOUT': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'default-response',
      userMessage: 'AI response taking longer than expected...',
      recovery: () => this.handleAIResponseTimeout()
    },

    // General Errors
    'UNKNOWN_ERROR': {
      severity: 'medium' as const,
      recoverable: true,
      fallback: 'safe-mode',
      userMessage: 'An unexpected error occurred. Switching to safe mode.',
      recovery: () => this.handleUnknownError()
    }
  };

  /**
   * Handle an error with automatic recovery
   */
  async handleError(
    errorCode: string,
    context: ErrorContext,
    options: ErrorRecoveryOptions = {}
  ): Promise<boolean> {
    const config = this.errorConfigs[errorCode] || this.errorConfigs['UNKNOWN_ERROR'];
    
    const error: VoiceError = {
      code: errorCode,
      message: config.userMessage,
      severity: config.severity,
      recoverable: config.recoverable,
      context,
      timestamp: new Date()
    };

    // Log error
    if (options.logError !== false) {
      this.logError(error);
    }

    // Notify error callbacks
    this.notifyErrorCallbacks(error);
    
    // Call custom error callback if provided
    if (options.onError) {
      options.onError(error);
    }

    // Attempt recovery if error is recoverable
    if (config.recoverable) {
      return await this.attemptRecovery(errorCode, context, options);
    }

    // Apply fallback if not recoverable
    this.applyFallback(errorCode, context);
    return false;
  }

  /**
   * Attempt error recovery with retries
   */
  private async attemptRecovery(
    errorCode: string,
    context: ErrorContext,
    options: ErrorRecoveryOptions
  ): Promise<boolean> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    const retryKey = `${errorCode}-${context.component}`;

    let attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts >= maxRetries) {
      console.warn(`Max retry attempts reached for ${errorCode}`);
      this.applyFallback(errorCode, context);
      return false;
    }

    attempts++;
    this.retryAttempts.set(retryKey, attempts);

    // Wait before retry
    if (attempts > 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
    }

    try {
      const config = this.errorConfigs[errorCode];
      const recoveryResult = await config.recovery();
      
      if (recoveryResult) {
        // Recovery successful, reset retry count
        this.retryAttempts.delete(retryKey);
        return true;
      } else {
        // Recovery failed, try again or fallback
        return await this.attemptRecovery(errorCode, context, options);
      }
    } catch (recoveryError) {
      console.error(`Recovery attempt failed for ${errorCode}:`, recoveryError);
      return await this.attemptRecovery(errorCode, context, options);
    }
  }

  /**
   * Apply fallback mechanism
   */
  private applyFallback(errorCode: string, context: ErrorContext): void {
    const config = this.errorConfigs[errorCode];
    const fallbackKey = `${context.component}-${config.fallback}`;
    
    this.fallbackModes.set(fallbackKey, true);
    
    console.info(`Applied fallback '${config.fallback}' for ${errorCode} in ${context.component}`);
    
    // Emit fallback event
    this.emitFallbackEvent(errorCode, config.fallback, context);
  }

  /**
   * Check if component is in fallback mode
   */
  isInFallbackMode(component: string, fallbackType: string): boolean {
    return this.fallbackModes.get(`${component}-${fallbackType}`) || false;
  }

  /**
   * Clear fallback mode
   */
  clearFallbackMode(component: string, fallbackType: string): void {
    this.fallbackModes.delete(`${component}-${fallbackType}`);
  }

  /**
   * Register error callback
   */
  onError(component: string, callback: (error: VoiceError) => void): void {
    this.errorCallbacks.set(component, callback);
  }

  /**
   * Unregister error callback
   */
  offError(component: string): void {
    this.errorCallbacks.delete(component);
  }

  /**
   * Log error to internal log
   */
  private logError(error: VoiceError): void {
    this.errorLog.push(error);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Log to console based on severity
    switch (error.severity) {
      case 'critical':
        console.error('CRITICAL Voice Error:', error);
        break;
      case 'high':
        console.error('Voice Error:', error);
        break;
      case 'medium':
        console.warn('Voice Warning:', error);
        break;
      case 'low':
        console.info('Voice Info:', error);
        break;
    }
  }

  /**
   * Notify registered error callbacks
   */
  private notifyErrorCallbacks(error: VoiceError): void {
    const callback = this.errorCallbacks.get(error.context.component);
    if (callback) {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    }
  }

  /**
   * Emit fallback event
   */
  private emitFallbackEvent(errorCode: string, fallbackType: string, context: ErrorContext): void {
    const event = new CustomEvent('voiceFallback', {
      detail: {
        errorCode,
        fallbackType,
        context,
        timestamp: new Date()
      }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  // Specific error recovery handlers
  private async handleMicrophoneAccessDenied(): Promise<boolean> {
    // Cannot recover from denied permissions
    return false;
  }

  private async handleMicrophoneNotFound(): Promise<boolean> {
    // Check if microphone became available
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      return audioInputs.length > 0;
    } catch {
      return false;
    }
  }

  private async handleAudioContextFailed(): Promise<boolean> {
    // Try to create a new audio context
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const testContext = new AudioContextClass();
      await testContext.close();
      return true;
    } catch {
      return false;
    }
  }

  private async handleSpeechRecognitionNotSupported(): Promise<boolean> {
    // Cannot recover from unsupported feature
    return false;
  }

  private async handleSpeechRecognitionFailed(): Promise<boolean> {
    // Try to reinitialize speech recognition
    try {
      const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition || (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition() as { abort(): void };
        recognition.abort(); // Clean up
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async handleSpeechNoMatch(): Promise<boolean> {
    // This is recoverable - user can try speaking again
    return true;
  }

  private async handleWebSocketConnectionFailed(): Promise<boolean> {
    // Try to reconnect
    try {
      // This would be implemented by the WebSocket service
      return false; // Placeholder
    } catch {
      return false;
    }
  }

  private async handleWebSocketDisconnected(): Promise<boolean> {
    // Attempt reconnection
    return await this.handleWebSocketConnectionFailed();
  }

  private async handleNetworkError(): Promise<boolean> {
    // Check network connectivity
    return navigator.onLine;
  }

  private async handleAIServiceUnavailable(): Promise<boolean> {
    // Try to ping AI service
    try {
      const response = await fetch('/api/health/ai', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async handleTTSServiceFailed(): Promise<boolean> {
    // Try to test TTS service
    try {
      const response = await fetch('/api/health/tts', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async handleAIResponseTimeout(): Promise<boolean> {
    // AI timeout is recoverable - can retry
    return true;
  }

  private async handleUnknownError(): Promise<boolean> {
    // Unknown errors are potentially recoverable
    return true;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsByCode: Record<string, number>;
    recentErrors: VoiceError[];
  } {
    const errorsBySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByCode = this.errorLog.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errorLog.length,
      errorsBySeverity,
      errorsByCode,
      recentErrors: this.errorLog.slice(-10)
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.retryAttempts.clear();
  }

  /**
   * Create error context
   */
  createErrorContext(component: string, action: string, additionalInfo?: Record<string, unknown>): ErrorContext {
    return {
      component,
      action,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      additionalInfo
    };
  }
}

// Create singleton instance
export const voiceErrorHandler = new VoiceErrorHandler();
 