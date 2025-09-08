const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

const router = express.Router();

// All billing routes require authentication
router.use(authenticateToken);

/**
 * GET /billing/subscription - Get user's subscription details
 */
router.get('/subscription', asyncHandler(async (req, res) => {
  // Mock subscription data - in production, this would come from Stripe/payment provider
  const subscription = {
    id: 'sub_1234567890',
    status: 'active',
    plan: {
      id: 'plan_pro',
      name: 'Pro Plan',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited calls',
        'Advanced analytics',
        'Priority support',
        'Custom integrations'
      ]
    },
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    trialEnd: null
  };

  res.json(subscription);
}));

/**
 * GET /billing/usage - Get current billing period usage
 */
router.get('/usage', asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Get actual usage from database
  const callsThisMonth = await prisma.call.count({
    where: {
      userId: req.user.userId,
      startTime: { gte: startOfMonth }
    }
  });

  const totalDuration = await prisma.call.aggregate({
    where: {
      userId: req.user.userId,
      startTime: { gte: startOfMonth },
      status: 'completed'
    },
    _sum: {
      duration: true
    }
  });

  const usage = {
    billingPeriod: {
      start: startOfMonth.toISOString(),
      end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString()
    },
    calls: {
      used: callsThisMonth,
      limit: 1000,
      percentage: Math.min((callsThisMonth / 1000) * 100, 100)
    },
    minutes: {
      used: Math.round((totalDuration._sum.duration || 0) / 60),
      limit: 5000,
      percentage: Math.min(((totalDuration._sum.duration || 0) / 60 / 5000) * 100, 100)
    },
    storage: {
      used: 1.2, // GB - mock data
      limit: 10,
      percentage: 12
    }
  };

  res.json(usage);
}));

/**
 * GET /billing/invoices - Get billing invoices with pagination
 */
router.get('/invoices', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  // Mock invoice data - in production, this would come from Stripe/payment provider
  const invoices = Array.from({ length: 5 }, (_, i) => ({
    id: `inv_${Date.now() - i * 86400000}`,
    number: `INV-${2024}-${String(i + 1).padStart(4, '0')}`,
    status: i === 0 ? 'paid' : i === 1 ? 'pending' : 'paid',
    amount: 29.99,
    currency: 'USD',
    date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000).toISOString(),
    paidDate: i === 1 ? null : new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
    downloadUrl: `/api/billing/invoices/inv_${Date.now() - i * 86400000}/download`,
    items: [
      {
        description: 'Pro Plan - Monthly Subscription',
        quantity: 1,
        unitPrice: 29.99,
        amount: 29.99
      }
    ]
  }));

  const total = invoices.length;
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedInvoices = invoices.slice(startIndex, startIndex + parseInt(limit));

  res.json({
    invoices: paginatedInvoices,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit))
  });
}));

/**
 * GET /billing/payment-methods - Get saved payment methods
 */
router.get('/payment-methods', asyncHandler(async (req, res) => {
  // Mock payment methods - in production, this would come from Stripe/payment provider
  const paymentMethods = [
    {
      id: 'pm_1234567890',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025
      },
      isDefault: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'pm_0987654321',
      type: 'card',
      card: {
        brand: 'mastercard',
        last4: '5555',
        expMonth: 8,
        expYear: 2026
      },
      isDefault: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  res.json({ paymentMethods });
}));

/**
 * POST /billing/payment-methods - Add new payment method
 */
router.post('/payment-methods', asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    return res.status(400).json({ error: 'Payment method ID is required' });
  }

  // Mock response - in production, this would integrate with Stripe
  const paymentMethod = {
    id: paymentMethodId,
    type: 'card',
    card: {
      brand: 'visa',
      last4: '1234',
      expMonth: 12,
      expYear: 2027
    },
    isDefault: false,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ paymentMethod });
}));

/**
 * DELETE /billing/payment-methods/:id - Remove payment method
 */
router.delete('/payment-methods/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Payment method ID is required' });
  }

  // Mock deletion - in production, this would integrate with Stripe
  res.json({ message: 'Payment method removed successfully' });
}));

/**
 * POST /billing/subscription/cancel - Cancel subscription
 */
router.post('/subscription/cancel', asyncHandler(async (req, res) => {
  const { cancelAtPeriodEnd = true } = req.body;

  // Mock cancellation - in production, this would integrate with Stripe
  const subscription = {
    id: 'sub_1234567890',
    status: 'active',
    cancelAtPeriodEnd: cancelAtPeriodEnd,
    canceledAt: cancelAtPeriodEnd ? null : new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
  };

  res.json({
    subscription,
    message: cancelAtPeriodEnd 
      ? 'Subscription will be canceled at the end of the current billing period'
      : 'Subscription canceled immediately'
  });
}));

/**
 * POST /billing/subscription/reactivate - Reactivate canceled subscription
 */
router.post('/subscription/reactivate', asyncHandler(async (req, res) => {
  // Mock reactivation - in production, this would integrate with Stripe
  const subscription = {
    id: 'sub_1234567890',
    status: 'active',
    cancelAtPeriodEnd: false,
    canceledAt: null,
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
  };

  res.json({
    subscription,
    message: 'Subscription reactivated successfully'
  });
}));

/**
 * GET /billing/invoices/:id/download - Download invoice PDF
 */
router.get('/invoices/:id/download', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Mock PDF download - in production, this would generate/fetch actual PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
  res.send(Buffer.from('Mock PDF content for invoice ' + id));
}));

module.exports = router;
