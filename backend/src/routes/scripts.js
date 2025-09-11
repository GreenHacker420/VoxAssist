const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON and text files are allowed'));
    }
  }
});

// All script routes require authentication
router.use(authenticateToken);

/**
 * GET /scripts - Get all scripts for the authenticated user
 */
router.get('/', asyncHandler(async (req, res) => {
  const scripts = await prisma.script.findMany({
    where: {
      organizationId: req.user.organizationId || 1
    },
    orderBy: {
      updatedAt: 'desc'
    },
    include: {
      _count: {
        select: {
          campaigns: true,
          tests: true,
          versions: true
        }
      }
    }
  });

  // Transform data to match frontend expectations
  const transformedScripts = scripts.map(script => ({
    id: script.id,
    name: script.name,
    description: script.description,
    type: script.type,
    content: script.content,
    isActive: script.isActive,
    version: script.version,
    createdAt: script.createdAt,
    updatedAt: script.updatedAt,
    campaignCount: script._count.campaigns,
    callCount: script._count.calls,
    tags: script.tags || [],
    category: script.category
  }));

  res.json({ success: true, data: transformedScripts });
}));

/**
 * GET /scripts/:scriptId - Get a specific script by ID
 */
router.get('/:scriptId', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  
  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 10
      },
      campaigns: {
        select: { id: true, name: true }
      }
    }
  });

  if (!script) {
    return res.status(404).json({ 
      success: false, 
      error: 'Script not found' 
    });
  }

  res.json({ success: true, data: script });
}));

/**
 * POST /scripts - Create a new script
 */
router.post('/', validate('createScript'), asyncHandler(async (req, res) => {
  const { name, description, type, content, category, tags } = req.body;
  
  const cleanName = sanitizeInput.cleanString(name);
  const cleanDescription = description ? sanitizeInput.cleanString(description) : null;
  const cleanContent = sanitizeInput.cleanString(content);
  
  const script = await prisma.script.create({
    data: {
      name: cleanName,
      description: cleanDescription,
      type: type || 'conversation',
      content: cleanContent,
      category: category || 'general',
      tags: tags || [],
      isActive: false,
      version: 1,
      organizationId: req.user.organizationId || 1,
      createdBy: req.user.userId
    }
  });

  // Create initial version
  await prisma.scriptVersion.create({
    data: {
      scriptId: script.id,
      version: 1,
      content: cleanContent,
      createdBy: req.user.userId,
      isActive: false
    }
  });

  logger.info(`Script created: ${script.id} by user ${req.user.userId}`);
  
  res.status(201).json({ success: true, data: script });
}));

/**
 * PUT /scripts/:scriptId - Update an existing script
 */
