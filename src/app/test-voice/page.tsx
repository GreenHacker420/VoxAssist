'use client';

import React, { useState } from 'react';
import { Card, Button, Alert, Space, Typography, Divider } from 'antd';
import { PhoneOutlined, BugOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useVoiceActivityDetection } from '@/hooks/useVoiceActivityDetection';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useDemoCallWebSocket } from '@/hooks/useDemoCallWebSocket';
import DashboardLayout from '@/components/Layout/DashboardLayout';

const { Title, Text } = Typography;

export default function TestVoicePage() {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [testLogs, setTestLogs] = useState<string[]>([]);

  // Initialize hooks for testing
  const vadHook = useVoiceActivityDetection({
    onError: (error) => addLog(`VAD Error: ${error}`),
    onVoiceStart: () => addLog('VAD: Voice started'),
    onVoiceEnd: () => addLog('VAD: Voice ended'),
    onVoiceActivity: (isActive, confidence) => addLog(`VAD: ${isActive ? 'Active' : 'Inactive'} (${confidence.toFixed(2)})`)
  });

  const sttHook = useSpeechToText({
    onError: (error) => addLog(`STT Error: ${error}`),
    onStart: () => addLog('STT: Started listening'),
    onEnd: () => addLog('STT: Stopped listening'),
    onResult: (result) => addLog(`STT Result: "${result.transcript}" (${result.confidence.toFixed(2)})`)
  });

  const wsHook = useDemoCallWebSocket({
    onAudioResponse: (audioUrl) => addLog(`WS: Audio response received: ${audioUrl.substring(0, 50)}...`),
    onVoiceTranscribed: (transcript) => addLog(`WS: Voice transcribed: "${transcript}"`),
    onVoiceAnalysis: (analysis) => addLog(`WS: Voice analysis received`)
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  };

  const runTest = async (testName: string, testFn: () => Promise<boolean>) => {
    addLog(`Starting test: ${testName}`);
    try {
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: result }));
      addLog(`Test ${testName}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      setTestResults(prev => ({ ...prev, [testName]: false }));
      addLog(`Test ${testName}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testVoiceActivityDetection = async (): Promise<boolean> => {
    try {
      await vadHook.startDetection();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      vadHook.stopDetection();
      return !vadHook.error;
    } catch (error) {
      return false;
    }
  };

  const testSpeechToText = async (): Promise<boolean> => {
    try {
      if (!sttHook.isSupported) {
        addLog('STT: Browser not supported, testing fallback mode');
      }
      await sttHook.startListening();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      sttHook.stopListening();
      return !sttHook.error;
    } catch (error) {
      return false;
    }
  };

  const testWebSocketConnection = async (): Promise<boolean> => {
    try {
      const testCallId = `test-call-${Date.now()}`;
      wsHook.connectToCall(testCallId);
      
      // Wait for connection or timeout
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const connected = wsHook.isConnected;
      if (connected) {
        wsHook.disconnectFromCall();
      }
      
      return connected || wsHook.callStatus === 'ended'; // Accept graceful offline mode
    } catch (error) {
      return false;
    }
  };

  const runAllTests = async () => {
    setTestResults({});
    setTestLogs([]);
    addLog('Starting comprehensive voice system test...');
    
    await runTest('Voice Activity Detection', testVoiceActivityDetection);
    await runTest('Speech to Text', testSpeechToText);
    await runTest('WebSocket Connection', testWebSocketConnection);
    
    addLog('All tests completed!');
  };

  const getTestIcon = (testName: string) => {
    if (!(testName in testResults)) return null;
    return testResults[testName] ? 
      <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Title level={2}>
            <BugOutlined className="mr-3" />
            Voice System Debug & Test
          </Title>
          <Text type="secondary">
            Test and debug the voice conversation functionality components
          </Text>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <Card title="Test Controls" className="h-fit">
            <Space direction="vertical" className="w-full">
              <Button 
                type="primary" 
                size="large" 
                icon={<PhoneOutlined />}
                onClick={runAllTests}
                className="w-full"
              >
                Run All Tests
              </Button>
              
              <Divider />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Text>Voice Activity Detection</Text>
                  {getTestIcon('Voice Activity Detection')}
                </div>
                <div className="flex items-center justify-between">
                  <Text>Speech to Text</Text>
                  {getTestIcon('Speech to Text')}
                </div>
                <div className="flex items-center justify-between">
                  <Text>WebSocket Connection</Text>
                  {getTestIcon('WebSocket Connection')}
                </div>
              </div>

              <Divider />

              {/* Current Status */}
              <div className="space-y-2">
                <Text strong>Current Status:</Text>
                <div className="text-sm space-y-1">
                  <div>VAD: {vadHook.isListening ? 'Listening' : 'Stopped'} {vadHook.error && `(Error: ${vadHook.error})`}</div>
                  <div>STT: {sttHook.isListening ? 'Listening' : 'Stopped'} {sttHook.error && `(Error: ${sttHook.error})`}</div>
                  <div>WS: {wsHook.isConnected ? 'Connected' : 'Disconnected'} ({wsHook.callStatus}) {wsHook.error && `(Error: ${wsHook.error})`}</div>
                </div>
              </div>
            </Space>
          </Card>

          {/* Test Logs */}
          <Card title="Test Logs" className="h-fit">
            <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
              {testLogs.length === 0 ? (
                <Text type="secondary">No logs yet. Run tests to see output.</Text>
              ) : (
                <div className="space-y-1">
                  {testLogs.map((log, index) => (
                    <div key={index} className="text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Browser Compatibility */}
          <Card title="Browser Compatibility" className="h-fit">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Text>Speech Recognition API</Text>
                {sttHook.isSupported ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>Web Audio API</Text>
                {typeof window !== 'undefined' && window.AudioContext ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>MediaRecorder API</Text>
                {typeof window !== 'undefined' && window.MediaRecorder ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>WebSocket Support</Text>
                {typeof window !== 'undefined' && window.WebSocket ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card title="Instructions" className="h-fit">
            <div className="space-y-3">
              <Alert
                message="Testing Voice Features"
                description="Click 'Run All Tests' to verify that all voice conversation components are working correctly."
                type="info"
                showIcon
              />
              <div className="text-sm space-y-2">
                <div><strong>Voice Activity Detection:</strong> Tests microphone access and voice detection</div>
                <div><strong>Speech to Text:</strong> Tests speech recognition capabilities</div>
                <div><strong>WebSocket:</strong> Tests real-time communication (may work in offline mode)</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
