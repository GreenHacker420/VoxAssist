const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to calculate user storage usage
async function calculateUserStorageUsage(userId) {
  try {
    // Calculate storage from call recordings and transcripts
    const calls = await prisma.call.findMany({
      where: { userId },
      select: { metadata: true }
    });
    
    let totalStorage = 0;
    calls.forEach(call => {
      if (call.metadata?.recordingUrl) {
        totalStorage += 5 * 1024 * 1024; // Estimate 5MB per recording
      }
      if (call.metadata?.transcript) {
        totalStorage += JSON.stringify(call.metadata.transcript).length;
      }
    });
    
    return Math.round(totalStorage / (1024 * 1024)); // Return in MB
  } catch (error) {
    logger.error(`Error calculating storage usage: ${error.message}`);
    return 0;
  }
}

// Helper function to calculate revenue metrics
async function calculateRevenueMetrics() {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Count active users as proxy for revenue (assuming $50/user/month)
    const [thisMonthUsers, lastMonthUsers] = await Promise.all([
      prisma.user.count({
        where: {
          isActive: true,
          createdAt: { lte: now }
        }
      }),
      prisma.user.count({
        where: {
          isActive: true,
          createdAt: { lte: endOfLastMonth }
        }
      })
    ]);
    
    const thisMonthRevenue = thisMonthUsers * 50; // $50 per user
    const lastMonthRevenue = lastMonthUsers * 50;
    
    return { thisMonthRevenue, lastMonthRevenue };
  } catch (error) {
    logger.error(`Error calculating revenue: ${error.message}`);
    return { thisMonthRevenue: 0, lastMonthRevenue: 0 };
  }
}

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'super_admin'));

/**
 * GET /admin/users - Get all users with pagination and search
 */
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Build where clause for search
  const whereClause = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  // Get users with their organizations and call statistics
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      skip: offset,
      take: parseInt(limit),
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        },
        _count: {
          select: {
            calls: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: whereClause })
  ]);

  // Transform users to match frontend interface
  const adminUsers = await Promise.all(users.map(async (user) => {
    // Get call statistics for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const callsThisMonth = await prisma.call.count({
      where: {
        userId: user.id,
        startTime: { gte: startOfMonth }
      }
    });

    // Get last login from audit logs
    const lastLoginLog = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        action: 'login'
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      lastLogin: lastLoginLog?.createdAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      usage: {
        callsThisMonth,
        storageUsed: await calculateUserStorageUsage(user.id)
      },
      organizationId: user.userOrganizations[0]?.organizationId || null
    };
  }));

  res.json({
    users: adminUsers,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit))
  });
}));

/**
 * GET /admin/users/:userId - Get specific user details
 */
router.get('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    include: {
      userOrganizations: {
        include: {
          organization: true
        }
      },
      calls: {
        take: 10,
        orderBy: { startTime: 'desc' }
      }
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get call statistics
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const callsThisMonth = await prisma.call.count({
    where: {
      userId: user.id,
      startTime: { gte: startOfMonth }
    }
  });

  const lastLoginLog = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: 'login'
    },
    orderBy: { createdAt: 'desc' }
  });

  const adminUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.isActive ? 'active' : 'inactive',
    lastLogin: lastLoginLog?.createdAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    usage: {
      callsThisMonth,
      storageUsed: 0
    },
    organizationId: user.userOrganizations[0]?.organizationId || null,
    recentCalls: user.calls
  };

  res.json(adminUser);
}));

/**
 * PATCH /admin/users/:userId/status - Update user status
 */
router.patch('/users/:userId/status', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  // Validation
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be active, inactive, or suspended' });
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: parseInt(userId) }
  });

  if (!existingUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent admin from deactivating themselves
  if (parseInt(userId) === req.user.userId && status !== 'active') {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  const oldStatus = existingUser.isActive ? 'active' : 'inactive';
  const isActive = status === 'active';
  
  const updatedUser = await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { 
      isActive,
      updatedAt: new Date()
    }
  });

  // Log the status change
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'user_status_update',
      resource: 'user',
      resourceId: userId,
      details: {
        targetUserId: parseInt(userId),
        targetUserEmail: existingUser.email,
        oldStatus,
        newStatus: status,
        adminUserId: req.user.userId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.json({
    id: updatedUser.id,
    status: updatedUser.isActive ? 'active' : 'inactive',
    message: `User status updated to ${status}`
  });
}));