router.put('/:scriptId', validate('updateScript'), asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  const { name, description, type, content, category, tags } = req.body;
  
  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!script) {
    return res.status(404).json({ 
      success: false, 
      error: 'Script not found' 
    });
  }

  const updateData = {};
  if (name) updateData.name = sanitizeInput.cleanString(name);
  if (description !== undefined) updateData.description = description ? sanitizeInput.cleanString(description) : null;
  if (type) updateData.type = type;
  if (category) updateData.category = category;
  if (tags) updateData.tags = tags;
  if (content && content !== script.content) {
    updateData.content = sanitizeInput.cleanString(content);
    updateData.version = script.version + 1;
  }
  updateData.updatedAt = new Date();

  const updatedScript = await prisma.script.update({
    where: { id: parseInt(scriptId) },
    data: updateData
  });

  // Create new version if content changed
  if (content && content !== script.content) {
    await prisma.scriptVersion.create({
      data: {
        scriptId: script.id,
        version: updatedScript.version,
        content: sanitizeInput.cleanString(content),
        createdBy: req.user.userId,
        isActive: script.isActive
      }
    });
  }

  logger.info(`Script updated: ${scriptId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedScript });
}));

/**
 * DELETE /scripts/:scriptId - Delete a script
 */
router.delete('/:scriptId', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  
  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    },
    include: {
      campaigns: true
    }
  });

  if (!script) {
    return res.status(404).json({ 
      success: false, 
      error: 'Script not found' 
    });
  }

  // Check if script is being used by active campaigns
  const activeCampaigns = script.campaigns.filter(campaign => campaign.status === 'active');
  if (activeCampaigns.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete script that is being used by active campaigns'
    });
  }

  // Delete script versions first
  await prisma.scriptVersion.deleteMany({
    where: { scriptId: parseInt(scriptId) }
  });

  // Delete the script
  await prisma.script.delete({
    where: { id: parseInt(scriptId) }
  });

  logger.info(`Script deleted: ${scriptId} by user ${req.user.userId}`);
  
  res.json({ success: true, message: 'Script deleted successfully' });
}));

/**
 * POST /scripts/:scriptId/activate - Activate a script
 */
router.post('/:scriptId/activate', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  
  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!script) {
    return res.status(404).json({ 
      success: false, 
      error: 'Script not found' 
    });
  }

  const updatedScript = await prisma.script.update({
    where: { id: parseInt(scriptId) },
    data: {
      isActive: true,
      activatedAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Update current version to active
  await prisma.scriptVersion.updateMany({
    where: { 
      scriptId: parseInt(scriptId),
      version: script.version
    },
    data: { isActive: true }
  });

  logger.info(`Script activated: ${scriptId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedScript });
}));

/**
 * POST /scripts/:scriptId/deactivate - Deactivate a script
 */
router.post('/:scriptId/deactivate', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  
  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!script) {
    return res.status(404).json({ 
      success: false, 
      error: 'Script not found' 
    });
  }

  const updatedScript = await prisma.script.update({
    where: { id: parseInt(scriptId) },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Update all versions to inactive
  await prisma.scriptVersion.updateMany({
    where: { scriptId: parseInt(scriptId) },
    data: { isActive: false }
  });

  logger.info(`Script deactivated: ${scriptId} by user ${req.user.userId}`);
  
  res.json({ success: true, data: updatedScript });
}));

/**
 * POST /scripts/:scriptId/clone - Clone a script
 */
router.post('/:scriptId/clone', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Script name is required'
    });
  }

  const originalScript = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!originalScript) {
    return res.status(404).json({
      success: false,
      error: 'Script not found'
    });
  }

  // Create cloned script
  const clonedScript = await prisma.script.create({
    data: {
      name: sanitizeInput.cleanString(name),
      description: originalScript.description,
      type: originalScript.type,
      content: originalScript.content,
      category: originalScript.category,
      tags: originalScript.tags,
      isActive: false,
      version: 1,
      organizationId: req.user.organizationId || 1,
      createdBy: req.user.userId
    }
  });

  // Create initial version for cloned script
  await prisma.scriptVersion.create({
    data: {
      scriptId: clonedScript.id,
      version: 1,
      content: originalScript.content,
      createdBy: req.user.userId,
      isActive: false
    }
  });

  logger.info(`Script cloned: ${scriptId} -> ${clonedScript.id} by user ${req.user.userId}`);

  res.json({ success: true, data: clonedScript });
}));

/**
 * POST /scripts/:scriptId/test - Test a script with sample input
 */
router.post('/:scriptId/test', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({
      success: false,
      error: 'Test input is required'
    });
  }

  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!script) {
    return res.status(404).json({
      success: false,
      error: 'Script not found'
    });
  }

  // Mock script testing - in production, this would use AI service
  const startTime = Date.now();

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  const processingTime = Date.now() - startTime;

  // Generate mock response based on script content and input
  const response = `Based on your input "${input}" and the script "${script.name}", here's a test response: Thank you for your inquiry. Our AI assistant has processed your request using the configured script.`;

  const testResult = {
    response,
    confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
    processingTime
  };

  // Log test execution
  await prisma.scriptTest.create({
    data: {
      scriptId: parseInt(scriptId),
      input: sanitizeInput.cleanString(input),
      response,
      confidence: testResult.confidence,
      processingTime,
      testedBy: req.user.userId
    }
  }).catch(() => {
    // Ignore if table doesn't exist
  });

  res.json({ success: true, data: testResult });
}));

