'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Drawer, Typography, Divider } from 'antd';
import {
  HomeOutlined,
  PhoneOutlined,
  TeamOutlined,
  SoundOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  CreditCardOutlined,
  LinkOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const navigation = [
  { key: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: <HomeOutlined /> },
  { key: 'calls', name: 'Calls', href: '/calls', icon: <PhoneOutlined /> },
  { key: 'contacts', name: 'Contacts', href: '/contacts', icon: <TeamOutlined /> },
  { key: 'campaigns', name: 'Campaigns', href: '/campaigns', icon: <SoundOutlined /> },
  { key: 'scripts', name: 'Scripts', href: '/scripts', icon: <FileTextOutlined /> },
  { key: 'widgets', name: 'Widgets', href: '/widgets', icon: <AppstoreOutlined /> },
  { key: 'analytics', name: 'Analytics', href: '/analytics', icon: <BarChartOutlined /> },
  { key: 'billing', name: 'Billing', href: '/billing', icon: <CreditCardOutlined /> },
  { key: 'webhooks', name: 'Webhooks', href: '/webhooks', icon: <LinkOutlined /> },
  { key: 'settings', name: 'Settings', href: '/settings', icon: <SettingOutlined /> },
];


interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Get selected menu key based on current pathname
  const getSelectedKey = () => {
    const currentPath = pathname.split('/')[1] || 'dashboard';
    return currentPath === '' ? 'dashboard' : currentPath;
  };

  // Convert navigation items to Ant Design Menu items
  const menuItems = navigation.map(item => ({
    key: item.key,
    icon: item.icon,
    label: (
      <Link href={item.href} onClick={() => setSidebarOpen(false)}>
        {item.name}
      </Link>
    ),
  }));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 logo-area">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="ml-3 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">VoxAssist</span>
        </div>
      </div>

      <Divider className="my-0" />

      {/* Navigation Menu */}
      <div className="flex-1 px-3 py-4">
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          className="border-none"
        />
      </div>

      <Divider className="my-0" />

      {/* User Info */}
      <div className="user-area">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <Text className="text-sm font-medium text-white">
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </div>
          <div className="ml-3">
            <Text className="text-sm font-medium text-gray-900">{user?.name || 'User'}</Text>
            <Text className="text-xs text-gray-600">{user?.email || 'user@example.com'}</Text>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar - Ant Design Drawer */}
      <Drawer
        title="VoxAssist"
        placement="left"
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        className="lg:hidden"
        width={280}
        styles={{
          body: { padding: 0 },
          header: { borderBottom: '1px solid #f0f0f0' }
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Static sidebar for desktop with glassmorphism */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col glassmorphism-sidebar">
          <SidebarContent />
        </div>
      </div>

      {/* Glassmorphism styles */}
      <style jsx>{`
        .glassmorphism-sidebar {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.4);
          position: relative;
        }

        .glassmorphism-sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 100%
          );
          border-radius: 0;
          pointer-events: none;
        }

        .glassmorphism-sidebar .ant-menu {
          background: transparent !important;
          border: none !important;
        }

        .glassmorphism-sidebar .ant-menu-item {
          background: transparent !important;
          border-radius: 8px !important;
          margin: 2px 0 !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .glassmorphism-sidebar .ant-menu-item:hover {
          background: rgba(59, 130, 246, 0.1) !important;
          backdrop-filter: blur(10px) !important;
          transform: translateX(4px) !important;
        }

        .glassmorphism-sidebar .ant-menu-item-selected {
          background: rgba(59, 130, 246, 0.15) !important;
          border-right: 3px solid #3b82f6 !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
        }

        .glassmorphism-sidebar .ant-menu-item-selected::after {
          display: none !important;
        }

        .glassmorphism-sidebar .ant-divider {
          border-color: rgba(255, 255, 255, 0.2) !important;
          margin: 12px 0 !important;
        }

        /* Enhanced logo area */
        .glassmorphism-sidebar .logo-area {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Enhanced user area */
        .glassmorphism-sidebar .user-area {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px 12px 0 0;
          margin: 8px;
          padding: 16px !important;
        }
      `}</style>
    </>
  );
}
