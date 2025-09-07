'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Script } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    // Mock data for scripts
    const mockScripts: Script[] = [
      {
        id: 1,
        name: 'Welcome Greeting',
        content: 'Hello! Thank you for calling VoxAssist. My name is Alex, and I\'m here to help you today. How can I assist you?',
        type: 'greeting',
        isActive: true,
        createdAt: '2023-11-15T10:00:00Z',
        updatedAt: '2023-12-01T14:30:00Z',
      },
      {
        id: 2,
        name: 'Price Objection Handler',
        content: 'I understand that price is an important consideration. Let me explain the value you\'ll receive and see if we can find a solution that works for your budget...',
        type: 'objection_handling',
        isActive: true,
        createdAt: '2023-11-20T09:15:00Z',
        updatedAt: '2023-11-25T16:45:00Z',
      },
      {
        id: 3,
        name: 'Closing Script',
        content: 'Based on our conversation, it sounds like our solution would be a great fit for your needs. Would you like to move forward with getting started today?',
        type: 'closing',
        isActive: false,
        createdAt: '2023-11-18T11:30:00Z',
        updatedAt: '2023-11-18T11:30:00Z',
      },
      {
        id: 4,
        name: 'Escalation Protocol',
        content: 'I want to make sure you get the best possible assistance. Let me connect you with one of our senior specialists who can help resolve this for you right away.',
        type: 'escalation',
        isActive: true,
        createdAt: '2023-11-22T13:20:00Z',
        updatedAt: '2023-11-28T10:15:00Z',
      },
    ];
    
    setScripts(mockScripts);
    setIsLoading(false);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'greeting':
        return 'bg-blue-100 text-blue-800';
      case 'objection_handling':
        return 'bg-yellow-100 text-yellow-800';
      case 'closing':
        return 'bg-green-100 text-green-800';
      case 'escalation':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'greeting':
        return 'Greeting';
      case 'objection_handling':
        return 'Objection Handling';
      case 'closing':
        return 'Closing';
      case 'escalation':
        return 'Escalation';
      default:
        return type;
    }
  };

  const filteredScripts = selectedType === 'all' 
    ? scripts 
    : scripts.filter(script => script.type === selectedType);

  const toggleScriptStatus = (scriptId: number) => {
    setScripts(scripts.map(script => 
      script.id === scriptId 
        ? { ...script, isActive: !script.isActive }
        : script
    ));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
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
            <h1 className="text-2xl font-semibold text-gray-900">Scripts & Prompts</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage AI conversation scripts and prompts for different scenarios.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="h-4 w-4 inline mr-2" />
              New Script
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Scripts' },
              { key: 'greeting', label: 'Greetings' },
              { key: 'objection_handling', label: 'Objection Handling' },
              { key: 'closing', label: 'Closing' },
              { key: 'escalation', label: 'Escalation' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={cn(
                  selectedType === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                )}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 rounded-full py-0.5 px-2.5 text-xs font-medium">
                  {tab.key === 'all' ? scripts.length : scripts.filter(s => s.type === tab.key).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Scripts list */}
        <div className="space-y-4">
          {filteredScripts.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scripts</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedType === 'all' 
                  ? 'Get started by creating your first script.' 
                  : `No ${getTypeLabel(selectedType).toLowerCase()} scripts found.`}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  New Script
                </button>
              </div>
            </div>
          ) : (
            filteredScripts.map((script) => (
              <div key={script.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-900 mr-3">{script.name}</h3>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-2',
                          getTypeColor(script.type)
                        )}
                      >
                        {getTypeLabel(script.type)}
                      </span>
                      <div className="flex items-center">
                        {script.isActive ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-400" />
                        )}
                        <span className={cn(
                          'ml-1 text-sm font-medium',
                          script.isActive ? 'text-green-600' : 'text-gray-500'
                        )}>
                          {script.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">{script.content}</p>
                    
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>Created: {formatDate(script.createdAt)}</span>
                      <span>Updated: {formatDate(script.updatedAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleScriptStatus(script.id)}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm font-semibold shadow-sm',
                        script.isActive
                          ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                          : 'bg-green-600 text-white hover:bg-green-500'
                      )}
                    >
                      {script.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
