const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

// All campaign routes require authentication
router.use(authenticateToken);

/**
 * GET /campaigns - Get all campaigns for the authenticated user
 */
router.get('/', asyncHandler(async (req, res) => {
  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId: req.user.organizationId || 1
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      _count: {
        select: {
          contacts: true,
          calls: true
        }
      }
    }
  });

  // Transform data to match frontend expectations
  const transformedCampaigns = campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    type: campaign.type,
    script: campaign.script,
    scheduledStart: campaign.scheduledStart,
    scheduledEnd: campaign.scheduledEnd,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    contactCount: campaign._count.contacts,
    callCount: campaign._count.calls,
    settings: campaign.settings || {},
    progress: campaign.progress || 0,
    successRate: campaign.successRate || 0
  }));

  res.json({ success: true, data: transformedCampaigns });
}));

/**
 * GET /campaigns/:campaignId - Get a specific campaign by ID
 */
router.get('/:campaignId', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    },
    include: {
      contacts: true,
      calls: {
        orderBy: { startTime: 'desc' },
        take: 10
      },
      _count: {
        select: {
          contacts: true,
          calls: true
        }
      }
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  res.json({ success: true, data: campaign });
}));

/**
 * POST /campaigns - Create a new campaign
 */
router.post('/', validate('createCampaign'), asyncHandler(async (req, res) => {
  const { name, description, type, script, scheduledStart, scheduledEnd, settings } = req.body;
  
  const cleanName = sanitizeInput.cleanString(name);
  const cleanDescription = description ? sanitizeInput.cleanString(description) : null;
  
  const campaign = await prisma.campaign.create({
    data: {
      name: cleanName,
      description: cleanDescription,
      type: type || 'outbound',
      script: script || '',
      status: 'draft',
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      settings: settings || {},
      organizationId: req.user.organizationId || 1,
      createdBy: req.user.userId
    }
  });

  logger.info(`Campaign created: ${campaign.id} by user ${req.user.userId}`);
  
  res.status(201).json({ success: true, data: campaign });
}));

/**
 * PUT /campaigns/:campaignId - Update an existing campaign
 */
router.put('/:campaignId', validate('updateCampaign'), asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { name, description, type, script, scheduledStart, scheduledEnd, settings } = req.body;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  const updateData = {};
  if (name) updateData.name = sanitizeInput.cleanString(name);
  if (description !== undefined) updateData.description = description ? sanitizeInput.cleanString(description) : null;
  if (type) updateData.type = type;
  if (script !== undefined) updateData.script = script;
  if (scheduledStart) updateData.scheduledStart = new Date(scheduledStart);
  if (scheduledEnd) updateData.scheduledEnd = new Date(scheduledEnd);
  if (settings) updateData.settings = settings;
  updateData.updatedAt = new Date();

  const updatedCampaign = await prisma.campaign.update({
    where: { id: parseInt(campaignId) },
    data: updateData
  });

  logger.info(`Campaign updated: ${campaignId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedCampaign });
}));

/**
 * DELETE /campaigns/:campaignId - Delete a campaign
 */
router.delete('/:campaignId', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  // Check if campaign can be deleted (not active)
  if (campaign.status === 'active') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete active campaign. Please stop it first.'
    });
  }

  await prisma.campaign.delete({
    where: { id: parseInt(campaignId) }
  });

  logger.info(`Campaign deleted: ${campaignId} by user ${req.user.userId}`);
  
  res.json({ success: true, message: 'Campaign deleted successfully' });
}));

/**
 * POST /campaigns/:campaignId/start - Start a campaign
 */
router.post('/:campaignId/start', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  if (campaign.status !== 'draft' && campaign.status !== 'paused') {
    return res.status(400).json({
      success: false,
      error: 'Campaign cannot be started from current status'
    });
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: parseInt(campaignId) },
    data: {
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date()
    }
  });

  logger.info(`Campaign started: ${campaignId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedCampaign });
}));

/**
 * POST /campaigns/:campaignId/pause - Pause a campaign
 */
router.post('/:campaignId/pause', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  if (campaign.status !== 'active') {
    return res.status(400).json({
      success: false,
      error: 'Only active campaigns can be paused'
    });
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: parseInt(campaignId) },
    data: {
      status: 'paused',
      pausedAt: new Date(),
      updatedAt: new Date()
    }
  });

  logger.info(`Campaign paused: ${campaignId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedCampaign });
}));

/**
 * POST /campaigns/:campaignId/resume - Resume a paused campaign
 */
router.post('/:campaignId/resume', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  if (campaign.status !== 'paused') {
    return res.status(400).json({
      success: false,
      error: 'Only paused campaigns can be resumed'
    });
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: parseInt(campaignId) },
    data: {
      status: 'active',
      resumedAt: new Date(),
      updatedAt: new Date()
    }
  });

  logger.info(`Campaign resumed: ${campaignId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedCampaign });
}));

/**
 * POST /campaigns/:campaignId/stop - Stop a campaign
 */
