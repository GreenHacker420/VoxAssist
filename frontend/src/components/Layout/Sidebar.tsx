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

} from '@ant-design/icons';

const { Text } = Typography;

const navigation = [
  { key: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: <HomeOutlined /> },
  { key: 'calls', name: 'Calls', href: '/calls', icon: <PhoneOutlined /> },
  { key: 'contacts', name: 'Contacts', href: '/contacts', icon: <TeamOutlined /> },
  { key: 'campaigns', name: 'Campaigns', href: '/campaigns', icon: <SoundOutlined /> },
  { key: 'scripts', name: 'Scripts', href: '/scripts', icon: <FileTextOutlined /> },
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
      <div className="flex items-center px-6 py-4">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="ml-3 text-xl font-bold text-gray-900">VoxAssist</span>
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
      <div className="p-4">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Text className="text-sm font-medium text-gray-700">
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </div>
          <div className="ml-3">
            <Text className="text-sm font-medium text-gray-900">{user?.name || 'User'}</Text>
            <Text className="text-xs text-gray-500">{user?.email || 'user@example.com'}</Text>
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

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col border-r border-gray-200 bg-white shadow-sm">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
