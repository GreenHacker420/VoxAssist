const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

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

// --- AI Configuration ---

async function getAIConfig(req, res) {
  try {
    const config = await prisma.aiConfig.findFirst({
      where: { organizationId: req.user.organizationId },
    });
    
    if (!config) {
      // Return default configuration
      return res.json({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful AI assistant for customer support.',
        enableFunctionCalling: true,
      });
    }
    
    res.json(config);
  } catch (error) {
    logger.error('Failed to get AI configuration:', error);
    res.status(500).json({ error: 'Failed to retrieve AI configuration.' });
  }
}

async function saveAIConfig(req, res) {
  try {
    const { provider, model, temperature, maxTokens, systemPrompt, enableFunctionCalling } = req.body;
    
    const config = await prisma.aiConfig.upsert({
      where: { organizationId: req.user.organizationId },
      update: {
        provider,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        enableFunctionCalling,
      },
      create: {
        organizationId: req.user.organizationId,
        provider,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        enableFunctionCalling,
      },
    });
    
    res.json({ success: true, config });
  } catch (error) {
    logger.error('Failed to save AI configuration:', error);
    res.status(500).json({ error: 'Failed to save AI configuration.' });
  }
}

async function testAIConfig(req, res) {
  try {
    const { provider, model, temperature } = req.body;
    
    // Mock AI test - in real implementation, this would test the actual AI provider
    logger.info(`Testing AI configuration: ${provider}/${model} with temperature ${temperature}`);
    
    // Simulate test delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: 'AI configuration test successful',
      testResult: {
        provider,
        model,
        responseTime: '1.2s',
        status: 'connected'
      }
    });
  } catch (error) {
    logger.error('Failed to test AI configuration:', error);
    res.status(500).json({ error: 'Failed to test AI configuration.' });
  }
}

// --- Voice Configuration ---

async function getVoiceConfig(req, res) {
  try {
    const config = await prisma.voiceConfig.findFirst({
      where: { organizationId: req.user.organizationId },
    });
    
    if (!config) {
      // Return default configuration
      return res.json({
        provider: 'elevenlabs',
        voiceId: 'default',
        speed: 1.0,
        pitch: 1.0,
        stability: 0.5,
        clarity: 0.75,
      });
    }
    
    res.json(config);
  } catch (error) {
    logger.error('Failed to get voice configuration:', error);
    res.status(500).json({ error: 'Failed to retrieve voice configuration.' });
  }
}

async function saveVoiceConfig(req, res) {
  try {
    const { provider, voiceId, speed, pitch, stability, clarity } = req.body;
    
    const config = await prisma.voiceConfig.upsert({
      where: { organizationId: req.user.organizationId },
      update: {
        provider,
        voiceId,
        speed,
        pitch,
        stability,
        clarity,
      },
      create: {
        organizationId: req.user.organizationId,
        provider,
        voiceId,
        speed,
        pitch,
        stability,
        clarity,
      },
    });
    
    res.json({ success: true, config });
  } catch (error) {
    logger.error('Failed to save voice configuration:', error);
    res.status(500).json({ error: 'Failed to save voice configuration.' });
  }
}

async function testVoiceConfig(req, res) {
  try {
    const { provider, voiceId, speed, pitch, testText } = req.body;
    
    // Mock voice test - in real implementation, this would generate actual audio
    logger.info(`Testing voice configuration: ${provider}/${voiceId} with text: "${testText}"`);
    
    // Simulate test delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({ 
      success: true, 
      message: 'Voice test completed successfully',
      testResult: {
        provider,
        voiceId,
        audioUrl: '/api/test-audio.mp3', // Mock audio URL
        duration: '3.2s',
        status: 'generated'
      }
    });
  } catch (error) {
    logger.error('Failed to test voice configuration:', error);
    res.status(500).json({ error: 'Failed to test voice configuration.' });
  }
}

// --- Provider Configuration ---

async function getProviderConfig(req, res) {
  try {
    const configs = await prisma.providerConfig.findMany({
      where: { organizationId: req.user.organizationId },
    });
    
    res.json(configs);
  } catch (error) {
    logger.error('Failed to get provider configuration:', error);
    res.status(500).json({ error: 'Failed to retrieve provider configuration.' });
  }
}

async function saveProviderConfig(req, res) {
  try {
    const { provider, config } = req.body;
    
    const providerConfig = await prisma.providerConfig.upsert({
      where: { 
        organizationId_provider: {
          organizationId: req.user.organizationId,
          provider: provider
        }
      },
      update: {
        config: config,
        isActive: true,
      },
      create: {
        organizationId: req.user.organizationId,
        provider: provider,
        config: config,
        isActive: true,
      },
    });
    
    res.json({ success: true, config: providerConfig });
  } catch (error) {
    logger.error('Failed to save provider configuration:', error);
    res.status(500).json({ error: 'Failed to save provider configuration.' });
  }
}

async function testProviderConfig(req, res) {
  try {
    const { provider, config } = req.body;
    
    // Mock provider test - in real implementation, this would test actual provider connection
    logger.info(`Testing provider configuration: ${provider}`);
    
    // Simulate test delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    res.json({ 
      success: true, 
      message: 'Provider connection test successful',
      testResult: {
        provider,
        status: 'connected',
        responseTime: '0.8s',
        features: ['voice', 'sms', 'webhooks']
      }
    });
  } catch (error) {
    logger.error('Failed to test provider configuration:', error);
    res.status(500).json({ error: 'Failed to test provider configuration.' });
  }
}

// --- User Profile ---

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });
    
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Failed to change password:', error);
    res.status(500).json({ error: 'Failed to change password.' });
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
};
