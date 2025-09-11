require('dotenv').config();
const WebSocket = require('ws');

// Test WebSocket connection and audio response flow
async function testWebSocketAudioFlow() {
  console.log('Testing WebSocket audio response flow...');
  
  const ws = new WebSocket('ws://localhost:3001/ws');
  
  ws.on('open', () => {
    console.log('WebSocket connected');
    
    // Join demo call
    const joinMessage = {
      type: 'join_demo_call',
      callId: 'test-call-123',
      token: 'demo-token'
    };
    
    console.log('Sending join message:', joinMessage);
    ws.send(JSON.stringify(joinMessage));
    
    // Wait a bit then send voice input
    setTimeout(() => {
      const voiceMessage = {
        type: 'voice_input',
        callId: 'test-call-123',
        audioData: Buffer.from('fake audio data').toString('base64'),
        format: 'webm',
        audioMetrics: {
          volume: 0.8,
          clarity: 0.9,
          duration: 2000,
          sampleRate: 16000,
          bitRate: 128000
        }
      };
      
      console.log('Sending voice input message...');
      ws.send(JSON.stringify(voiceMessage));
    }, 1000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', {
        type: message.type,
        hasText: !!message.text,
        hasAudioData: !!message.audioData,
        audioDataLength: message.audioData ? message.audioData.length : 0,
        contentType: message.contentType,
        transcriptId: message.transcriptId
      });
      
      if (message.type === 'audio_response' && message.audioData) {
        console.log('✅ SUCCESS: Received audio response with audio data!');
        console.log('Audio data length:', message.audioData.length);
        console.log('Content type:', message.contentType);
        
        // Test base64 decoding
        try {
          const audioBuffer = Buffer.from(message.audioData, 'base64');
          console.log('✅ Audio data decoded successfully, buffer size:', audioBuffer.length);
        } catch (error) {
          console.error('❌ Failed to decode audio data:', error.message);
        }
      } else if (message.type === 'audio_response' && !message.audioData) {
        console.log('❌ ISSUE: Received audio_response but no audioData');
      }
      
      // Close after receiving audio response
      if (message.type === 'audio_response') {
        setTimeout(() => {
          ws.close();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to parse message:', error.message);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
}

// Run the test
testWebSocketAudioFlow().catch(console.error);
