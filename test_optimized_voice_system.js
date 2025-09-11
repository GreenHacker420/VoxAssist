const WebSocket = require('ws');

/**
 * Test the optimized voice conversation system
 * Measures end-to-end response times and validates performance improvements
 */
class VoiceSystemPerformanceTester {
  constructor() {
    this.ws = null;
    this.callId = `test-call-${Date.now()}`;
    this.metrics = {
      totalTests: 0,
      successfulTests: 0,
      responseTimes: [],
      averageResponseTime: 0,
      target: 2000 // 2 seconds target
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:3001/ws');
      
      this.ws.on('open', () => {
        console.log('🔗 Connected to WebSocket');
        
        // Join the test call
        this.ws.send(JSON.stringify({
          type: 'join_call',
          callId: this.callId,
          token: 'test-token'
        }));
        
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'call_joined':
        console.log('✅ Joined test call:', this.callId);
        break;
        
      case 'voice_input_processed':
        console.log('🎤 Voice input processed:', message.transcriptId);
        break;
        
      case 'audio_response':
        const responseTime = Date.now() - this.currentTestStartTime;
        this.recordResponseTime(responseTime, message);
        break;
        
      case 'audio_stream_ready':
        const streamResponseTime = Date.now() - this.currentTestStartTime;
        console.log('🚀 Streaming audio ready:', {
          responseTime: streamResponseTime + 'ms',
          generationTime: message.generationTime + 'ms',
          status: streamResponseTime < 2000 ? '✅ FAST' : '⚠️ SLOW'
        });
        break;
        
      default:
        // console.log('📨 Received:', message.type);
        break;
    }
  }

  recordResponseTime(responseTime, message) {
    this.metrics.totalTests++;
    this.metrics.responseTimes.push(responseTime);
    
    if (responseTime < this.metrics.target) {
      this.metrics.successfulTests++;
    }
    
    this.metrics.averageResponseTime = Math.round(
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
    );

    console.log(`🎯 Response Time Test ${this.metrics.totalTests}:`, {
      responseTime: responseTime + 'ms',
      target: this.metrics.target + 'ms',
      status: responseTime < this.metrics.target ? '✅ FAST' : '⚠️ SLOW',
      audioSize: message.audioData?.length || 0,
      hasAudio: !!message.audioData
    });
  }

  async sendVoiceInput(text) {
    this.currentTestStartTime = Date.now();
    
    // Simulate voice input
    const audioData = Buffer.from(text).toString('base64');
    
    this.ws.send(JSON.stringify({
      type: 'voice_input',
      callId: this.callId,
      audioData,
      format: 'text',
      audioMetrics: {
        volume: 75,
        clarity: 85,
        duration: 2.5,
        sampleRate: 16000,
        bitRate: 128
      }
    }));
    
    console.log(`🎤 Sent voice input: "${text}"`);
  }

  async runPerformanceTests() {
    console.log('🚀 Starting Voice System Performance Tests...\n');
    
    const testInputs = [
      'Hello, how are you today?',
      'Can you help me with my account?',
      'I have a technical issue.',
      'What are your business hours?',
      'Thank you for your help.'
    ];

    for (let i = 0; i < testInputs.length; i++) {
      console.log(`\n--- Test ${i + 1}/${testInputs.length} ---`);
      await this.sendVoiceInput(testInputs[i]);
      
      // Wait for response before next test
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Wait for final responses
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 VOICE SYSTEM PERFORMANCE RESULTS');
    console.log('='.repeat(60));
    
    console.log(`📊 Total Tests: ${this.metrics.totalTests}`);
    console.log(`✅ Fast Responses (< ${this.metrics.target}ms): ${this.metrics.successfulTests}`);
    console.log(`⚠️ Slow Responses: ${this.metrics.totalTests - this.metrics.successfulTests}`);
    console.log(`📈 Success Rate: ${Math.round((this.metrics.successfulTests / this.metrics.totalTests) * 100)}%`);
    console.log(`⏱️ Average Response Time: ${this.metrics.averageResponseTime}ms`);
    console.log(`🎯 Target: < ${this.metrics.target}ms`);
    
    const performance = this.metrics.averageResponseTime < this.metrics.target ? 'OPTIMAL' : 'NEEDS_IMPROVEMENT';
    const emoji = performance === 'OPTIMAL' ? '🚀' : '⚠️';
    console.log(`${emoji} Overall Performance: ${performance}`);
    
    if (this.metrics.responseTimes.length > 0) {
      const minTime = Math.min(...this.metrics.responseTimes);
      const maxTime = Math.max(...this.metrics.responseTimes);
      console.log(`⚡ Fastest Response: ${minTime}ms`);
      console.log(`🐌 Slowest Response: ${maxTime}ms`);
    }
    
    console.log('\n🎉 Performance test completed!');
    
    // Fetch detailed performance report
    this.fetchPerformanceReport();
  }

  async fetchPerformanceReport() {
    try {
      const response = await fetch('http://localhost:3001/api/performance-report');
      const report = await response.json();
      
      console.log('\n📋 DETAILED PERFORMANCE REPORT:');
      console.log('='.repeat(40));
      console.log('Summary:', report.summary);
      
      if (report.bottlenecks.length > 0) {
        console.log('\n🔍 Bottlenecks:');
        report.bottlenecks.forEach((bottleneck, index) => {
          console.log(`${index + 1}. ${bottleneck.operation}: ${bottleneck.averageDuration}ms (${bottleneck.severity})`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.operation}: ${rec.issue}`);
          rec.solutions.forEach(solution => {
            console.log(`   - ${solution}`);
          });
        });
      }
      
    } catch (error) {
      console.error('Failed to fetch performance report:', error.message);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 Disconnected from WebSocket');
    }
  }
}

// Run the performance test
async function main() {
  const tester = new VoiceSystemPerformanceTester();
  
  try {
    await tester.connect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection to stabilize
    await tester.runPerformanceTests();
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    tester.disconnect();
    process.exit(0);
  }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

main();
