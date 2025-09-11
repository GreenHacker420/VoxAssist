const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getSupportTopics,
  createSupportTopic,
  updateSupportTopic,
  deleteSupportTopic,
  getEscalationRules,
  createEscalationRule,
  updateEscalationRule,
  deleteEscalationRule,
  getAIConfig,
  saveAIConfig,
  testAIConfig,
  getVoiceConfig,
  saveVoiceConfig,
  testVoiceConfig,
  getProviderConfig,
  saveProviderConfig,
  testProviderConfig,
  changePassword,
} = require('../controllers/settingsController');

// Support Topics Routes
router.get('/support-topics', authenticateToken, getSupportTopics);
router.post('/support-topics', authenticateToken, createSupportTopic);
router.put('/support-topics/:id', authenticateToken, updateSupportTopic);
router.delete('/support-topics/:id', authenticateToken, deleteSupportTopic);

// Escalation Rules Routes
router.get('/escalation-rules', authenticateToken, getEscalationRules);
router.post('/escalation-rules', authenticateToken, createEscalationRule);
router.put('/escalation-rules/:id', authenticateToken, updateEscalationRule);
router.delete('/escalation-rules/:id', authenticateToken, deleteEscalationRule);

// AI Configuration Routes
router.get('/ai', authenticateToken, getAIConfig);
router.post('/ai', authenticateToken, saveAIConfig);
router.post('/ai/test', authenticateToken, testAIConfig);

// Voice Configuration Routes
router.get('/voice', authenticateToken, getVoiceConfig);
router.post('/voice', authenticateToken, saveVoiceConfig);
router.post('/voice/test', authenticateToken, testVoiceConfig);

// Provider Configuration Routes
router.get('/providers', authenticateToken, getProviderConfig);
router.post('/providers', authenticateToken, saveProviderConfig);
router.post('/providers/test', authenticateToken, testProviderConfig);

// User Profile Routes
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
