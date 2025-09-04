'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  PhoneIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
  BellIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Live Calls', href: '/dashboard/calls', icon: PhoneIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Voice Settings', href: '/dashboard/voice', icon: SpeakerWaveIcon },
  { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: DocumentTextIcon },
  { name: 'Team', href: '/dashboard/team', icon: UserGroupIcon },
  { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <SpeakerWaveIcon className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gray-900">VoxAssist</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          <svg
            className={cn('h-4 w-4 transition-transform', collapsed ? 'rotate-180' : '')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Status Indicator */}
      <div className="p-4 border-t border-gray-200">
        <div className={cn(
          'flex items-center space-x-3 px-3 py-2 rounded-lg bg-success-50',
          collapsed && 'justify-center'
        )}>
          <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse" />
          {!collapsed && (
            <span className="text-sm font-medium text-success-700">
              AI Agent Online
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
