'use client';

import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, Alert, Divider } from 'antd';
import { CubeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import VoiceInteractionManager from './VoiceInteractionManager';
import { voiceErrorHandler } from '@/services/voiceErrorHandler';

const { Title, Text } = Typography;

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
}

export default function VoiceInteractionTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Speech Recognition Support', status: 'pending' },
    { name: 'Microphone Access', status: 'pending' },
    { name: 'Voice Input Processing', status: 'pending' },
    { name: 'WebSocket Connection', status: 'pending' },
    { name: 'Audio Playback', status: 'pending' },
    { name: 'Error Handling', status: 'pending' }
  ]);
  
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [callId] = useState('test-call-' + Date.now());

  const updateTestResult = useCallback((name: string, status: TestResult['status'], message?: string) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, status, message } : test
    ));
  }, []);

  const runTests = useCallback(async () => {
    setIsTestRunning(true);
    
    // Test 1: Speech Recognition Support
    updateTestResult('Speech Recognition Support', 'running');
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    updateTestResult('Speech Recognition Support', isSupported ? 'passed' : 'failed', 
      isSupported ? 'Browser supports speech recognition' : 'Browser does not support speech recognition');

    // Test 2: Microphone Access
    updateTestResult('Microphone Access', 'running');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateTestResult('Microphone Access', 'passed', 'Microphone access granted');
    } catch (error) {
      updateTestResult('Microphone Access', 'failed', 'Microphone access denied');
    }

    // Test 3: Error Handler
    updateTestResult('Error Handling', 'running');
    try {
      const context = voiceErrorHandler.createErrorContext('VoiceInteractionTest', 'testError');
      const result = await voiceErrorHandler.handleError('SPEECH_RECOGNITION_FAILED', context);
      updateTestResult('Error Handling', 'passed', 'Error handler working correctly');
    } catch (error) {
      updateTestResult('Error Handling', 'failed', 'Error handler failed');
    }

    setIsTestRunning(false);
  }, [updateTestResult]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <Title level={4}>
          <CubeIcon className="h-6 w-6 inline mr-2" />
          Voice Interaction System Test
        </Title>
        
        <Space direction="vertical" className="w-full">
          <Button 
            type="primary" 
            onClick={runTests} 
            loading={isTestRunning}
            disabled={isTestRunning}
          >
            Run Tests
          </Button>

          <Divider />

          <div className="space-y-3">
            {testResults.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <Text strong>{test.name}</Text>
                </div>
                {test.message && (
                  <Text type={test.status === 'failed' ? 'danger' : 'success'} className="text-sm">
                    {test.message}
                  </Text>
                )}
              </div>
            ))}
          </div>
        </Space>
      </Card>

      <Card>
        <Title level={4}>Live Voice Interaction Test</Title>
        <Alert
          message="Test Instructions"
          description="Use the voice controls below to test the complete voice interaction flow. Speak into your microphone and verify that speech is recognized, processed, and responses are played back."
          type="info"
          showIcon
          className="mb-4"
        />
        
        <VoiceInteractionManager
          callId={callId}
          onTranscriptUpdate={(transcript) => {
            console.log('Test transcript update:', transcript);
            updateTestResult('Voice Input Processing', 'passed', 'Voice input processed successfully');
          }}
          onSentimentUpdate={(sentiment) => {
            console.log('Test sentiment update:', sentiment);
          }}
          onStatusChange={(status) => {
            console.log('Test status change:', status);
            if (status === 'speaking') {
              updateTestResult('Audio Playback', 'passed', 'Audio playback working');
            }
          }}
        />
      </Card>
    </div>
  );
}
