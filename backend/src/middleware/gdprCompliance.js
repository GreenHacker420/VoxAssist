const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto-js');

const prisma = new PrismaClient();

class GDPRComplianceMiddleware {
    // Data anonymization utilities
    static anonymizeIP(ipAddress) {
        if (!ipAddress) return null;
        
        // IPv4 anonymization - remove last octet
        if (ipAddress.includes('.')) {
            const parts = ipAddress.split('.');
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
        
        // IPv6 anonymization - remove last 64 bits
        if (ipAddress.includes(':')) {
            const parts = ipAddress.split(':');
            return parts.slice(0, 4).join(':') + '::';
        }
        
        return null;
    }

    static anonymizeUserAgent(userAgent) {
        if (!userAgent) return null;
        
        // Remove version numbers and specific identifiers
        return userAgent
            .replace(/\d+\.\d+\.\d+/g, 'x.x.x') // Version numbers
            .replace(/\([^)]*\)/g, '(...)') // Parenthetical content
            .substring(0, 100); // Limit length
    }

    static hashPersonalData(data, salt = null) {
        if (!data) return null;
        
        const secretKey = process.env.GDPR_HASH_SECRET || 'default-secret-key';
        const dataToHash = salt ? `${data}${salt}` : data;
        
        return crypto.SHA256(dataToHash + secretKey).toString();
    }

    // Consent management
    static async recordConsent(req, res, next) {
        try {
            const { sessionId, consentData } = req.body;
            
            if (sessionId && consentData) {
                await prisma.widgetSession.update({
                    where: { sessionId },
                    data: {
                        metadata: {
                            ...req.body.metadata,
                            gdprConsent: {
                                timestamp: new Date().toISOString(),
                                ipAddress: GDPRComplianceMiddleware.anonymizeIP(req.ip),
                                userAgent: GDPRComplianceMiddleware.anonymizeUserAgent(req.get('User-Agent')),
                                consents: consentData,
                                version: '1.0'
                            }
                        }
                    }
                });
            }
            
            next();
        } catch (error) {
            console.error('GDPR consent recording error:', error);
            next();
        }
    }

    // Data retention policies
    static async enforceDataRetention() {
        try {
            const retentionPeriodDays = parseInt(process.env.GDPR_RETENTION_DAYS) || 365;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays);

            // Delete old widget sessions and interactions
            const deletedSessions = await prisma.widgetSession.deleteMany({
                where: {
                    endTime: {
                        lt: cutoffDate
                    }
                }
            });

            // Delete old provider calls
            const deletedCalls = await prisma.providerCall.deleteMany({
                where: {
                    endTime: {
                        lt: cutoffDate
                    }
                }
            });

            // Delete old audit logs (keep for compliance period)
            const auditRetentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS) || 2555; // 7 years
            const auditCutoffDate = new Date();
            auditCutoffDate.setDate(auditCutoffDate.getDate() - auditRetentionDays);

            const deletedAuditLogs = await prisma.auditLog.deleteMany({
                where: {
                    createdAt: {
                        lt: auditCutoffDate
                    }
                }
            });

