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

module.exports = router;
