import { ThemeConfig } from 'antd';

// VoxAssist Ant Design Theme Configuration
// Matches the existing Tailwind CSS design system
export const voxAssistTheme: ThemeConfig = {
  token: {
    // Primary colors - matching existing blue theme
    colorPrimary: '#3b82f6', // blue-500
    colorPrimaryHover: '#2563eb', // blue-600
    colorPrimaryActive: '#1d4ed8', // blue-700
    
    // Success colors
    colorSuccess: '#10b981', // emerald-500
    colorSuccessHover: '#059669', // emerald-600
    
    // Warning colors
    colorWarning: '#f59e0b', // amber-500
    colorWarningHover: '#d97706', // amber-600
    
    // Error colors
    colorError: '#ef4444', // red-500
    colorErrorHover: '#dc2626', // red-600
    
    // Info colors
    colorInfo: '#06b6d4', // cyan-500
    colorInfoHover: '#0891b2', // cyan-600
    
    // Background colors
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#fafbfc', // matches --background
    colorBgSpotlight: '#f9fafb', // gray-50
    
    // Text colors
    colorText: '#1e293b', // matches --foreground
    colorTextSecondary: '#64748b', // matches --muted-foreground
    colorTextTertiary: '#94a3b8', // slate-400
    colorTextQuaternary: '#cbd5e1', // slate-300
    
    // Border colors
    colorBorder: '#e2e8f0', // matches --border
    colorBorderSecondary: '#f1f5f9', // slate-100
    
    // Border radius
    borderRadius: 12, // matches --radius (0.75rem = 12px)
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 4,
    
    // Font settings
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,
    
    // Line height
    lineHeight: 1.5,
    lineHeightLG: 1.6,
    lineHeightSM: 1.4,
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,
    
    // Control heights
    controlHeight: 40, // Slightly larger for better touch targets
    controlHeightLG: 48,
    controlHeightSM: 32,
    controlHeightXS: 24,
    
    // Shadows - matching the existing glass morphism style
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    boxShadowTertiary: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
    
    // Z-index
    zIndexBase: 0,
    zIndexPopupBase: 1000,
  },
  
  components: {
    // Button component customization
    Button: {
      borderRadius: 12,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingInline: 16,
      paddingInlineLG: 24,
      paddingInlineSM: 12,
    },
    
    // Input component customization
    Input: {
      borderRadius: 12,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingInline: 12,
      paddingBlock: 8,
    },
    
    // Select component customization
    Select: {
      borderRadius: 12,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },
    
    // Card component customization
    Card: {
      borderRadius: 16,
      paddingLG: 24,
      padding: 20,
      paddingSM: 16,
    },
    
    // Modal component customization
    Modal: {
      borderRadius: 16,
      padding: 24,
      paddingLG: 32,
    },
    
    // Table component customization
    Table: {
      borderRadius: 12,
      padding: 16,
      paddingSM: 12,
      headerBg: '#f8fafc', // slate-50
      headerColor: '#374151', // gray-700
      headerSortActiveBg: '#f1f5f9', // slate-100
      headerSortHoverBg: '#f8fafc', // slate-50
      rowHoverBg: '#f8fafc', // slate-50
    },
    
    // Drawer component customization
    Drawer: {
      borderRadius: 0, // Drawers typically don't have border radius
      padding: 24,
    },
    
    // Tooltip component customization
    Tooltip: {
      borderRadius: 8,
      padding: 8,
      paddingSM: 6,
    },
    
    // Badge component customization
    Badge: {
      borderRadius: 12,
      fontSizeSM: 11,
    },
    
    // Tag component customization
    Tag: {
      borderRadius: 20, // Pill-shaped tags
      fontSizeSM: 12,
    },
    
    // Progress component customization
    Progress: {
      borderRadius: 8,
    },
    
    // Steps component customization
    Steps: {
      borderRadius: 8,
    },
    
    // Timeline component customization
    Timeline: {
      borderRadius: 4,
    },
    
    // Statistic component customization
    Statistic: {
      fontSizeHeading1: 32,
      fontSizeHeading2: 24,
      fontSizeHeading3: 20,
    },
    
    // Breadcrumb component customization
    Breadcrumb: {
      fontSize: 14,
      fontSizeSM: 12,
    },
    
    // Affix component customization
    Affix: {
      zIndexBase: 10,
    },
  },
  
  // Algorithm for theme variants
  algorithm: [], // Using default algorithm, can be extended for dark mode
};

// Dark theme variant (for future use)
export const voxAssistDarkTheme: ThemeConfig = {
  ...voxAssistTheme,
  token: {
    ...voxAssistTheme.token,
    colorBgBase: '#0f172a', // slate-900
    colorBgContainer: '#1e293b', // slate-800
    colorBgElevated: '#334155', // slate-700
    colorBgLayout: '#020617', // slate-950
    colorText: '#f8fafc', // slate-50
    colorTextSecondary: '#cbd5e1', // slate-300
    colorTextTertiary: '#94a3b8', // slate-400
    colorBorder: '#475569', // slate-600
    colorBorderSecondary: '#334155', // slate-700
  },
};

export default voxAssistTheme;
