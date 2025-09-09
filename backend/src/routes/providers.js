const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeUser } = require('../middleware/auth');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All provider routes require authentication
router.use(authenticateToken);
router.use(authorizeUser);

// Encryption helpers for storing sensitive credentials
const encrypt = (text) => {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedText) => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const [ivHex, encrypted] = encryptedText.split(':');
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error(`Decryption error: ${error.message}`);
    return null;
  }
};

/**
 * GET /providers - Get all provider configurations for user's organization
 */
router.get('/', asyncHandler(async (req, res) => {
  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: req.user.userId }
  });

  if (!userOrg) {
    return res.status(404).json({ error: 'User organization not found' });
  }

  const providers = await prisma.providerConfig.findMany({
    where: { organizationId: userOrg.organizationId },
    select: {
      id: true,
      name: true,
      type: true,
      provider: true,
      isActive: true,
      isPrimary: true,
      settings: true,
      webhookUrl: true,
      createdAt: true,
      updatedAt: true
      // Exclude credentials for security
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(providers);
}));

/**
 * POST /providers - Create new provider configuration
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, provider, credentials, settings, webhookUrl } = req.body;

  // Validation
  if (!name || !type || !provider || !credentials) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, type, provider, credentials' 
    });
  }

  const validTypes = ['phone', 'whatsapp'];
  const validProviders = ['twilio', 'plivo', 'vonage', 'bandwidth'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid type. Must be: phone, whatsapp' 
    });
  }

  if (!validProviders.includes(provider)) {
    return res.status(400).json({ 
      error: 'Invalid provider. Must be: twilio, plivo, vonage, bandwidth' 
    });
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: req.user.userId }
  });

  if (!userOrg) {
    return res.status(404).json({ error: 'User organization not found' });
  }

  // Encrypt sensitive credentials
  const encryptedCredentials = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string' && value.length > 0) {
      encryptedCredentials[key] = encrypt(value);
    }
  }

  const providerConfig = await prisma.providerConfig.create({
    data: {
      organizationId: userOrg.organizationId,
      name,
      type,
      provider,
      credentials: encryptedCredentials,
      settings: settings || {},
      webhookUrl,
      isActive: true,
      isPrimary: false
    }
  });

  // Log the creation
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'provider_config_create',
      resource: 'provider_config',
      resourceId: providerConfig.id,
      details: {
        name,
        type,
        provider,
        organizationId: userOrg.organizationId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // Return without credentials
  const { credentials: _, ...safeConfig } = providerConfig;
  res.status(201).json(safeConfig);
}));

/**
 * PUT /providers/:id - Update provider configuration
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, credentials, settings, webhookUrl, isActive } = req.body;

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: req.user.userId }
  });

  if (!userOrg) {
    return res.status(404).json({ error: 'User organization not found' });
  }

  // Check if provider config exists and belongs to user's organization
  const existingConfig = await prisma.providerConfig.findFirst({
    where: { 
      id,
      organizationId: userOrg.organizationId
    }
  });

  if (!existingConfig) {
    return res.status(404).json({ error: 'Provider configuration not found' });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (settings !== undefined) updateData.settings = settings;
  if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;

  // Encrypt new credentials if provided
  if (credentials) {
    const encryptedCredentials = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value.length > 0) {
        encryptedCredentials[key] = encrypt(value);
      }
    }
    updateData.credentials = encryptedCredentials;
  }

  const updatedConfig = await prisma.providerConfig.update({
    where: { id },
    data: updateData
  });

  // Log the update
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'provider_config_update',
      resource: 'provider_config',
      resourceId: id,
      details: {
        updatedFields: Object.keys(updateData),
        organizationId: userOrg.organizationId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  // Return without credentials
  const { credentials: _, ...safeConfig } = updatedConfig;
  res.json(safeConfig);
}));

/**
 * DELETE /providers/:id - Delete provider configuration
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: req.user.userId }
  });

  if (!userOrg) {
    return res.status(404).json({ error: 'User organization not found' });
  }

  const existingConfig = await prisma.providerConfig.findFirst({
    where: { 
      id,
      organizationId: userOrg.organizationId
    }
  });

  if (!existingConfig) {
    return res.status(404).json({ error: 'Provider configuration not found' });
  }

  // Don't allow deletion of primary provider
  if (existingConfig.isPrimary) {
    return res.status(400).json({ 
      error: 'Cannot delete primary provider. Set another provider as primary first.' 
    });
  }

  await prisma.providerConfig.delete({
    where: { id }
  });

  // Log the deletion
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'provider_config_delete',
      resource: 'provider_config',
      resourceId: id,
      details: {
        name: existingConfig.name,
        type: existingConfig.type,
        provider: existingConfig.provider,
        organizationId: userOrg.organizationId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.status(204).send();
}));

/**
 * POST /providers/:id/test - Test provider connection
 */
