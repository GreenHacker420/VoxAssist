const express = require('express');
const providerController = require('../controllers/providerController');

const router = express.Router();

// Provider configuration management
router.get('/configs/:organizationId', providerController.getProviderConfigs);
router.post('/configs', providerController.createProviderConfig);
router.put('/configs/:configId', providerController.updateProviderConfig);
router.delete('/configs/:configId', providerController.deleteProviderConfig);

// Provider testing and information
router.post('/test/:configId', providerController.testProviderConnection);
router.get('/supported', providerController.getSupportedProviders);

// Call and message operations
router.post('/call', providerController.initiateCall);
router.post('/message', providerController.sendMessage);

// Webhook handling
router.post('/webhook/:provider/:configId', providerController.handleWebhook);

// Analytics
router.get('/analytics/:organizationId', providerController.getProviderAnalytics);

module.exports = router;
