'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Avatar, Input, Badge } from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
  MinusOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { WidgetDTO } from '@/services/widgets';

const { Text } = Typography;

interface WidgetPreviewProps {
  widget: WidgetDTO;
  className?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function WidgetPreview({ widget, className = '' }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Auto-open if configured
    if (widget.behavior?.autoOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, widget.behavior.autoOpenDelay || 3000);
      return () => clearTimeout(timer);
    }
  }, [widget.behavior]);

  useEffect(() => {
    // Add greeting message when opened
    if (isOpen && messages.length === 0 && widget.behavior?.greeting) {
      setMessages([{
        id: '1',
        text: widget.behavior.greeting,
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length, widget.behavior?.greeting]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for your message! This is a preview of how the widget would respond.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const getPositionStyles = () => {
    const position = widget.appearance?.position || 'bottom-right';
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 9999,
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' };
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' };
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' };
      default:
        return { ...baseStyles, bottom: '20px', right: '20px' };
    }
  };

  const getSizeStyles = () => {
    const size = widget.appearance?.size || 'medium';
    switch (size) {
      case 'small':
        return { width: '300px', height: '400px' };
      case 'large':
        return { width: '400px', height: '600px' };
      default:
        return { width: '350px', height: '500px' };
    }
  };

  const getThemeStyles = () => {
    const appearance = widget.appearance;
    return {
      backgroundColor: appearance?.backgroundColor || '#ffffff',
      borderRadius: appearance?.borderRadius || '12px',
      border: `2px solid ${appearance?.primaryColor || '#3B82F6'}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    };
  };

  if (!isOpen) {
    return (
      <div className={className} style={getPositionStyles()}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<MessageOutlined />}
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: widget.appearance?.primaryColor || '#3B82F6',
            borderColor: widget.appearance?.primaryColor || '#3B82F6',
            width: '60px',
            height: '60px',
            fontSize: '24px',
          }}
        />
        <Badge
          count="1"
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={getPositionStyles()}>
      <Card
        style={{
          ...getSizeStyles(),
          ...getThemeStyles(),
          display: 'flex',
          flexDirection: 'column',
        }}
        bodyStyle={{
          padding: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            backgroundColor: widget.appearance?.primaryColor || '#3B82F6',
            color: widget.appearance?.textColor || '#ffffff',
            borderRadius: `${widget.appearance?.borderRadius || '12px'} ${widget.appearance?.borderRadius || '12px'} 0 0`,
          }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Avatar
                size="small"
                icon={<RobotOutlined />}
                style={{
                  backgroundColor: widget.appearance?.secondaryColor || '#1E40AF',
                }}
              />
              <Text strong style={{ color: widget.appearance?.textColor || '#ffffff' }}>
                {widget.name}
              </Text>
            </div>
            <Space>
              <Button
                type="text"
                size="small"
                icon={<MinusOutlined />}
                onClick={() => setIsMinimized(!isMinimized)}
                style={{ color: widget.appearance?.textColor || '#ffffff' }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setIsOpen(false)}
                style={{ color: widget.appearance?.textColor || '#ffffff' }}
              />
            </Space>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                backgroundColor: '#f8f9fa',
              }}
            >
              <Space direction="vertical" className="w-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        backgroundColor: message.sender === 'user' 
                          ? widget.appearance?.primaryColor || '#3B82F6'
                          : '#ffffff',
                        color: message.sender === 'user' 
                          ? widget.appearance?.textColor || '#ffffff'
                          : '#000000',
                        border: message.sender === 'ai' ? '1px solid #e5e7eb' : 'none',
                      }}
                    >
                      <Text
                        style={{
                          color: message.sender === 'user' 
                            ? widget.appearance?.textColor || '#ffffff'
                            : '#000000',
                        }}
                      >
                        {message.text}
                      </Text>
                    </div>
                  </div>
                ))}
              </Space>
            </div>

            {/* Input */}
            <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={handleSendMessage}
                  disabled={!widget.behavior?.enableText}
                />
                {widget.behavior?.enableVoice && (
                  <Button
                    type="text"
                    icon={<MessageOutlined />}
                    style={{ color: widget.appearance?.primaryColor || '#3B82F6' }}
                  />
                )}
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  style={{
                    backgroundColor: widget.appearance?.primaryColor || '#3B82F6',
                    borderColor: widget.appearance?.primaryColor || '#3B82F6',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
