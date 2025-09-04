'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useSocket } from '@/lib/socket'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import {
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const [notifications] = useState([
    { id: 1, message: 'New call started', time: '2 min ago', unread: true },
    { id: 2, message: 'AI confidence low on call #1234', time: '5 min ago', unread: true },
    { id: 3, message: 'Daily report ready', time: '1 hour ago', unread: false },
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Page title and breadcrumb */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.name}
          </p>
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-success-500' : 'bg-danger-500'
            )} />
            <span className="text-sm text-gray-600">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications */}
          <Menu as="div" className="relative">
            <Menu.Button className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg">
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <Menu.Item key={notification.id}>
                      {({ active }) => (
                        <div className={cn(
                          'px-4 py-3 border-b border-gray-100 last:border-b-0',
                          active && 'bg-gray-50',
                          notification.unread && 'bg-blue-50'
                        )}>
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      )}
                    </Menu.Item>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* User Menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={cn(
                          'flex items-center space-x-2 w-full px-4 py-2 text-sm text-left',
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <UserCircleIcon className="h-4 w-4" />
                        <span>Profile</span>
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={cn(
                          'flex items-center space-x-2 w-full px-4 py-2 text-sm text-left',
                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                    )}
                  </Menu.Item>
                  <div className="border-t border-gray-100" />
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={logout}
                        className={cn(
                          'flex items-center space-x-2 w-full px-4 py-2 text-sm text-left',
                          active ? 'bg-gray-50 text-danger-600' : 'text-danger-600'
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  )
}
