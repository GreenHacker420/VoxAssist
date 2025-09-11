const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeUser } = require('../middleware/auth');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

/**
 * GET /contacts - Get all contacts for the organization
 */
router.get('/', authenticateToken, authorizeUser, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const organizationId = req.user.organizationId || 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build search conditions
  const searchConditions = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const whereClause = {
    organizationId,
    ...searchConditions
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            calls: true,
            campaigns: true
          }
        }
      }
    }),
    prisma.contact.count({ where: whereClause })
  ]);

  res.json({
    success: true,
    data: {
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

/**
 * POST /contacts - Create a new contact
 */
router.post('/', authenticateToken, authorizeUser, asyncHandler(async (req, res) => {
  const { name, email, phone, metadata = {} } = req.body;
  const organizationId = req.user.organizationId || 1;

  // Validation
  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Name and phone are required'
    });
  }

  // Validate phone format (basic validation)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number format'
    });
  }

  // Validate email if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        organizationId,
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone.replace(/[\s\-\(\)]/g, ''),
        metadata
      }
    });

    logger.info(`Contact created: ${contact.name} (${contact.phone})`, {
      contactId: contact.id,
      organizationId,
      userId: req.user.userId
    });

    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'A contact with this phone number already exists in your organization'
      });
    }
    throw error;
  }
}));

/**
 * GET /contacts/:id - Get a specific contact
 */
router.get('/:id', authenticateToken, authorizeUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organizationId || 1;

  const contact = await prisma.contact.findFirst({
    where: {
      id: parseInt(id),
      organizationId
    },
    include: {
      calls: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          duration: true,
          createdAt: true,
          startTime: true,
          endTime: true
        }
      },
      campaigns: {
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      },
      _count: {
        select: {
          calls: true,
          campaigns: true
        }
      }
    }
  });

  if (!contact) {
    return res.status(404).json({
      success: false,
      error: 'Contact not found'
    });
  }

  res.json({
    success: true,
    data: contact
  });
}));

/**
 * PUT /contacts/:id - Update a contact
 */
router.put('/:id', authenticateToken, authorizeUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, metadata } = req.body;
  const organizationId = req.user.organizationId || 1;

  // Check if contact exists and belongs to organization
  const existingContact = await prisma.contact.findFirst({
    where: {
      id: parseInt(id),
      organizationId
    }
  });

  if (!existingContact) {
    return res.status(404).json({
      success: false,
      error: 'Contact not found'
    });
  }

  // Validation
  if (name && !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Name cannot be empty'
    });
  }

  if (phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
  }

  // Build update data
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (email !== undefined) updateData.email = email ? email.trim().toLowerCase() : null;
  if (phone !== undefined) updateData.phone = phone.replace(/[\s\-\(\)]/g, '');
  if (metadata !== undefined) updateData.metadata = metadata;

  try {
    const contact = await prisma.contact.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    logger.info(`Contact updated: ${contact.name} (${contact.phone})`, {
      contactId: contact.id,
      organizationId,
      userId: req.user.userId
    });

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A contact with this phone number already exists in your organization'
      });
    }
    throw error;
  }
}));

/**
 * DELETE /contacts/:id - Delete a contact
 */
router.delete('/:id', authenticateToken, authorizeUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organizationId || 1;

  // Check if contact exists and belongs to organization
  const existingContact = await prisma.contact.findFirst({
    where: {
      id: parseInt(id),
      organizationId
    }
  });

  if (!existingContact) {
    return res.status(404).json({
      success: false,
      error: 'Contact not found'
    });
  }

  await prisma.contact.delete({
    where: { id: parseInt(id) }
  });

  logger.info(`Contact deleted: ${existingContact.name} (${existingContact.phone})`, {
    contactId: parseInt(id),
    organizationId,
    userId: req.user.userId
  });

  res.json({
    success: true,
    message: 'Contact deleted successfully'
  });
}));

/**
 * POST /contacts/bulk - Bulk create contacts
 */
router.post('/bulk', authenticateToken, authorizeUser, asyncHandler(async (req, res) => {
  const { contacts } = req.body;
  const organizationId = req.user.organizationId || 1;

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Contacts array is required and cannot be empty'
    });
  }

  if (contacts.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 100 contacts can be created at once'
    });
  }

  // Validate all contacts
  const errors = [];
  const validContacts = [];

  contacts.forEach((contact, index) => {
    const { name, phone, email } = contact;
    
    if (!name || !phone) {
      errors.push(`Contact ${index + 1}: Name and phone are required`);
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push(`Contact ${index + 1}: Invalid phone number format`);
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Contact ${index + 1}: Invalid email format`);
        return;
      }
    }

    validContacts.push({
      organizationId,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      phone: phone.replace(/[\s\-\(\)]/g, ''),
      metadata: contact.metadata || {}
    });
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation errors',
      details: errors
    });
  }

  try {
    const result = await prisma.contact.createMany({
      data: validContacts,
      skipDuplicates: true
    });

    logger.info(`Bulk contact creation: ${result.count} contacts created`, {
      organizationId,
      userId: req.user.userId,
      totalAttempted: contacts.length,
      created: result.count
    });

    res.status(201).json({
      success: true,
      data: {
        created: result.count,
        attempted: contacts.length,
        skipped: contacts.length - result.count
      }
    });
  } catch (error) {
    logger.error('Bulk contact creation failed:', error);
    throw error;
  }
}));

module.exports = router;
