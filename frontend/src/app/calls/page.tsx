'use client';

import { useState, useEffect } from 'react';
import { Call } from '@/types';
import { CallsService } from '@/services/calls';
// import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CallControlsPopup from '@/components/CallControls/CallControlsPopup';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { formatDate, formatDuration } from '@/lib/utils';
import {
  PhoneIcon,
  StopIcon,
  EyeIcon,
  PlusIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [isCallDetailsModalOpen, setIsCallDetailsModalOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [enableAdvancedAnalysis, setEnableAdvancedAnalysis] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [activeCallForControls, setActiveCallForControls] = useState<Call | null>(null);
  const [showCallControls, setShowCallControls] = useState(false);

  useEffect(() => {
    refreshCalls();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'escalated':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-400';
    }
  };

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsInitiating(true);
    
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const callData = await CallsService.initiateCall(fullPhoneNumber, {
        enableAdvancedAnalysis
      });
      toast.success('Call initiated successfully');
      setIsNewCallModalOpen(false);
      setCountryCode('+1');
      setPhoneNumber('');
      setEnableAdvancedAnalysis(false);
      
      // Show call controls popup for the new active call
      if (callData && callData.status === 'active') {
        setActiveCallForControls(callData);
        setShowCallControls(true);
      }
      
      refreshCalls();
    } catch (error) {
      console.error('Failed to initiate call:', error);
      toast.error('Failed to initiate call');
    } finally {
      setIsInitiating(false);
    }
  };

  const refreshCalls = async () => {
    try {
      setIsLoading(true);
      const data = await CallsService.getCalls();
      setCalls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (call: Call) => {
    setSelectedCall(call);
    setIsCallDetailsModalOpen(true);
  };

  const handleHandoffToHuman = async (callId: string) => {
    try {
      await CallsService.handoffToHuman(callId);
      toast.success('Call handed off to human agent');
      refreshCalls();
    } catch (error) {
      console.error('Failed to handoff call:', error);
      toast.error('Failed to handoff call');
    }
  };

  const handleShowCallControls = (call: Call) => {
    setActiveCallForControls(call);
    setShowCallControls(true);
  };

  const handleCloseCallControls = () => {
    setShowCallControls(false);
    setActiveCallForControls(null);
  };

  const handleEndCallFromControls = async () => {
    if (activeCallForControls) {
      await handleEndCall(activeCallForControls.id);
      handleCloseCallControls();
    }
  };

  const handleHandoffFromControls = async () => {
    if (activeCallForControls) {
      await handleHandoffToHuman(activeCallForControls.id);
      refreshCalls();
    }
  };

  const handleEndCall = async (callId: string) => {
    try {
      await CallsService.endCall(callId);
      toast.success('Call ended successfully');
      refreshCalls();
    } catch (err) {
      console.error('Failed to end call:', err);
      toast.error('Failed to end call. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Calls</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage and monitor all voice calls and interactions.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Button onClick={() => setIsNewCallModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Call
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Calls list */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {calls.length === 0 ? (
              <li className="px-6 py-12 text-center">
                <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No calls</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by making your first call.</p>
                <div className="mt-6">
                  <Button onClick={() => setIsNewCallModalOpen(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                    New Call
                  </Button>
                </div>
              </li>
            ) : (
              calls.map((call) => (
                <li key={call.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <PhoneIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {call.customerName || call.customerPhone || `Call ${call.id}`}
                            </p>
                            <span
                              className={cn(
                                'ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                getStatusColor(call.status)
                              )}
                            >
                              {call.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <p>
                              Started {formatDate(call.startTime)}
                              {call.duration && ` • Duration: ${formatDuration(call.duration)}`}
                              {call.sentiment && (
                                <span className={cn('ml-2', getSentimentColor(call.sentiment))}>
                                  • {call.sentiment} sentiment
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {call.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleEndCall(call.id)}
                            className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500"
                          >
                            <StopIcon className="h-4 w-4 mr-1" />
                            End Call
                          </button>
                        )}
                        {call.status === 'active' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleShowCallControls(call)}
                              className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 mr-2"
                            >
                              <Cog6ToothIcon className="h-4 w-4 mr-1" />
                              Call Controls
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`/calls/live/${call.id}`, '_blank')}
                              className="inline-flex items-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-500 mr-2"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Monitor Live
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewDetails(call)}
                          className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* New Call Modal */}
      <Modal
        isOpen={isNewCallModalOpen}
        onClose={() => {
          setIsNewCallModalOpen(false);
          setCountryCode('+1');
          setPhoneNumber('');
        }}
        title="Initiate New Call"
        maxWidth="md"
      >
        <form onSubmit={handleInitiateCall} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="country-code" className="block text-sm font-medium text-black mb-2">
                Country Code
              </label>
              <select
                id="country-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="+1">🇺🇸 +1 (United States)</option>
                <option value="+44">🇬🇧 +44 (United Kingdom)</option>
                <option value="+91">🇮🇳 +91 (India)</option>
                <option value="+86">🇨🇳 +86 (China)</option>
                <option value="+49">🇩🇪 +49 (Germany)</option>
                <option value="+33">🇫🇷 +33 (France)</option>
                <option value="+81">🇯🇵 +81 (Japan)</option>
                <option value="+82">🇰🇷 +82 (South Korea)</option>
                <option value="+61">🇦🇺 +61 (Australia)</option>
                <option value="+55">🇧🇷 +55 (Brazil)</option>
                <option value="+7">🇷🇺 +7 (Russia)</option>
                <option value="+34">🇪🇸 +34 (Spain)</option>
                <option value="+39">🇮🇹 +39 (Italy)</option>
                <option value="+31">🇳🇱 +31 (Netherlands)</option>
                <option value="+46">🇸🇪 +46 (Sweden)</option>
                <option value="+47">🇳🇴 +47 (Norway)</option>
                <option value="+45">🇩🇰 +45 (Denmark)</option>
                <option value="+41">🇨🇭 +41 (Switzerland)</option>
                <option value="+43">🇦🇹 +43 (Austria)</option>
                <option value="+32">🇧🇪 +32 (Belgium)</option>
              </select>
            </div>
            
            <Input
              type="tel"
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="1234567890"
              helperText={`Enter the phone number without country code. Full number will be: ${countryCode}${phoneNumber}`}
              required
            />

            {/* Advanced Analysis Toggle */}
            <div className="flex items-center space-x-3">
              <input
                id="advanced-analysis"
                type="checkbox"
                checked={enableAdvancedAnalysis}
                onChange={(e) => setEnableAdvancedAnalysis(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="advanced-analysis" className="text-sm font-medium text-gray-700">
                Enable Advanced Analysis
              </label>
            </div>
            
            {enableAdvancedAnalysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Advanced Analysis Features
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Real-time sentiment analysis and emotion detection</li>
                        <li>Voice stress level monitoring</li>
                        <li>Conversation flow analysis</li>
                        <li>Customer satisfaction prediction</li>
                        <li>Automated call quality scoring</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              isLoading={isInitiating}
              className="flex-1"
            >
              {isInitiating ? 'Initiating...' : 'Initiate Call'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsNewCallModalOpen(false);
                setCountryCode('+1');
                setPhoneNumber('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Call Details Modal */}
      <Modal
        isOpen={isCallDetailsModalOpen}
        onClose={() => {
          setIsCallDetailsModalOpen(false);
          setSelectedCall(null);
        }}
        title="Call Details"
        maxWidth="lg"
      >
        {selectedCall && (
          <div className="space-y-6">
            {/* Call Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-black mb-2">Call Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Call ID:</span>
                    <span className="text-black font-mono">{selectedCall.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone Number:</span>
                    <span className="text-black">{selectedCall.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      getStatusColor(selectedCall.status)
                    )}>
                      {selectedCall.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="text-black">{formatDate(selectedCall.startTime)}</span>
                  </div>
                  {selectedCall.endTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ended:</span>
                      <span className="text-black">{formatDate(selectedCall.endTime)}</span>
                    </div>
                  )}
                  {selectedCall.duration && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="text-black">{formatDuration(selectedCall.duration)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-black mb-2">Call Analysis</h4>
                <div className="space-y-2 text-sm">
                  {selectedCall.sentiment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sentiment:</span>
                      <span className={cn('font-medium', getSentimentColor(selectedCall.sentiment))}>
                        {selectedCall.sentiment}
                      </span>
                    </div>
                  )}
                  {selectedCall.escalated && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Escalated:</span>
                      <span className="text-red-600 font-medium">Yes</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Call Type:</span>
                    <span className="text-black">
                      {selectedCall.callSid?.startsWith('mock-') ? 'Mock Call' : 'Live Call'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript */}
            {selectedCall.transcript && (
              <div>
                <h4 className="text-sm font-medium text-black mb-2">Transcript</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm text-black whitespace-pre-wrap">{selectedCall.transcript}</p>
                </div>
              </div>
            )}

            {/* AI Insights */}
            {selectedCall.aiInsights && (
              <div>
                <h4 className="text-sm font-medium text-black mb-2">AI Insights</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-black">{selectedCall.aiInsights}</p>
                </div>
              </div>
            )}

            {/* Mock Call Notice */}
            {selectedCall.callSid?.startsWith('mock-') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Mock Call</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>This is a simulated call for testing purposes. No actual phone call was placed. To make real calls, configure Twilio credentials and use an HTTPS webhook URL.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCallDetailsModalOpen(false);
                  setSelectedCall(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Call Controls Popup */}
      {activeCallForControls && (
        <CallControlsPopup
          call={activeCallForControls}
          isVisible={showCallControls}
          onClose={handleCloseCallControls}
          onEndCall={handleEndCallFromControls}
          onHandoffToHuman={handleHandoffFromControls}
        />
      )}
    </DashboardLayout>
  );
}