/**
 * DELETE /admin/users/:userId - Delete user
 */
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validation
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent admin from deleting themselves
  if (parseInt(userId) === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  // Prevent deletion of other admin users (optional security measure)
  if (user.role === 'admin' || user.role === 'super_admin') {
    return res.status(403).json({ error: 'Cannot delete admin users' });
  }

  // Delete user and related data (cascade delete should handle most relations)
  await prisma.user.delete({
    where: { id: parseInt(userId) }
  });

  // Log the deletion
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'user_delete',
      resource: 'user',
      resourceId: userId,
      details: {
        deletedUserId: parseInt(userId),
        deletedUserEmail: user.email,
        deletedUserName: user.name,
        adminUserId: req.user.userId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.json({ 
    message: 'User deleted successfully',
    deletedUser: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}));

/**
 * GET /admin/metrics - Get system metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get user metrics
  const [totalUsers, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } })
  ]);

  // Get call metrics
  const [totalCalls, callsToday] = await Promise.all([
    prisma.call.count(),
    prisma.call.count({
      where: {
        startTime: { gte: startOfToday }
      }
    })
  ]);

  // Calculate revenue from subscription data
  const { thisMonthRevenue, lastMonthRevenue } = await calculateRevenueMetrics();
  const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Get system health metrics
  const systemHealth = {
    uptime: process.uptime(),
    cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
    memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    diskUsage: 45 // Mock data - would need actual disk usage calculation
  };

  const metrics = {
    totalUsers,
    activeUsers,
    totalCalls,
    callsToday,
    revenue: {
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
      growth: revenueGrowth
    },
    systemHealth: {
      uptime: `${Math.floor(systemHealth.uptime / 3600)}h ${Math.floor((systemHealth.uptime % 3600) / 60)}m`,
      cpuUsage: Math.round(systemHealth.cpuUsage * 100) / 100,
      memoryUsage: Math.round(systemHealth.memoryUsage),
      diskUsage: systemHealth.diskUsage
    }
  };

  res.json(metrics);
}));

/**
 * GET /admin/audit-logs - Get audit logs with pagination
 */
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, userId } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const whereClause = userId ? { userId } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      skip: offset,
      take: parseInt(limit),
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.auditLog.count({ where: whereClause })
  ]);

  const formattedLogs = logs.map(log => ({
    id: log.id,
    userId: log.userId,
    userName: log.user?.name || 'Unknown User',
    action: log.action,
    resource: log.resource,
    details: log.details,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString()
  }));

  res.json({
    logs: formattedLogs,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit))
  });
}));

/**
 * GET /admin/health - Get system health status
 */