            console.log(`GDPR retention cleanup: ${deletedSessions.count} sessions, ${deletedCalls.count} calls, ${deletedAuditLogs.count} audit logs deleted`);

        } catch (error) {
            console.error('GDPR data retention enforcement error:', error);
        }
    }

    // Data anonymization for expired sessions
    static async anonymizeExpiredData() {
        try {
            const anonymizationPeriodDays = parseInt(process.env.GDPR_ANONYMIZATION_DAYS) || 90;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - anonymizationPeriodDays);

            // Anonymize widget sessions
            await prisma.widgetSession.updateMany({
                where: {
                    endTime: {
                        lt: cutoffDate
                    },
                    ipAddress: {
                        not: null
                    }
                },
                data: {
                    ipAddress: null,
                    visitorId: null,
                    userAgent: null,
                    referrerUrl: null,
                    metadata: {}
                }
            });

            // Anonymize widget interactions
            await prisma.widgetInteraction.updateMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                },
                data: {
                    audioUrl: null
                }
            });

            console.log('GDPR anonymization completed for expired data');

        } catch (error) {
            console.error('GDPR data anonymization error:', error);
        }
    }

    // Data export for GDPR requests
    static async exportUserData(req, res) {
        try {
            const { visitorId, sessionId, email } = req.query;
            
            if (!visitorId && !sessionId && !email) {
                return res.status(400).json({
                    error: 'Visitor ID, Session ID, or email is required for data export'
                });
            }

            const userData = {};

            // Export widget sessions
            if (visitorId || sessionId) {
                const whereClause = {};
                if (visitorId) whereClause.visitorId = visitorId;
                if (sessionId) whereClause.sessionId = sessionId;

                const sessions = await prisma.widgetSession.findMany({
                    where: whereClause,
                    include: {
                        widgetInteractions: true,
                        widget: {
                            select: {
                                name: true,
                                contextUrl: true
                            }
                        }
                    }
                });

                userData.widgetSessions = sessions.map(session => ({
                    sessionId: session.sessionId,
                    widgetName: session.widget.name,
                    contextUrl: session.widget.contextUrl,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    duration: session.duration,
                    messageCount: session.messageCount,
                    sentiment: session.sentiment,
                    interactions: session.widgetInteractions.map(interaction => ({
                        speaker: interaction.speaker,
                        content: interaction.content,
                        timestamp: interaction.timestamp,
                        sentiment: interaction.sentiment
                    }))
                }));
            }

            // Export call data if email provided
            if (email) {
                const user = await prisma.user.findUnique({
                    where: { email },
                    include: {
                        calls: {
                            include: {
                                callInteractions: true
                            }
                        }
                    }
                });

                if (user) {
                    userData.userProfile = {
                        email: user.email,
                        name: user.name,
                        createdAt: user.createdAt
                    };

                    userData.calls = user.calls.map(call => ({
                        callId: call.id,
                        customerPhone: call.customerPhone,
                        startTime: call.startTime,
                        endTime: call.endTime,
                        duration: call.duration,
                        status: call.status,
                        interactions: call.callInteractions.map(interaction => ({
                            speaker: interaction.speaker,
                            content: interaction.content,
                            timestamp: interaction.timestamp,
                            sentiment: interaction.sentiment
                        }))
                    }));
                }
            }

            res.json({
                exportDate: new Date().toISOString(),
                dataSubject: { visitorId, sessionId, email },
                data: userData
            });

        } catch (error) {
            console.error('GDPR data export error:', error);
            res.status(500).json({ error: 'Failed to export user data' });
        }
    }

    // Data deletion for GDPR requests
    static async deleteUserData(req, res) {
        try {
            const { visitorId, sessionId, email } = req.body;
            
            if (!visitorId && !sessionId && !email) {
                return res.status(400).json({
                    error: 'Visitor ID, Session ID, or email is required for data deletion'
                });
            }

            let deletedRecords = {
                sessions: 0,
                interactions: 0,
                calls: 0,
                user: false
            };

            // Delete widget data
            if (visitorId || sessionId) {
                const whereClause = {};
                if (visitorId) whereClause.visitorId = visitorId;
                if (sessionId) whereClause.sessionId = sessionId;

                // Delete interactions first (due to foreign key constraints)
                const sessions = await prisma.widgetSession.findMany({
                    where: whereClause,
                    select: { sessionId: true }
                });

                for (const session of sessions) {
                    const deletedInteractions = await prisma.widgetInteraction.deleteMany({
                        where: { sessionId: session.sessionId }
                    });
                    deletedRecords.interactions += deletedInteractions.count;
                }

                // Delete sessions
                const deletedSessions = await prisma.widgetSession.deleteMany({
                    where: whereClause
                });
                deletedRecords.sessions = deletedSessions.count;
            }

            // Delete user account and associated data
            if (email) {
                const user = await prisma.user.findUnique({
                    where: { email }
                });

                if (user) {
                    // Delete call interactions
                    await prisma.callInteraction.deleteMany({
                        where: {
                            call: {
                                userId: user.id
                            }
                        }
                    });

                    // Delete calls
                    const deletedCalls = await prisma.call.deleteMany({
                        where: { userId: user.id }
                    });
                    deletedRecords.calls = deletedCalls.count;

                    // Delete user sessions
                    await prisma.userSession.deleteMany({
                        where: { userId: user.id }
                    });

                    // Delete user
                    await prisma.user.delete({
                        where: { id: user.id }
                    });
                    deletedRecords.user = true;
                }
            }

            // Log the deletion for audit purposes
            await prisma.auditLog.create({
                data: {
                    action: 'GDPR_DATA_DELETION',
                    resource: 'user_data',
                    details: {
                        request: { visitorId, sessionId, email },
                        deletedRecords,
                        timestamp: new Date().toISOString()
                    },
                    ipAddress: GDPRComplianceMiddleware.anonymizeIP(req.ip),
                    userAgent: GDPRComplianceMiddleware.anonymizeUserAgent(req.get('User-Agent'))
                }
            });

            res.json({
                success: true,
                message: 'Data deletion completed',
                deletedRecords
            });

        } catch (error) {
            console.error('GDPR data deletion error:', error);
            res.status(500).json({ error: 'Failed to delete user data' });
        }
    }

    // Cookie consent middleware
    static cookieConsent(req, res, next) {
        const cookieConsent = req.cookies.gdpr_consent;
        
        if (!cookieConsent && req.path.startsWith('/api/widget/')) {
            // For widget requests, check if consent is required
            const widget = req.widget; // Assuming widget is attached to request
            
            if (widget?.permissions?.storeCookies && !cookieConsent) {
                return res.status(403).json({
                    error: 'Cookie consent required',
                    consentRequired: true
                });
            }
        }
        
        next();
    }

    // Privacy policy compliance
    static async getPrivacyInfo(req, res) {
        try {
            const privacyInfo = {
                dataController: {
                    name: process.env.COMPANY_NAME || 'VoxAssist',
                    email: process.env.PRIVACY_EMAIL || 'privacy@voxassist.com',
                    address: process.env.COMPANY_ADDRESS || 'Not specified'
                },
                dataProcessing: {
                    purposes: [
                        'Providing AI-powered customer support',
                        'Improving service quality',
                        'Analytics and performance monitoring',
                        'Legal compliance'
                    ],
                    legalBasis: 'Legitimate interest and consent',
                    retentionPeriod: `${process.env.GDPR_RETENTION_DAYS || 365} days`,
                    anonymizationPeriod: `${process.env.GDPR_ANONYMIZATION_DAYS || 90} days`
                },
                dataTypes: [
                    'IP addresses (anonymized)',
                    'Browser information (anonymized)',
                    'Chat interactions',
                    'Voice recordings (if consented)',
                    'Usage analytics'
                ],
                userRights: [
                    'Right to access your data',
                    'Right to rectification',
                    'Right to erasure (right to be forgotten)',
                    'Right to restrict processing',
                    'Right to data portability',
                    'Right to object to processing'
                ],
                contactInfo: {
                    dataProtectionOfficer: process.env.DPO_EMAIL || 'dpo@voxassist.com',
                    supportEmail: process.env.SUPPORT_EMAIL || 'support@voxassist.com'
                }
            };

            res.json(privacyInfo);

        } catch (error) {
            console.error('Privacy info retrieval error:', error);
            res.status(500).json({ error: 'Failed to retrieve privacy information' });
        }
    }

    // Initialize GDPR compliance
    static initialize() {
        // Schedule daily data retention cleanup
        setInterval(() => {
            GDPRComplianceMiddleware.enforceDataRetention();
            GDPRComplianceMiddleware.anonymizeExpiredData();
        }, 24 * 60 * 60 * 1000); // 24 hours

        console.log('GDPR compliance middleware initialized');
    }
}

module.exports = GDPRComplianceMiddleware;
