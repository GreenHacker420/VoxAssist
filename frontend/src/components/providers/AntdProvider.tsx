'use client';

import { ConfigProvider, App } from 'antd';
import { ReactNode } from 'react';
import voxAssistTheme from '@/lib/antd-theme';

interface AntdProviderProps {
  children: ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider
      theme={voxAssistTheme}
      componentSize="middle"
      direction="ltr"
    >
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}
