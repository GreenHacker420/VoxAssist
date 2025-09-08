const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto-js');
const ProviderFactory = require('../services/providers/ProviderFactory');

const prisma = new PrismaClient();

class ProviderController {
    // Get all provider configurations for an organization
    async getProviderConfigs(req, res) {
        try {
            const { organizationId } = req.params;

            const configs = await prisma.providerConfig.findMany({
                where: { organizationId: parseInt(organizationId) },
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
                }
            });

            res.json(configs);

        } catch (error) {
            console.error('Get provider configs error:', error);
            res.status(500).json({ error: 'Failed to retrieve provider configurations' });
        }
    }

    // Create new provider configuration
    async createProviderConfig(req, res) {
        try {
            const { organizationId, name, type, provider, credentials, settings, isPrimary } = req.body;

            // Validate provider and credentials
            const validation = ProviderFactory.validateProviderConfig(provider, credentials, settings);
            if (!validation.valid) {
                return res.status(400).json({ 
                    error: 'Invalid provider configuration',
                    details: validation.errors
                });
            }

            // Encrypt credentials
            const encryptedCredentials = this.encryptCredentials(credentials);

            // If setting as primary, unset other primary configs of same type
            if (isPrimary) {
                await prisma.providerConfig.updateMany({
                    where: {
                        organizationId: parseInt(organizationId),
                        type,
                        isPrimary: true
                    },
                    data: { isPrimary: false }
                });
            }

            const config = await prisma.providerConfig.create({
                data: {
                    organizationId: parseInt(organizationId),
                    name,
                    type,
                    provider: provider.toLowerCase(),
                    credentials: encryptedCredentials,
                    settings: settings || {},
                    isPrimary: isPrimary || false,
                    webhookUrl: this.generateWebhookUrl(provider)
                }
            });

            // Test the provider connection
            const testResult = await ProviderFactory.testProviderConnection({
                ...config,
                credentials: encryptedCredentials
            });

            res.status(201).json({
                ...config,
                credentials: undefined, // Don't return credentials
                connectionTest: testResult
            });

        } catch (error) {
            console.error('Create provider config error:', error);
            res.status(500).json({ error: 'Failed to create provider configuration' });
        }
    }

    // Update provider configuration
    async updateProviderConfig(req, res) {
        try {
            const { configId } = req.params;
            const updates = req.body;

            // If updating credentials, encrypt them
            if (updates.credentials) {
                updates.credentials = this.encryptCredentials(updates.credentials);
            }

            // Handle primary provider logic
            if (updates.isPrimary) {
                const currentConfig = await prisma.providerConfig.findUnique({
                    where: { id: configId }
                });

                if (currentConfig) {
                    await prisma.providerConfig.updateMany({
                        where: {
                            organizationId: currentConfig.organizationId,
                            type: currentConfig.type,
                            isPrimary: true,
                            id: { not: configId }
                        },
                        data: { isPrimary: false }
                    });
                }
            }

            const config = await prisma.providerConfig.update({
                where: { id: configId },
                data: updates
            });

            res.json({
                ...config,
                credentials: undefined // Don't return credentials
            });

        } catch (error) {
            console.error('Update provider config error:', error);
            res.status(500).json({ error: 'Failed to update provider configuration' });
        }
    }

    // Delete provider configuration
    async deleteProviderConfig(req, res) {
        try {
            const { configId } = req.params;

            await prisma.providerConfig.delete({
                where: { id: configId }
            });

            res.json({ success: true });

        } catch (error) {
            console.error('Delete provider config error:', error);
            res.status(500).json({ error: 'Failed to delete provider configuration' });
        }
    }

    // Test provider connection
    async testProviderConnection(req, res) {
        try {
            const { configId } = req.params;

            const config = await prisma.providerConfig.findUnique({
                where: { id: configId }
            });

            if (!config) {
                return res.status(404).json({ error: 'Provider configuration not found' });
            }

            const testResult = await ProviderFactory.testProviderConnection(config);

            res.json(testResult);

        } catch (error) {
            console.error('Test provider connection error:', error);
            res.status(500).json({ error: 'Failed to test provider connection' });
        }
    }

    // Get supported providers and their capabilities
    async getSupportedProviders(req, res) {
        try {
            const providers = ProviderFactory.getSupportedProviders();
            const providerInfo = providers.map(provider => ({
                name: provider,
                capabilities: ProviderFactory.getProviderCapabilities(provider),
                pricing: ProviderFactory.getProviderPricing(provider),
                requirements: ProviderFactory.getProviderRequirements(provider)
            }));

            res.json(providerInfo);

        } catch (error) {
            console.error('Get supported providers error:', error);
            res.status(500).json({ error: 'Failed to get supported providers' });
        }
    }

    // Initiate call using configured provider
    async initiateCall(req, res) {
        try {
            const { organizationId, type, fromNumber, toNumber } = req.body;

            // Get primary provider for the type
            const config = await prisma.providerConfig.findFirst({
                where: {
                    organizationId: parseInt(organizationId),
                    type,
                    isPrimary: true,
                    isActive: true
                }
            });

            if (!config) {
                return res.status(404).json({ 
                    error: `No active primary ${type} provider configured for this organization` 
                });
            }

            // Create provider instance
            const provider = ProviderFactory.createProvider(config);

            // Generate callback URL
            const callbackUrl = `${process.env.API_BASE_URL}/api/providers/webhook/${config.provider}/${config.id}`;

            // Initiate call
            const result = await provider.initiateCall(fromNumber, toNumber, callbackUrl);

            if (result.success) {
                // Save call record
                const providerCall = await prisma.providerCall.create({
                    data: {
                        providerConfigId: config.id,
                        externalCallId: result.data.externalCallId,
                        type,
                        status: result.data.status,
                        fromNumber,
                        toNumber,
                        metadata: result.data
                    }
                });

                res.json({
                    success: true,
                    callId: providerCall.id,
                    externalCallId: result.data.externalCallId,
                    status: result.data.status,
                    provider: config.provider
                });
            } else {
                res.status(400).json(result);
            }

        } catch (error) {
            console.error('Initiate call error:', error);
            res.status(500).json({ error: 'Failed to initiate call' });
        }
    }

    // Send message using configured provider
    async sendMessage(req, res) {
        try {
            const { organizationId, type, fromNumber, toNumber, message } = req.body;

            const config = await prisma.providerConfig.findFirst({
                where: {
                    organizationId: parseInt(organizationId),
                    type,
                    isPrimary: true,
                    isActive: true
                }
            });

            if (!config) {
                return res.status(404).json({ 
                    error: `No active primary ${type} provider configured for this organization` 
                });
            }

            const provider = ProviderFactory.createProvider(config);
            const result = await provider.sendMessage(fromNumber, toNumber, message);

            if (result.success) {
                // Save message record
                await prisma.providerCall.create({
                    data: {
                        providerConfigId: config.id,
                        externalCallId: result.data.messageId,
                        type: `${type}_message`,
                        status: result.data.status,
                        fromNumber,
                        toNumber,
                        metadata: { message, ...result.data }
                    }
                });

                res.json(result);
            } else {
                res.status(400).json(result);
            }

        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    }

    // Handle provider webhooks
    async handleWebhook(req, res) {
        try {
            const { provider, configId } = req.params;
            const webhookData = req.body;

            const config = await prisma.providerConfig.findUnique({
                where: { id: configId }
            });

            if (!config) {
                return res.status(404).json({ error: 'Provider configuration not found' });
            }

            const providerInstance = ProviderFactory.createProvider(config);
            const result = await providerInstance.handleWebhook(webhookData);

            // Update call status if applicable
            if (result.data && result.data.externalCallId) {
                await this.updateCallStatus(result.data.externalCallId, result.data);
            }

            // Send appropriate response based on provider
            this.sendWebhookResponse(res, provider, result);

        } catch (error) {
            console.error('Handle webhook error:', error);
            res.status(500).json({ error: 'Failed to handle webhook' });
        }
    }

    // Get call analytics for provider
    async getProviderAnalytics(req, res) {
        try {
            const { organizationId } = req.params;
            const { startDate, endDate, type, provider } = req.query;

            const whereClause = {
                providerConfig: {
                    organizationId: parseInt(organizationId)
                },
                startTime: {
                    gte: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
                    lte: new Date(endDate || Date.now())
                }
            };

            if (type) whereClause.type = type;
            if (provider) whereClause.providerConfig = { ...whereClause.providerConfig, provider };

            const [totalCalls, completedCalls, totalDuration, avgDuration, costData] = await Promise.all([
                prisma.providerCall.count({ where: whereClause }),
                prisma.providerCall.count({ 
                    where: { ...whereClause, status: 'completed' }
                }),
                prisma.providerCall.aggregate({
                    where: { ...whereClause, status: 'completed' },
                    _sum: { duration: true }
                }),
                prisma.providerCall.aggregate({
                    where: { ...whereClause, status: 'completed' },
                    _avg: { duration: true }
                }),
                prisma.providerCall.aggregate({
                    where: whereClause,
                    _sum: { cost: true }
                })
            ]);

            res.json({
                totalCalls,
                completedCalls,
                successRate: totalCalls > 0 ? (completedCalls / totalCalls * 100).toFixed(2) : 0,
                totalDuration: totalDuration._sum.duration || 0,
                avgDuration: avgDuration._avg.duration || 0,
                totalCost: costData._sum.cost || 0,
                period: {
                    start: whereClause.startTime.gte,
                    end: whereClause.startTime.lte
                }
            });

        } catch (error) {
            console.error('Get provider analytics error:', error);
            res.status(500).json({ error: 'Failed to get provider analytics' });
        }
    }

    // Private helper methods
    encryptCredentials(credentials) {
        const secretKey = process.env.ENCRYPTION_SECRET_KEY;
        if (!secretKey) {
            throw new Error('Encryption secret key not configured');
        }
        return crypto.AES.encrypt(JSON.stringify(credentials), secretKey).toString();
    }

    generateWebhookUrl(provider) {
        const baseUrl = process.env.API_BASE_URL || 'https://api.voxassist.com';
        return `${baseUrl}/api/providers/webhook/${provider.toLowerCase()}`;
    }

    async updateCallStatus(externalCallId, statusData) {
        try {
            await prisma.providerCall.updateMany({
                where: { externalCallId },
                data: {
                    status: statusData.status,
                    duration: statusData.duration || undefined,
                    endTime: statusData.status === 'completed' ? new Date() : undefined,
                    cost: statusData.cost || undefined,
                    errorCode: statusData.errorCode || undefined,
                    errorMessage: statusData.errorMessage || undefined,
                    metadata: statusData
                }
            });
        } catch (error) {
            console.error('Update call status error:', error);
        }
    }

    sendWebhookResponse(res, provider, result) {
        switch (provider.toLowerCase()) {
            case 'twilio':
                // Twilio expects TwiML response for some webhooks
                if (result.data && result.data.twiml) {
                    res.set('Content-Type', 'text/xml');
                    res.send(result.data.twiml);
                } else {
                    res.json({ status: 'received' });
                }
                break;

            case 'plivo':
                // Plivo expects XML response for some webhooks
                if (result.data && result.data.xml) {
                    res.set('Content-Type', 'text/xml');
                    res.send(result.data.xml);
                } else {
                    res.json({ status: 'received' });
                }
                break;

            default:
                res.json({ status: 'received' });
        }
    }
}

module.exports = new ProviderController();
