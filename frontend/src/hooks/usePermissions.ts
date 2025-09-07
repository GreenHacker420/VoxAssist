'use client';

import { useAuth } from '@/contexts/AuthContext';

export type Permission = 
  | 'admin.users.read'
  | 'admin.users.write'
  | 'admin.users.delete'
  | 'admin.system.read'
  | 'admin.system.write'
  | 'admin.analytics.read'
  | 'admin.settings.read'
  | 'admin.settings.write'
  | 'calls.read'
  | 'calls.write'
  | 'calls.delete'
  | 'campaigns.read'
  | 'campaigns.write'
  | 'campaigns.delete'
  | 'contacts.read'
  | 'contacts.write'
  | 'contacts.delete'
  | 'scripts.read'
  | 'scripts.write'
  | 'scripts.delete'
  | 'billing.read'
  | 'billing.write'
  | 'webhooks.read'
  | 'webhooks.write'
  | 'webhooks.delete';

export type Role = 'admin' | 'user' | 'manager' | 'viewer';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'admin.users.read',
    'admin.users.write',
    'admin.users.delete',
    'admin.system.read',
    'admin.system.write',
    'admin.analytics.read',
    'admin.settings.read',
    'admin.settings.write',
    'calls.read',
    'calls.write',
    'calls.delete',
    'campaigns.read',
    'campaigns.write',
    'campaigns.delete',
    'contacts.read',
    'contacts.write',
    'contacts.delete',
    'scripts.read',
    'scripts.write',
    'scripts.delete',
    'billing.read',
    'billing.write',
    'webhooks.read',
    'webhooks.write',
    'webhooks.delete',
  ],
  manager: [
    'calls.read',
    'calls.write',
    'campaigns.read',
    'campaigns.write',
    'campaigns.delete',
    'contacts.read',
    'contacts.write',
    'contacts.delete',
    'scripts.read',
    'scripts.write',
    'scripts.delete',
    'billing.read',
    'webhooks.read',
    'webhooks.write',
  ],
  user: [
    'calls.read',
    'calls.write',
    'campaigns.read',
    'campaigns.write',
    'contacts.read',
    'contacts.write',
    'scripts.read',
    'scripts.write',
    'billing.read',
    'webhooks.read',
  ],
  viewer: [
    'calls.read',
    'campaigns.read',
    'contacts.read',
    'scripts.read',
    'billing.read',
  ],
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !user.role) return false;
    
    const userRole = user.role as Role;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return rolePermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isManager = (): boolean => {
    return hasRole('manager') || hasRole('admin');
  };

  const canAccessAdmin = (): boolean => {
    return hasAnyPermission([
      'admin.users.read',
      'admin.system.read',
      'admin.analytics.read',
      'admin.settings.read',
    ]);
  };

  const getUserPermissions = (): Permission[] => {
    if (!user || !user.role) return [];
    
    const userRole = user.role as Role;
    return ROLE_PERMISSIONS[userRole] || [];
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    isManager,
    canAccessAdmin,
    getUserPermissions,
    userRole: user?.role as Role,
  };
}