router.post('/:campaignId/stop', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({ 
      success: false, 
      error: 'Campaign not found' 
    });
  }

  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    return res.status(400).json({
      success: false,
      error: 'Only active or paused campaigns can be stopped'
    });
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: parseInt(campaignId) },
    data: {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    }
  });

  logger.info(`Campaign stopped: ${campaignId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedCampaign });
}));

/**
 * GET /campaigns/:campaignId/stats - Get campaign statistics
 */
router.get('/:campaignId/stats', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  // Get campaign statistics
  const [totalCalls, completedCalls, successfulCalls, failedCalls] = await Promise.all([
    prisma.call.count({
      where: { campaignId: parseInt(campaignId) }
    }),
    prisma.call.count({
      where: { campaignId: parseInt(campaignId), status: 'completed' }
    }),
    prisma.call.count({
      where: { campaignId: parseInt(campaignId), status: 'completed', metadata: { path: ['successful'], equals: true } }
    }),
    prisma.call.count({
      where: { campaignId: parseInt(campaignId), status: 'failed' }
    })
  ]);

  const avgDuration = await prisma.call.aggregate({
    where: { campaignId: parseInt(campaignId), status: 'completed' },
    _avg: { duration: true }
  });

  const stats = {
    totalCalls,
    completedCalls,
    successfulCalls,
    failedCalls,
    averageCallDuration: Math.round(avgDuration._avg.duration || 0),
    conversionRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0
  };

  res.json({ success: true, data: stats });
}));

/**
 * GET /campaigns/:campaignId/calls - Get campaign calls with pagination
 */
router.get('/:campaignId/calls', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where: { campaignId: parseInt(campaignId) },
      skip,
      take: parseInt(limit),
      orderBy: { startTime: 'desc' },
      include: {
        contact: {
          select: { name: true, email: true, phone: true }
        }
      }
    }),
    prisma.call.count({
      where: { campaignId: parseInt(campaignId) }
    })
  ]);

  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    success: true,
    data: {
      calls,
      total,
      page: parseInt(page),
      totalPages
    }
  });
}));

/**
 * POST /campaigns/:campaignId/contacts - Add contacts to a campaign
 */
router.post('/:campaignId/contacts', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { contactIds } = req.body;

  if (!contactIds || !Array.isArray(contactIds)) {
    return res.status(400).json({
      success: false,
      error: 'contactIds array is required'
    });
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  // Add contacts to campaign
  await prisma.campaignContact.createMany({
    data: contactIds.map(contactId => ({
      campaignId: parseInt(campaignId),
      contactId: parseInt(contactId)
    })),
    skipDuplicates: true
  });

  logger.info(`Added ${contactIds.length} contacts to campaign ${campaignId}`);

  res.json({ success: true, message: 'Contacts added to campaign' });
}));

/**
 * DELETE /campaigns/:campaignId/contacts - Remove contacts from a campaign
 */
router.delete('/:campaignId/contacts', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { contactIds } = req.body;

  if (!contactIds || !Array.isArray(contactIds)) {
    return res.status(400).json({
      success: false,
      error: 'contactIds array is required'
    });
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  // Remove contacts from campaign
  await prisma.campaignContact.deleteMany({
    where: {
      campaignId: parseInt(campaignId),
      contactId: { in: contactIds.map(id => parseInt(id)) }
    }
  });

  logger.info(`Removed ${contactIds.length} contacts from campaign ${campaignId}`);

  res.json({ success: true, message: 'Contacts removed from campaign' });
}));

/**
 * GET /campaigns/:campaignId/contacts - Get campaign contacts
 */
router.get('/:campaignId/contacts', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  const contacts = await prisma.campaignContact.findMany({
    where: { campaignId: parseInt(campaignId) },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true
        }
      }
    }
  });

  const contactData = contacts.map(cc => cc.contact);

  res.json({ success: true, data: contactData });
}));

/**
 * POST /campaigns/:campaignId/clone - Clone a campaign
 */
router.post('/:campaignId/clone', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Campaign name is required'
    });
  }

  const originalCampaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    },
    include: {
      contacts: true
    }
  });

  if (!originalCampaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  // Create cloned campaign
  const clonedCampaign = await prisma.campaign.create({
    data: {
      name: sanitizeInput.cleanString(name),
      description: originalCampaign.description,
      type: originalCampaign.type,
      script: originalCampaign.script,
      status: 'draft',
      settings: originalCampaign.settings,
      organizationId: req.user.organizationId || 1,
      createdBy: req.user.userId
    }
  });

  // Clone contacts if any
  if (originalCampaign.contacts.length > 0) {
    await prisma.campaignContact.createMany({
      data: originalCampaign.contacts.map(contact => ({
        campaignId: clonedCampaign.id,
        contactId: contact.contactId
      }))
    });
  }

  logger.info(`Campaign cloned: ${campaignId} -> ${clonedCampaign.id} by user ${req.user.userId}`);

  res.json({ success: true, data: clonedCampaign });
}));

/**
 * GET /campaigns/:campaignId/export - Export campaign data
 */
router.get('/:campaignId/export', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { format = 'csv' } = req.query;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parseInt(campaignId),
      organizationId: req.user.organizationId || 1
    },
    include: {
      calls: {
        include: {
          contact: {
            select: { name: true, email: true, phone: true }
          }
        }
      }
    }
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found'
    });
  }

  if (format === 'csv') {
    const csvHeaders = ['Call ID', 'Contact Name', 'Phone', 'Status', 'Duration', 'Start Time', 'End Time'];
    const csvRows = [csvHeaders.join(',')];

    campaign.calls.forEach(call => {
      const row = [
        call.id,
        call.contact?.name || 'Unknown',
        call.customerPhone,
        call.status,
        call.duration || 0,
        call.startTime?.toISOString() || '',
        call.endTime?.toISOString() || ''
      ];
      csvRows.push(row.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign-${campaignId}-export.csv`);
    res.send(csvRows.join('\n'));
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=campaign-${campaignId}-export.json`);
    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        createdAt: campaign.createdAt
      },
      calls: campaign.calls,
      exportedAt: new Date().toISOString()
    });
  }
}));

module.exports = router;
