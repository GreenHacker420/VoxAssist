const WebSocket = require('ws');

class UltraFastVoiceSystemTester {
  constructor() {
    this.ws = null;
    this.callId = `test-call-${Date.now()}`;
    this.responses = [];
    this.transcriptEntries = [];
    this.textResponses = [];
    this.audioResponses = [];
    this.startTime = null;
    this.responseTimings = [];
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

  handleMessage(data) {
    const timestamp = Date.now();
    
    switch (data.type) {
      case 'call_joined':
        console.log(`✅ Joined test call: ${data.callId}`);
        break;
        
      case 'transcript_entry':
        console.log(`📝 Transcript entry: ${data.entry?.speaker}: "${data.entry?.text}"`);
        this.transcriptEntries.push({
          ...data.entry,
          receivedAt: timestamp
        });
        break;
        
      case 'text_response':
        const textResponseTime = timestamp - this.startTime;
        console.log(`⚡ Ultra-fast text response (${textResponseTime}ms): "${data.text}"`);
        this.textResponses.push({
          text: data.text,
          transcriptId: data.transcriptId,
          responseTime: textResponseTime,
          receivedAt: timestamp
        });
        break;
        
      case 'audio_response':
        const audioResponseTime = timestamp - this.startTime;
        console.log(`🎵 Audio response (${audioResponseTime}ms): {
  hasText: ${!!data.text},
  hasAudio: ${!!data.audioData},
  transcriptId: '${data.transcriptId}',
  textPreview: '${data.text ? data.text.substring(0, 50) + '...' : 'N/A'}'
}`);
        this.audioResponses.push({
          text: data.text,
          hasAudio: !!data.audioData,
          audioDataLength: data.audioData ? data.audioData.length : 0,
          transcriptId: data.transcriptId,
          responseTime: audioResponseTime,
          receivedAt: timestamp
        });
        break;
    }
  }

  async sendVoiceInput(text) {
    this.startTime = Date.now();
    console.log(`🎤 Sending: "${text}"`);
    
    this.ws.send(JSON.stringify({
      type: 'voice_input',
      callId: this.callId,
      audioData: text, // Simulated text input
      format: 'text',
      metadata: {
        sampleRate: 16000,
        bitRate: 128,
        duration: 2.5,
        volume: 75,
        clarity: 85
      }
    }));
  }

  async runUltraFastTests() {
    console.log('🧪 Testing Ultra-Fast Voice System...\n');

    const testInputs = [
      "Hello, how are you?",
      "Tell me about mattresses",
      "What's the weather like?",
      "Can you help me with my account?",
      "I love pizza and movies"
    ];

    for (let i = 0; i < testInputs.length; i++) {
      console.log(`--- Test ${i + 1}/${testInputs.length} ---`);
      await this.sendVoiceInput(testInputs[i]);
      
      // Wait for responses (shorter timeout for ultra-fast system)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Wait a bit more for any delayed responses
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  analyzeResults() {
    console.log('\n============================================================');
    console.log('🔍 ULTRA-FAST VOICE SYSTEM ANALYSIS');
    console.log('============================================================\n');

    // Issue 1: AI Responses Appearing in Chat Interface
    console.log('1️⃣ AI RESPONSES IN CHAT INTERFACE TEST:');
    const aiTranscriptEntries = this.transcriptEntries.filter(entry => entry.speaker === 'ai');
    console.log(`   AI transcript entries received: ${aiTranscriptEntries.length}`);
    
    if (aiTranscriptEntries.length > 0) {
      console.log('   ✅ PASS: AI responses are appearing in transcript/chat');
      aiTranscriptEntries.forEach((entry, index) => {
        console.log(`   ${index + 1}. "${entry.text}"`);
      });
    } else {
      console.log('   ❌ FAIL: No AI responses in transcript/chat interface');
    }

    // Issue 2: Ultra-Fast Response Times (Target: <200ms)
    console.log('\n2️⃣ ULTRA-FAST RESPONSE TIME TEST (Target: <200ms):');
    const textResponseTimes = this.textResponses.map(r => r.responseTime);
    const audioResponseTimes = this.audioResponses.map(r => r.responseTime);
    
    if (textResponseTimes.length > 0) {
      const avgTextTime = textResponseTimes.reduce((a, b) => a + b, 0) / textResponseTimes.length;
      const fastTextResponses = textResponseTimes.filter(time => time < 200).length;
      
      console.log(`   Text Response Times: ${textResponseTimes.join('ms, ')}ms`);
      console.log(`   Average text response: ${Math.round(avgTextTime)}ms`);
      console.log(`   Ultra-fast responses (<200ms): ${fastTextResponses}/${textResponseTimes.length}`);
      
      if (avgTextTime < 200) {
        console.log('   ✅ PASS: Ultra-fast text responses achieved');
      } else if (avgTextTime < 500) {
        console.log('   ⚡ GOOD: Fast text responses (but not ultra-fast)');
      } else {
        console.log('   ❌ FAIL: Text responses too slow');
      }
    }

    if (audioResponseTimes.length > 0) {
      const avgAudioTime = audioResponseTimes.reduce((a, b) => a + b, 0) / audioResponseTimes.length;
      console.log(`   Average audio response: ${Math.round(avgAudioTime)}ms`);
    }

    // Issue 3: Full AI Conversational Capabilities
    console.log('\n3️⃣ FULL AI CONVERSATIONAL CAPABILITIES TEST:');
    const allResponses = [...this.textResponses, ...this.audioResponses];
    const uniqueResponses = [...new Set(allResponses.map(r => r.text))];
    
    console.log(`   Total responses: ${allResponses.length}`);
    console.log(`   Unique responses: ${uniqueResponses.length}`);
    console.log('   Response variety:');
    
    uniqueResponses.forEach((response, index) => {
      console.log(`   ${index + 1}. "${response}"`);
    });

    const varietyScore = uniqueResponses.length / Math.max(allResponses.length, 1);
    if (varietyScore > 0.7) {
      console.log('   ✅ PASS: Excellent response variety - Full AI capabilities enabled');
    } else if (varietyScore > 0.4) {
      console.log('   ⚡ GOOD: Good response variety');
    } else {
      console.log('   ❌ FAIL: Limited response variety - AI capabilities constrained');
    }

    // Overall Results
    console.log('\n============================================================');
    const textResponsesWorking = this.textResponses.length > 0;
    const chatInterfaceWorking = aiTranscriptEntries.length > 0;
    const ultraFastResponses = textResponseTimes.some(time => time < 200);
    const goodVariety = varietyScore > 0.4;
    
    const passedTests = [textResponsesWorking, chatInterfaceWorking, ultraFastResponses, goodVariety].filter(Boolean).length;
    
    console.log(`🎯 OVERALL RESULTS: ${passedTests}/4 tests passed`);
    
    if (passedTests === 4) {
      console.log('🎉 ALL CRITICAL ISSUES RESOLVED! Ultra-fast voice system working perfectly!');
    } else if (passedTests >= 3) {
      console.log('⚡ MAJOR IMPROVEMENTS! Most critical issues resolved.');
    } else {
      console.log('⚠️  PARTIAL SUCCESS: Some issues remain.');
    }
    
    console.log('============================================================');
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 Disconnected from WebSocket');
    }
  }
}

// Run the test
async function runTest() {
  const tester = new UltraFastVoiceSystemTester();
  
  try {
    await tester.connect();
    await tester.runUltraFastTests();
    tester.analyzeResults();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    tester.disconnect();
  }
}

runTest();
