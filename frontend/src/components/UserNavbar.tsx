'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';

interface UserNavbarProps {
  setSidebarOpen?: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function UserNavbar({ 
  setSidebarOpen, 
  title, 
  subtitle, 
  actions 
}: UserNavbarProps) {
  const { user, logout, isDemoMode, disableDemoMode } = useAuth();

  const userNavigation = [
    { name: 'Your Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
    { name: 'Sign out', href: '#', onClick: logout },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Top navbar */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        {setSidebarOpen && (
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        )}

        {/* Separator */}
        {setSidebarOpen && (
          <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />
        )}

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="relative flex flex-1">
            {/* Demo Mode Indicator */}
            {isDemoMode && (
              <div className="flex items-center">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Demo Mode
                  <button
                    onClick={disableDemoMode}
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Separator */}
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
              <Menu.Button className="-m-1.5 flex items-center p-1.5">
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </span>
                </div>
                <span className="hidden lg:flex lg:items-center">
                  <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                    {user?.name}
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
                <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                  {userNavigation.map((item) => (
                    <Menu.Item key={item.name}>
                      {({ active }) => (
                        <button
                          onClick={item.onClick}
                          className={cn(
                            active ? 'bg-gray-50' : '',
                            'block w-full text-left px-3 py-1 text-sm leading-6 text-gray-900'
                          )}
                        >
                          {item.name}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Page header section */}
      {(title || subtitle || actions) && (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              )}
              {subtitle && (
                <p className="mt-2 text-sm text-gray-700">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="mt-4 sm:mt-0 sm:flex sm:space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
