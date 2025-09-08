const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

// --- Support Topics (KnowledgeBase) ---

async function getSupportTopics(req, res) {
  try {
    const topics = await prisma.knowledgeBase.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(topics);
  } catch (error) {
    logger.error('Failed to get support topics:', error);
    res.status(500).json({ error: 'Failed to retrieve support topics.' });
  }
}

async function createSupportTopic(req, res) {
  const { name, keywords, responseScript } = req.body;
  try {
    const newTopic = await prisma.knowledgeBase.create({
      data: {
        organizationId: req.user.organizationId,
        category: 'Support Topic',
        question: name,
        answer: responseScript,
        keywords: keywords,
        active: true,
      },
    });
    res.status(201).json(newTopic);
  } catch (error) {
    logger.error('Failed to create support topic:', error);
    res.status(500).json({ error: 'Failed to create support topic.' });
  }
}

async function updateSupportTopic(req, res) {
  const { id } = req.params;
  const { name, keywords, responseScript } = req.body;
  try {
    const updatedTopic = await prisma.knowledgeBase.update({
      where: { id: parseInt(id) },
      data: {
        question: name,
        answer: responseScript,
        keywords: keywords,
      },
    });
    res.json(updatedTopic);
  } catch (error) {
    logger.error('Failed to update support topic:', error);
    res.status(500).json({ error: 'Failed to update support topic.' });
  }
}

async function deleteSupportTopic(req, res) {
  const { id } = req.params;
  try {
    await prisma.knowledgeBase.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete support topic:', error);
    res.status(500).json({ error: 'Failed to delete support topic.' });
  }
}

// --- Escalation Rules ---

async function getEscalationRules(req, res) {
  try {
    const rules = await prisma.escalationRule.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (error) {
    logger.error('Failed to get escalation rules:', error);
    res.status(500).json({ error: 'Failed to retrieve escalation rules.' });
  }
}

async function createEscalationRule(req, res) {
  const { name, condition, action } = req.body;
  try {
    const newRule = await prisma.escalationRule.create({
      data: {
        organizationId: req.user.organizationId,
        name,
        conditions: condition,
        action,
        active: true,
      },
    });
    res.status(201).json(newRule);
  } catch (error) {
    logger.error('Failed to create escalation rule:', error);
    res.status(500).json({ error: 'Failed to create escalation rule.' });
  }
}

async function updateEscalationRule(req, res) {
  const { id } = req.params;
  const { name, condition, action } = req.body;
  try {
    const updatedRule = await prisma.escalationRule.update({
      where: { id: parseInt(id) },
      data: {
        name,
        conditions: condition,
        action,
      },
    });
    res.json(updatedRule);
  } catch (error) {
    logger.error('Failed to update escalation rule:', error);
    res.status(500).json({ error: 'Failed to update escalation rule.' });
  }
}

async function deleteEscalationRule(req, res) {
  const { id } = req.params;
  try {
    await prisma.escalationRule.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete escalation rule:', error);
    res.status(500).json({ error: 'Failed to delete escalation rule.' });
  }
}

module.exports = {
  getSupportTopics,
  createSupportTopic,
  updateSupportTopic,
  deleteSupportTopic,
  getEscalationRules,
  createEscalationRule,
  updateEscalationRule,
  deleteEscalationRule,
};
