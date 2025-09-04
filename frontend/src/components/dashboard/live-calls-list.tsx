'use client'

import { formatDuration, formatPhoneNumber, getSentimentColor, getStatusColor } from '@/lib/utils'
import { PhoneIcon, UserIcon } from '@heroicons/react/24/outline'

interface Call {
  id: string
  customerPhone: string
  status: 'active' | 'ringing' | 'completed' | 'escalated'
  duration: number
  sentiment?: 'positive' | 'negative' | 'neutral'
  confidence?: number
  currentTopic?: string
}

interface LiveCallsListProps {
  calls: Call[]
}

export function LiveCallsList({ calls }: LiveCallsListProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-8">
        <PhoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No active calls</p>
        <p className="text-sm text-gray-400 mt-1">Calls will appear here when they start</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {calls.map((call) => (
        <div key={call.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {formatPhoneNumber(call.customerPhone)}
                </p>
                <p className="text-sm text-gray-500">
                  Duration: {formatDuration(call.duration)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                {call.status}
              </span>
              {call.sentiment && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(call.sentiment)}`}>
                  {call.sentiment}
                </span>
              )}
            </div>
          </div>
          
          {call.currentTopic && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              <span className="font-medium text-gray-700">Current topic: </span>
              <span className="text-gray-600">{call.currentTopic}</span>
            </div>
          )}
          
          {call.confidence && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">AI Confidence</span>
                <span className="font-medium">{call.confidence}%</span>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${call.confidence}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="mt-3 flex space-x-2">
            <button className="btn-secondary text-xs px-3 py-1">
              Monitor
            </button>
            <button className="btn-danger text-xs px-3 py-1">
              Escalate
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