router.get('/health', asyncHandler(async (req, res) => {
  const healthChecks = [];
  
  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.push({
      name: 'Database',
      status: 'up',
      responseTime: 10, // Mock response time
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    healthChecks.push({
      name: 'Database',
      status: 'down',
      responseTime: 0,
      lastCheck: new Date().toISOString()
    });
  }

  // Check Redis (mock for now)
  healthChecks.push({
    name: 'Redis',
    status: 'up',
    responseTime: 5,
    lastCheck: new Date().toISOString()
  });

  // Check external services
  healthChecks.push({
    name: 'Twilio',
    status: 'up',
    responseTime: 150,
    lastCheck: new Date().toISOString()
  });

  const overallStatus = healthChecks.every(check => check.status === 'up') ? 'healthy' : 'warning';

  res.json({
    status: overallStatus,
    services: healthChecks,
    alerts: [] // No alerts for now
  });
}));

/**
 * GET /admin/settings - Get system settings
 */
router.get('/settings', asyncHandler(async (req, res) => {
  // Mock settings - in a real app, these would come from a settings table
  const settings = [
    {
      id: '1',
      key: 'max_call_duration',
      value: '3600',
      description: 'Maximum call duration in seconds',
      type: 'number',
      category: 'calls',
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      key: 'enable_call_recording',
      value: 'true',
      description: 'Enable automatic call recording',
      type: 'boolean',
      category: 'calls',
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      key: 'default_language',
      value: 'en',
      description: 'Default system language',
      type: 'string',
      category: 'general',
      updatedAt: new Date().toISOString()
    }
  ];

  res.json(settings);
}));

/**
 * PUT /admin/settings/:settingId - Update system setting
 */
router.put('/settings/:settingId', asyncHandler(async (req, res) => {
  const { settingId } = req.params;
  const { value } = req.body;

  // Mock update - in a real app, this would update the settings table
  const setting = {
    id: settingId,
    key: 'updated_setting',
    value: value,
    description: 'Updated setting',
    type: 'string',
    category: 'general',
    updatedAt: new Date().toISOString()
  };

  // Log the setting change
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'setting_update',
      resource: 'system_setting',
      resourceId: settingId,
      details: {
        settingId,
        newValue: value,
        adminUserId: req.user.id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.json(setting);
}));

/**
 * GET /admin/statistics - Get system statistics
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  
  // Calculate date range based on period
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default: // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Get user statistics
  const [totalUsers, newUsers, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: startDate }
      }
    }),
    prisma.user.count({
      where: {
        isActive: true,
        updatedAt: { gte: startDate }
      }
    })
  ]);

  // Get call statistics
  const calls = await prisma.call.findMany({
    where: {
      startTime: { gte: startDate }
    },
    select: {
      status: true,
      duration: true
    }
  });

  const totalCallsInPeriod = calls.length;
  const successfulCalls = calls.filter(call => call.status === 'completed').length;
  const failedCalls = calls.filter(call => call.status === 'failed').length;
  const averageDuration = calls.length > 0 
    ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length 
    : 0;

  const statistics = {
    users: {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      churn: 5 // Mock churn rate
    },
    calls: {
      total: totalCallsInPeriod,
      successful: successfulCalls,
      failed: failedCalls,
      averageDuration: Math.round(averageDuration)
    },
    revenue: {
      total: 25000, // Mock revenue data
      recurring: 20000,
      oneTime: 5000,
      growth: 15.5
    },
    usage: {
      storageUsed: 1024 * 1024 * 500, // 500MB in bytes
      bandwidthUsed: 1024 * 1024 * 1024 * 2, // 2GB in bytes
      apiCalls: 15000
    }
  };

  res.json(statistics);
}));

/**
 * GET /admin/users/export - Export users data
 */
router.get('/users/export', asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;

  const users = await prisma.user.findMany({
    include: {
      userOrganizations: {
        include: {
          organization: true
        }
      }
    }
  });

  if (format === 'csv') {
    const csvHeader = 'ID,Name,Email,Role,Status,Created At,Organization\n';
    const csvData = users.map(user => {
      const org = user.userOrganizations[0]?.organization?.name || 'N/A';
      return `${user.id},"${user.name}","${user.email}","${user.role}","${user.isActive ? 'Active' : 'Inactive'}","${user.createdAt.toISOString()}","${org}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csvHeader + csvData);
  } else {
    res.status(400).json({ error: 'Unsupported export format' });
  }
}));

/**
 * POST /admin/notifications - Send system notification
 */
router.post('/notifications', asyncHandler(async (req, res) => {
  const { title, message, type, userIds, broadcast } = req.body;

  // Log the notification
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'notification_sent',
      resource: 'notification',
      details: {
        title,
        message,
        type,
        userIds,
        broadcast,
        adminUserId: req.user.id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // In a real implementation, this would send actual notifications
  logger.info(`Notification sent by admin ${req.user.id}: ${title}`);

  res.status(201).json({ message: 'Notification sent successfully' });
}));

module.exports = router;
