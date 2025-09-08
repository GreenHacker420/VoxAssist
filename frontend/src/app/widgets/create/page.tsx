'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CogIcon,
  EyeIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

interface WidgetFormData {
  name: string;
  websiteUrl: string;
  greeting: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  enableVoice: boolean;
  enableText: boolean;
  autoOpen: boolean;
}

export default function CreateWidgetPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<WidgetFormData>({
    name: '',
    websiteUrl: '',
    greeting: 'Hi! How can I help you today?',
    primaryColor: '#3B82F6',
    position: 'bottom-right',
    enableVoice: true,
    enableText: true,
    autoOpen: false,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          appearance: {
            position: formData.position,
            primaryColor: formData.primaryColor,
            secondaryColor: '#1E40AF',
            textColor: '#FFFFFF',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            size: 'medium'
          },
          behavior: {
            autoOpen: formData.autoOpen,
            greeting: formData.greeting,
            language: 'en',
            enableVoice: formData.enableVoice,
            enableText: formData.enableText
          },
          permissions: {
            collectPersonalData: false,
            storeCookies: true,
            recordAudio: formData.enableVoice,
            shareWithThirdParty: false
          }
        }),
      });

      if (response.ok) {
        router.push('/dashboard?created=true');
      } else {
        throw new Error('Failed to create widget');
      }
    } catch (error) {
      console.error('Error creating widget:', error);
      alert('Failed to create widget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmbedCode = () => {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    return `<!-- VoxAssist Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseOrigin}/widget.js';
    script.async = true;
    script.setAttribute('data-widget-config', JSON.stringify({
      greeting: "${formData.greeting}",
      primaryColor: "${formData.primaryColor}",
      position: "${formData.position}",
      enableVoice: ${formData.enableVoice},
      enableText: ${formData.enableText},
      autoOpen: ${formData.autoOpen}
    }));
    document.head.appendChild(script);
  })();
</script>`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Voice Assistant Widget</h1>
          <p className="mt-2 text-gray-600">
            Configure your AI-powered voice assistant widget for your website
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Widget Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="My Customer Support Widget"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Website URL
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter your website's URL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Greeting Message
                    </label>
                    <textarea
                      value={formData.greeting}
                      onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                      placeholder="Hi! How can I help you today?"
                    />
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="mt-1 block w-20 h-10 rounded-md border-gray-300 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Position
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as WidgetFormData['position'] })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableVoice}
                      onChange={(e) => setFormData({ ...formData, enableVoice: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Voice Chat</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableText}
                      onChange={(e) => setFormData({ ...formData, enableText: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Text Chat</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.autoOpen}
                      onChange={(e) => setFormData({ ...formData, autoOpen: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-open on page load</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Creating Widget...' : 'Create Widget'}
                </button>
              </div>
            </form>
          </div>

          {/* Preview & Code */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <EyeIcon className="h-5 w-5 mr-2" />
                Preview
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 relative h-48">
                <div className="text-sm text-gray-500 mb-4">Your website preview</div>
                <div
                  className={`absolute w-16 h-16 rounded-full shadow-lg flex items-center justify-center cursor-pointer transform hover:scale-105 transition-transform ${
                    formData.position.includes('bottom') ? 'bottom-4' : 'top-4'
                  } ${
                    formData.position.includes('right') ? 'right-4' : 'left-4'
                  }`}
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  <CogIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Embed Code */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CodeBracketIcon className="h-5 w-5 mr-2" />
                Embed Code
              </h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-sm text-green-400 overflow-x-auto">
                  <code>{generateEmbedCode()}</code>
                </pre>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Copy this code and paste it into your website&apos;s HTML to add the widget.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