/**
 * GET /scripts/:scriptId/analytics - Get script performance analytics
 */
router.get('/:scriptId/analytics', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  const { startDate, endDate } = req.query;

  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!script) {
    return res.status(404).json({
      success: false,
      error: 'Script not found'
    });
  }

  // Mock analytics data - in production, this would come from actual usage data
  const analytics = {
    totalUsage: Math.floor(Math.random() * 1000) + 100,
    successRate: Math.random() * 20 + 80, // 80-100%
    averageConfidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
    averageResponseTime: Math.random() * 1000 + 500, // 500-1500ms
    usageByDay: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 10
    })),
    sentimentDistribution: [
      { sentiment: 'positive', count: Math.floor(Math.random() * 100) + 50 },
      { sentiment: 'neutral', count: Math.floor(Math.random() * 50) + 20 },
      { sentiment: 'negative', count: Math.floor(Math.random() * 20) + 5 }
    ]
  };

  res.json({ success: true, data: analytics });
}));

/**
 * GET /scripts/:scriptId/versions - Get script versions/history
 */
router.get('/:scriptId/versions', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;

  const script = await prisma.script.findFirst({
    where: {
      id: parseInt(scriptId),
      organizationId: req.user.organizationId || 1
    }
  });

  if (!script) {
    return res.status(404).json({
      success: false,
      error: 'Script not found'
    });
  }

  const versions = await prisma.scriptVersion.findMany({
    where: { scriptId: parseInt(scriptId) },
    orderBy: { version: 'desc' },
    include: {
      createdByUser: {
        select: { name: true, email: true }
      }
    }
  });

  const transformedVersions = versions.map(version => ({
    id: version.id,
    version: version.version,
    content: version.content,
    createdAt: version.createdAt,
    createdBy: version.createdByUser?.name || 'Unknown',
    isActive: version.isActive
  }));

  res.json({ success: true, data: transformedVersions });
}));

/**
 * POST /scripts/:scriptId/revert - Revert to a specific script version
 */
router.post('/:scriptId/revert', asyncHandler(async (req, res) => {
  const { scriptId } = req.params;
  const { versionId } = req.body;

  if (!versionId) {
    return res.status(400).json({
      success: false,
      error: 'Version ID is required'
    });
  }

  const [script, version] = await Promise.all([
    prisma.script.findFirst({
      where: {
        id: parseInt(scriptId),
        organizationId: req.user.organizationId || 1
      }
    }),
    prisma.scriptVersion.findFirst({
      where: {
        id: parseInt(versionId),
        scriptId: parseInt(scriptId)
      }
    })
  ]);

  if (!script) {
    return res.status(404).json({
      success: false,
      error: 'Script not found'
    });
  }

  if (!version) {
    return res.status(404).json({
      success: false,
      error: 'Version not found'
    });
  }

  // Update script with version content and increment version number
  const updatedScript = await prisma.script.update({
    where: { id: parseInt(scriptId) },
    data: {
      content: version.content,
      version: script.version + 1,
      updatedAt: new Date()
    }
  });

  // Create new version entry for the revert
  await prisma.scriptVersion.create({
    data: {
      scriptId: parseInt(scriptId),
      version: updatedScript.version,
      content: version.content,
      createdBy: req.user.userId,
      isActive: script.isActive,
      revertedFrom: version.version
    }
  });

  logger.info(`Script reverted: ${scriptId} to version ${version.version} by user ${req.user.userId}`);

  res.json({ success: true, data: updatedScript });
}));

module.exports = router;
