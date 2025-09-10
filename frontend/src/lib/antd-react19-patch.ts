// React 19 compatibility patch for Ant Design
import '@ant-design/v5-patch-for-react-19';

// Additional configuration to suppress React 19 warnings
if (typeof window !== 'undefined') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Suppress specific Ant Design React 19 compatibility warnings
    if (
      args[0]?.includes?.('antd: compatible') ||
      args[0]?.includes?.('antd v5 support React is 16 ~ 18')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

export {};
