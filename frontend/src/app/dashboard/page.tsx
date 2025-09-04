'use client'

import { useEffect, useState } from 'react'
import { useSocket } from '@/lib/socket'
import { api } from '@/lib/api'
import { StatsCard } from '@/components/dashboard/stats-card'
import { CallsChart } from '@/components/dashboard/calls-chart'
import { SentimentChart } from '@/components/dashboard/sentiment-chart'
import { LiveCallsList } from '@/components/dashboard/live-calls-list'
import { VoiceWaveform } from '@/components/dashboard/voice-waveform'
import {
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface DashboardData {
  overview: {
    totalCalls: number
    resolvedCalls: number
    escalatedCalls: number
    avgCallDuration: number
    resolutionRate: number
    customerSatisfaction: number
  }
  callVolume: {
    today: number
    yesterday: number
    thisWeek: number
    lastWeek: number
  }
  hourlyDistribution: Array<{ hour: number; calls: number }>
  sentimentAnalysis: {
    positive: number
    neutral: number
    negative: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCalls, setActiveCalls] = useState([])
  const { socket, connected } = useSocket()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on('call-update', handleCallUpdate)
      socket.on('new-call', handleNewCall)
      socket.on('call-ended', handleCallEnded)

      return () => {
        socket.off('call-update')
        socket.off('new-call')
        socket.off('call-ended')
      }
    }
  }, [socket])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard')
      setData(response.data.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCallUpdate = (callData: any) => {
    setActiveCalls(prev => 
      prev.map((call: any) => 
        call.id === callData.id ? { ...call, ...callData } : call
      )
    )
  }

  const handleNewCall = (callData: any) => {
    setActiveCalls(prev => [...prev, callData])
  }

  const handleCallEnded = (callId: string) => {
    setActiveCalls(prev => prev.filter((call: any) => call.id !== callId))
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Calls Today',
      value: data.callVolume.today.toString(),
      change: `+${((data.callVolume.today - data.callVolume.yesterday) / data.callVolume.yesterday * 100).toFixed(1)}%`,
      changeType: data.callVolume.today > data.callVolume.yesterday ? 'positive' : 'negative',
      icon: PhoneIcon,
    },
    {
      title: 'Resolution Rate',
      value: `${data.overview.resolutionRate}%`,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: CheckCircleIcon,
    },
    {
      title: 'Avg Call Duration',
      value: `${Math.floor(data.overview.avgCallDuration / 60)}:${(data.overview.avgCallDuration % 60).toString().padStart(2, '0')}`,
      change: '-0.5%',
      changeType: 'positive' as const,
      icon: ClockIcon,
    },
    {
      title: 'Escalation Rate',
      value: `${((data.overview.escalatedCalls / data.overview.totalCalls) * 100).toFixed(1)}%`,
      change: '-1.2%',
      changeType: 'positive' as const,
      icon: ExclamationTriangleIcon,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Volume (24h)</h3>
          <CallsChart data={data.hourlyDistribution} />
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Analysis</h3>
          <SentimentChart data={data.sentimentAnalysis} />
        </div>
      </div>

      {/* Live Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Live Calls</h3>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-success-500' : 'bg-danger-500'}`} />
                <span className="text-sm text-gray-600">
                  {activeCalls.length} active calls
                </span>
              </div>
            </div>
            <LiveCallsList calls={activeCalls} />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Voice Activity</h3>
          <VoiceWaveform active={activeCalls.length > 0} />
          
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">AI Confidence</span>
              <span className="font-medium text-success-600">92%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Response Time</span>
              <span className="font-medium">1.2s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Voice Quality</span>
              <span className="font-medium text-success-600">Excellent</span>
            </div>
          </div>

          <button className="w-full mt-4 btn-primary">
            Start Test Call
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <PhoneIcon className="h-6 w-6 text-primary-600 mb-2" />
            <h4 className="font-medium text-gray-900">Initiate Call</h4>
            <p className="text-sm text-gray-600">Start a new AI support call</p>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <CheckCircleIcon className="h-6 w-6 text-success-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Reports</h4>
            <p className="text-sm text-gray-600">Access detailed analytics</p>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <ExclamationTriangleIcon className="h-6 w-6 text-warning-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage Escalations</h4>
            <p className="text-sm text-gray-600">Handle escalated calls</p>
          </button>
        </div>
      </div>
    </div>
  )
}
