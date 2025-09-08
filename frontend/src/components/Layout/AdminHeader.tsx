'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AdminHeaderProps {
  setSidebarOpen?: (open: boolean) => void;
}

export default function AdminHeader({ setSidebarOpen }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const [notifications] = useState([
    { id: 1, message: 'New user registration', time: '5 min ago', unread: true },
    { id: 2, message: 'System backup completed', time: '1 hour ago', unread: false },
    { id: 3, message: 'High CPU usage detected', time: '2 hours ago', unread: true },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 glass-gray px-4 sm:gap-x-6 sm:px-6 lg:px-8 rounded-b-xl">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen && setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px glass-separator lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-500 focus:ring-0 sm:text-sm bg-transparent"
            placeholder="Search users, logs, settings..."
            type="search"
            name="search"
          />
        </form>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span className="sr-only">View notifications</span>
              <div className="relative">
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
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
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-80 origin-top-right rounded-lg glass-menu py-2 shadow-lg focus:outline-none">
                <div className="px-4 py-2 border-b border-white/30">
                  <h3 className="text-sm font-medium text-slate-900">Notifications</h3>
                </div>
                {notifications.map((notification) => (
                  <Menu.Item key={notification.id}>
                    {({ active }) => (
                      <div
                        className={cn(
                          active ? 'glass-hover' : '',
                          'px-4 py-3 border-b border-white/20 last:border-b-0'
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            'flex-shrink-0 w-2 h-2 rounded-full mt-2',
                            notification.unread ? 'bg-red-500' : 'bg-gray-300'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900">{notification.message}</p>
                            <p className="text-xs text-slate-500">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Menu.Item>
                ))}
                <div className="px-4 py-2 border-t border-white/30">
                  <Link
                    href="/admin/notifications"
                    className="text-sm text-slate-700 hover:text-slate-900"
                  >
                    View all notifications
                  </Link>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px glass-separator" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-white/80 ring-1 ring-white/40 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-900">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-slate-900" aria-hidden="true">
                  {user?.name || 'Admin'}
                </span>
              </span>
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
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-40 origin-top-right rounded-lg glass-menu py-2 shadow-lg focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/dashboard"
                      className={cn(
                        active ? 'glass-hover' : '',
                        'block px-3 py-2 text-sm leading-6 text-slate-900 rounded-md'
                      )}
                    >
                      User Dashboard
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/settings"
                      className={cn(
                        active ? 'glass-hover' : '',
                        'block px-3 py-2 text-sm leading-6 text-slate-900 rounded-md'
                      )}
                    >
                      Profile
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={cn(
                        active ? 'glass-hover' : '',
                        'block w-full text-left px-3 py-2 text-sm leading-6 text-slate-900 rounded-md'
                      )}
                    >
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}
