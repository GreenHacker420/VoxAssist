const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting database seeding...');

    // Create organizations
    const demoOrg = await prisma.organization.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'VoxAssist Demo',
        domain: 'demo.voxassist.com',
        settings: {
          theme: 'default',
          timezone: 'UTC',
          language: 'en'
        }
      }
    });

    const acmeOrg = await prisma.organization.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        name: 'Acme Corporation',
        domain: 'acme.com',
        settings: {
          theme: 'corporate',
          timezone: 'America/New_York',
          language: 'en'
        }
      }
    });

    logger.info('Organizations created');

    // Create users
    const hashedPassword = await bcrypt.hash('password', 10);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@voxassist.com' },
      update: {},
      create: {
        email: 'admin@voxassist.com',
        passwordHash: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      }
    });

    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@voxassist.com' },
      update: {},
      create: {
        email: 'demo@voxassist.com',
        passwordHash: hashedPassword,
        name: 'Demo User',
        role: 'user'
      }
    });

    logger.info('Users created');

    // Create user-organization relationships
    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: adminUser.id,
          organizationId: demoOrg.id
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        organizationId: demoOrg.id,
        role: 'admin'
      }
    });

    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: demoUser.id,
          organizationId: demoOrg.id
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        organizationId: demoOrg.id,
        role: 'member'
      }
    });

    logger.info('User-organization relationships created');

    // Create knowledge base entries
    const knowledgeEntries = [
      {
        organizationId: demoOrg.id,
        category: 'billing',
        question: 'How do I view my bill?',
        answer: 'You can view your bill by logging into your account and navigating to the Billing section. Your current and past bills will be displayed there.',
        keywords: ['bill', 'billing', 'invoice', 'payment'],
        priority: 1
      },
      {
        organizationId: demoOrg.id,
        category: 'technical',
        question: 'My service is not working',
        answer: 'I understand you\'re experiencing service issues. Let me help you troubleshoot. First, please try restarting your device and checking your internet connection.',
        keywords: ['not working', 'broken', 'issue', 'problem'],
        priority: 2
      },
      {
        organizationId: demoOrg.id,
        category: 'account',
        question: 'How do I reset my password?',
        answer: 'To reset your password, go to the login page and click "Forgot Password". Enter your email address and you\'ll receive a reset link.',
        keywords: ['password', 'reset', 'login', 'forgot'],
        priority: 1
      }
    ];

    for (const entry of knowledgeEntries) {
      await prisma.knowledgeBase.upsert({
        where: {
          id: knowledgeEntries.indexOf(entry) + 1
        },
        update: {},
        create: {
          ...entry,
          id: knowledgeEntries.indexOf(entry) + 1
        }
      });
    }

    logger.info('Knowledge base entries created');

    // Create voice settings
    await prisma.voiceSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        organizationId: demoOrg.id,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        voiceName: 'Adam - Professional Male Voice',
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true,
        active: true
      }
    });

    logger.info('Voice settings created');

    // Create sample escalation rule
    await prisma.escalationRule.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        organizationId: demoOrg.id,
        name: 'High Priority Escalation',
        conditions: {
          sentiment: 'negative',
          confidence: { lt: 0.7 },
          keywords: ['urgent', 'emergency', 'manager']
        },
        action: 'escalate_to_human',
        priority: 1,
        active: true
      }
    });

    logger.info('Escalation rules created');

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
