const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const crmIntegrations = require('../services/crmIntegrations');

// Get CRM integration status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = crmIntegrations.getCRMIntegrationStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error(`Error getting CRM status: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to get CRM status' });
  }
});

// Sync call to CRM
router.post('/sync-call', authenticateToken, async (req, res) => {
  try {
    const { callId, crmType } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }

    // Get call data from database
    const callQuery = `
      SELECT 
        c.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.id = ?
    `;
    
    const db = require('../database/connection');
    const callResult = await db.query(callQuery, [callId]);
    
    if (!callResult || callResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    const callData = {
      ...callResult[0],
      customer: {
        firstName: callResult[0].customer_name?.split(' ')[0] || '',
        lastName: callResult[0].customer_name?.split(' ').slice(1).join(' ') || '',
        email: callResult[0].customer_email,
        phone: callResult[0].customer_phone
      }
    };

    let result;
    if (crmType === 'all') {
      result = await crmIntegrations.syncCallToAllCRMs(callData);
    } else if (crmType === 'salesforce') {
      result = await crmIntegrations.syncCallToSalesforce(callData);
    } else if (crmType === 'hubspot') {
      result = await crmIntegrations.syncCallToHubSpot(callData);
    } else {
      result = await crmIntegrations.syncCallToAllCRMs(callData);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`Error syncing call to CRM: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to sync call to CRM' });
  }
});

// Get customer from CRM
router.get('/customer/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const { crmType = 'auto' } = req.query;

    const customerData = await crmIntegrations.syncCustomerFromCRM(email, crmType);

    if (!customerData) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found in CRM'
      });
    }

    res.json({ success: true, data: customerData });
  } catch (error) {
    logger.error(`Error getting customer from CRM: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to get customer from CRM' });
  }
});

// Create lead from call
router.post('/create-lead', authenticateToken, async (req, res) => {
  try {
    const { callId, crmType = 'auto' } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }

    // Get call data
    const callQuery = `
      SELECT 
        c.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.id = ?
    `;
    
    const db = require('../database/connection');
    const callResult = await db.query(callQuery, [callId]);
    
    if (!callResult || callResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    const callData = {
      ...callResult[0],
      customer: {
        firstName: callResult[0].customer_name?.split(' ')[0] || '',
        lastName: callResult[0].customer_name?.split(' ').slice(1).join(' ') || '',
        email: callResult[0].customer_email,
        phone: callResult[0].customer_phone,
        company: callResult[0].company
      }
    };

    const lead = await crmIntegrations.createLeadFromCall(callData, crmType);

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error(`Error creating lead from call: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to create lead from call' });
  }
});

// Refresh Salesforce token
router.post('/salesforce/refresh-token', authenticateToken, async (req, res) => {
  try {
    await crmIntegrations.refreshSalesforceToken();
    res.json({ success: true, message: 'Salesforce token refreshed successfully' });
  } catch (error) {
    logger.error(`Error refreshing Salesforce token: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to refresh Salesforce token' });
  }
});

// Bulk sync calls to CRM
router.post('/bulk-sync', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, crmType = 'all' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const organizationId = req.user.organizationId || 1;

    // Get calls to sync
    const callsQuery = `
      SELECT 
        c.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM calls c
      LEFT JOIN users u ON c.customer_id = u.id
      WHERE c.organization_id = ? 
      AND c.start_time BETWEEN ? AND ?
      AND c.crm_synced = FALSE
      LIMIT 100
    `;
    
    const db = require('../database/connection');
    const callsResult = await db.query(callsQuery, [organizationId, startDate, endDate]);

    const syncResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const call of callsResult) {
      try {
        const callData = {
          ...call,
          customer: {
            firstName: call.customer_name?.split(' ')[0] || '',
            lastName: call.customer_name?.split(' ').slice(1).join(' ') || '',
            email: call.customer_email,
            phone: call.customer_phone
          }
        };

        let result;
        if (crmType === 'all') {
          result = await crmIntegrations.syncCallToAllCRMs(callData);
        } else if (crmType === 'salesforce') {
          result = await crmIntegrations.syncCallToSalesforce(callData);
        } else if (crmType === 'hubspot') {
          result = await crmIntegrations.syncCallToHubSpot(callData);
        }

        // Mark as synced
        await db.query('UPDATE calls SET crm_synced = TRUE WHERE id = ?', [call.id]);

        syncResults.push({
          callId: call.id,
          status: 'success',
          result
        });
        successCount++;

      } catch (error) {
        syncResults.push({
          callId: call.id,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      data: {
        totalProcessed: callsResult.length,
        successCount,
        errorCount,
        results: syncResults
      }
    });

  } catch (error) {
    logger.error(`Error in bulk CRM sync: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to perform bulk CRM sync' });
  }
});

module.exports = router;
