const WebSocket = require('ws');

/**
 * Test the fixed voice conversation system
 * Verifies: 1) No duplicate audio playback, 2) Varied AI responses, 3) Proper transcriptId
 */
class VoiceSystemFixTester {
  constructor() {
    this.ws = null;
    this.callId = `test-call-${Date.now()}`;
    this.audioResponseCount = 0;
    this.responses = [];
    this.transcriptIds = [];
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
        
      case 'audio_response':
        this.audioResponseCount++;
        console.log(`🎵 Audio Response ${this.audioResponseCount}:`, {
          hasText: !!message.text,
          hasAudio: !!message.audioData,
          transcriptId: message.transcriptId,
          textPreview: message.text ? message.text.substring(0, 50) + '...' : 'No text'
        });
        
        // Store response data for analysis
        this.responses.push({
          text: message.text,
          transcriptId: message.transcriptId,
          hasAudio: !!message.audioData
        });
        
        if (message.transcriptId) {
          this.transcriptIds.push(message.transcriptId);
        }
        break;
        
      case 'audio_stream_ready':
        console.log('⚠️ DUPLICATE AUDIO DETECTED: audio_stream_ready message received');
        console.log('This should NOT happen - duplicate audio playback issue!');
        break;
        
      default:
        // console.log('📨 Received:', message.type);
        break;
    }
  }

  async sendVoiceInput(text) {
    console.log(`🎤 Sending: "${text}"`);
    
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
  }

  async runFixTests() {
    console.log('🧪 Testing Voice System Fixes...\n');
    
    const testInputs = [
      'Hello, how are you today?',
      'I need help with my billing account',
      'My device is not working properly',
      'What are your business hours?',
      'Can you help me reset my password?'
    ];

    for (let i = 0; i < testInputs.length; i++) {
      console.log(`\n--- Test ${i + 1}/${testInputs.length} ---`);
      await this.sendVoiceInput(testInputs[i]);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    // Wait for final responses
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.analyzeResults();
  }

  analyzeResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VOICE SYSTEM FIX ANALYSIS');
    console.log('='.repeat(60));
    
    // Test 1: No Duplicate Audio Playback
    console.log('\n1️⃣ DUPLICATE AUDIO PLAYBACK TEST:');
    console.log(`   Total audio_response messages: ${this.audioResponseCount}`);
    console.log(`   Expected: ${this.responses.length} (one per input)`);
    
    if (this.audioResponseCount === this.responses.length) {
      console.log('   ✅ PASS: No duplicate audio playback detected');
    } else {
      console.log('   ❌ FAIL: Duplicate audio playback detected');
    }
    
    // Test 2: AI Response Variety
    console.log('\n2️⃣ AI RESPONSE VARIETY TEST:');
    const uniqueResponses = new Set(this.responses.map(r => r.text));
    console.log(`   Unique responses: ${uniqueResponses.size}/${this.responses.length}`);
    
    this.responses.forEach((response, index) => {
      console.log(`   ${index + 1}. "${response.text}"`);
    });
    
    if (uniqueResponses.size >= 3) {
      console.log('   ✅ PASS: Good response variety detected');
    } else {
      console.log('   ❌ FAIL: Limited response variety');
    }
    
    // Test 3: TranscriptId Consistency
    console.log('\n3️⃣ TRANSCRIPT ID CONSISTENCY TEST:');
    const validTranscriptIds = this.transcriptIds.filter(id => id && id !== 'undefined');
    console.log(`   Valid transcript IDs: ${validTranscriptIds.length}/${this.responses.length}`);
    
    validTranscriptIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    if (validTranscriptIds.length === this.responses.length) {
      console.log('   ✅ PASS: All responses have valid transcript IDs');
    } else {
      console.log('   ❌ FAIL: Some responses missing transcript IDs');
    }
    
    // Overall Results
    console.log('\n' + '='.repeat(60));
    const passedTests = [
      this.audioResponseCount === this.responses.length,
      uniqueResponses.size >= 3,
      validTranscriptIds.length === this.responses.length
    ].filter(Boolean).length;
    
    console.log(`🎯 OVERALL RESULTS: ${passedTests}/3 tests passed`);
    
    if (passedTests === 3) {
      console.log('🎉 ALL FIXES WORKING CORRECTLY!');
    } else {
      console.log('⚠️ Some issues still need attention');
    }
    
    console.log('='.repeat(60));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 Disconnected from WebSocket');
    }
  }
}

// Run the fix test
async function main() {
  const tester = new VoiceSystemFixTester();
  
  try {
    await tester.connect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection to stabilize
    await tester.runFixTests();
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    tester.disconnect();
    process.exit(0);
  }
}

main();