router.post('/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: req.user.userId }
  });

  if (!userOrg) {
    return res.status(404).json({ error: 'User organization not found' });
  }

  const providerConfig = await prisma.providerConfig.findFirst({
    where: { 
      id,
      organizationId: userOrg.organizationId
    }
  });

  if (!providerConfig) {
    return res.status(404).json({ error: 'Provider configuration not found' });
  }

  // Decrypt credentials for testing
  const decryptedCredentials = {};
  for (const [key, value] of Object.entries(providerConfig.credentials)) {
    decryptedCredentials[key] = decrypt(value);
  }

  // Mock test - in real implementation, this would test actual provider APIs
  let testResult = { success: true, message: 'Connection test successful' };
  
  try {
    // Simulate provider-specific testing logic
    switch (providerConfig.provider) {
      case 'twilio':
        if (!decryptedCredentials.accountSid || !decryptedCredentials.authToken) {
          testResult = { success: false, message: 'Missing Twilio credentials' };
        }
        break;
      case 'plivo':
        if (!decryptedCredentials.authId || !decryptedCredentials.authToken) {
          testResult = { success: false, message: 'Missing Plivo credentials' };
        }
        break;
      case 'vonage':
        if (!decryptedCredentials.apiKey || !decryptedCredentials.apiSecret) {
          testResult = { success: false, message: 'Missing Vonage credentials' };
        }
        break;
      case 'bandwidth':
        if (!decryptedCredentials.userId || !decryptedCredentials.apiToken) {
          testResult = { success: false, message: 'Missing Bandwidth credentials' };
        }
        break;
    }
  } catch (error) {
    testResult = { success: false, message: 'Connection test failed' };
    logger.error(`Provider test error: ${error.message}`);
  }

  // Log the test
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'provider_config_test',
      resource: 'provider_config',
      resourceId: id,
      details: {
        provider: providerConfig.provider,
        testResult: testResult.success,
        organizationId: userOrg.organizationId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.json(testResult);
}));

/**
 * POST /providers/:id/set-primary - Set provider as primary
 */
router.post('/:id/set-primary', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: req.user.userId }
  });

  if (!userOrg) {
    return res.status(404).json({ error: 'User organization not found' });
  }

  const providerConfig = await prisma.providerConfig.findFirst({
    where: { 
      id,
      organizationId: userOrg.organizationId
    }
  });

  if (!providerConfig) {
    return res.status(404).json({ error: 'Provider configuration not found' });
  }

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Remove primary status from all other providers of the same type
    await tx.providerConfig.updateMany({
      where: {
        organizationId: userOrg.organizationId,
        type: providerConfig.type,
        isPrimary: true
      },
      data: { isPrimary: false }
    });

    // Set this provider as primary
    await tx.providerConfig.update({
      where: { id },
      data: { isPrimary: true }
    });
  });

  // Log the change
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'provider_config_set_primary',
      resource: 'provider_config',
      resourceId: id,
      details: {
        provider: providerConfig.provider,
        type: providerConfig.type,
        organizationId: userOrg.organizationId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  res.json({ message: 'Provider set as primary successfully' });
}));

module.exports = router;
