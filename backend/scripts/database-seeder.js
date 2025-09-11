#!/usr/bin/env node

/**
 * VoxAssist Database Seeding Script
 * 
 * This script extracts data from the local development database and transfers it
 * to the production/staging database. It includes:
 * - Data extraction from source database
 * - Data validation and transformation
 * - Backup creation before seeding
 * - Data integrity verification
 * - Conflict resolution
 * - Auto-deletion after successful execution
 * 
 * Usage: node scripts/database-seeder.js [--target-env=production|staging] [--dry-run] [--force]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');

// Configuration
const CONFIG = {
  SOURCE_DB_URL: process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL,
  TARGET_DB_URL: process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL,
  BACKUP_DIR: path.join(__dirname, '../backups'),
  LOG_DIR: path.join(__dirname, '../logs'),
  SCRIPT_PATH: __filename,
  MAX_RETRIES: 3,
  BATCH_SIZE: 100,
  SUPPORTED_TARGETS: ['postgresql', 'mysql', 'sqlite']
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(CONFIG.LOG_DIR, 'seeder-error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(CONFIG.LOG_DIR, 'seeder.log') 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class DatabaseSeeder {
  constructor(options = {}) {
    this.options = {
      targetEnv: options.targetEnv || 'production',
      dryRun: options.dryRun || false,
      force: options.force || false,
      ...options
    };
    
    this.sourceDb = null;
    this.targetDb = null;
    this.executionId = crypto.randomUUID();
    this.startTime = new Date();
    this.stats = {
      extracted: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
  }

  async initialize() {
    logger.info(`Initializing Database Seeder - Execution ID: ${this.executionId}`);
    
    // Create necessary directories
    await this.ensureDirectories();
    
    // Initialize database connections
    await this.initializeDatabases();
    
    // Validate environment
    await this.validateEnvironment();
    
    logger.info('Database Seeder initialized successfully');
  }

  async ensureDirectories() {
    for (const dir of [CONFIG.BACKUP_DIR, CONFIG.LOG_DIR]) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    }
  }

  async initializeDatabases() {
    try {
      // Source database (development)
      this.sourceDb = new PrismaClient({
        datasources: {
          db: {
            url: CONFIG.SOURCE_DB_URL
          }
        }
      });

      // Target database (production/staging)
      this.targetDb = new PrismaClient({
        datasources: {
          db: {
            url: CONFIG.TARGET_DB_URL
          }
        }
      });

      // Test connections
      await this.sourceDb.$connect();
      await this.targetDb.$connect();
      
      logger.info('Database connections established');
    } catch (error) {
      logger.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  async validateEnvironment() {
    // Check if script has already been executed
    const lockFile = path.join(CONFIG.BACKUP_DIR, `seeder-${this.executionId}.lock`);
    const completedFile = path.join(CONFIG.BACKUP_DIR, 'seeder-completed.flag');
    
    try {
      await fs.access(completedFile);
      if (!this.options.force) {
        throw new Error('Seeding has already been completed. Use --force to override.');
      }
      logger.warn('Forcing re-execution of seeding script');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create lock file
    await fs.writeFile(lockFile, JSON.stringify({
      executionId: this.executionId,
      startTime: this.startTime.toISOString(),
      targetEnv: this.options.targetEnv,
      pid: process.pid
    }));

    logger.info(`Environment validated for ${this.options.targetEnv} deployment`);
  }

  async createBackup() {
    logger.info('Creating backup of target database...');
    
    const backupFile = path.join(
      CONFIG.BACKUP_DIR, 
      `backup-${this.options.targetEnv}-${Date.now()}.json`
    );

    try {
      const backupData = await this.extractAllData(this.targetDb);
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      logger.info(`Backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  async extractAllData(prismaClient) {
    logger.info('Extracting data from database...');

    const data = {};

    // Define extraction order (respecting foreign key dependencies)
    const extractionOrder = [
      'user',
      'organization',
      'userOrganization',
      'userSession',
      'contact',
      'campaign',
      'campaignContact',
      'call',
      'callInteraction',
      'script',
      'scriptVersion',
      'scriptTest',
      'knowledgeBase',
      'escalationRule',
      'dailyAnalytics',
      'voiceSettings',
      'securityIncident',
      'auditLog',
      'survey',
      'notification',
      'widget',
      'widgetSession',
      'widgetInteraction',
      'contextExtract',
      'aiConfig',
      'voiceConfig',
      'providerConfig',
      'providerCall'
    ];

    for (const model of extractionOrder) {
      try {
        const records = await prismaClient[model].findMany();
        data[model] = records;
        this.stats.extracted += records.length;
        logger.info(`Extracted ${records.length} records from ${model}`);
      } catch (error) {
        logger.warn(`Failed to extract ${model}:`, error.message);
        data[model] = [];
      }
    }

    return data;
  }

  async seedData(sourceData) {
    logger.info('Starting data seeding process...');

    if (this.options.dryRun) {
      logger.info('DRY RUN MODE - No data will be inserted');
      return this.simulateSeeding(sourceData);
    }

    const insertionOrder = [
      'user',
      'organization',
      'userOrganization',
      'userSession',
      'contact',
      'campaign',
      'campaignContact',
      'call',
      'callInteraction',
      'script',
      'scriptVersion',
      'scriptTest',
      'knowledgeBase',
      'escalationRule',
      'dailyAnalytics',
      'voiceSettings',
      'securityIncident',
      'auditLog',
      'survey',
      'notification',
      'widget',
      'widgetSession',
      'widgetInteraction',
      'contextExtract',
      'aiConfig',
      'voiceConfig',
      'providerConfig',
      'providerCall'
    ];

    for (const model of insertionOrder) {
      if (!sourceData[model] || sourceData[model].length === 0) {
        logger.info(`Skipping ${model} - no data to seed`);
        continue;
      }

      await this.seedModel(model, sourceData[model]);
    }

    logger.info('Data seeding completed');
  }

  async seedModel(modelName, records) {
    logger.info(`Seeding ${records.length} records for ${modelName}...`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
      const batch = records.slice(i, i + CONFIG.BATCH_SIZE);

      for (const record of batch) {
        try {
          const result = await this.upsertRecord(modelName, record);

          if (result.created) {
            inserted++;
          } else if (result.updated) {
            updated++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors++;
          logger.error(`Failed to seed ${modelName} record:`, {
            record: record.id || record,
            error: error.message
          });
        }
      }

      // Progress logging
      const progress = Math.min(i + CONFIG.BATCH_SIZE, records.length);
      logger.info(`${modelName}: ${progress}/${records.length} processed`);
    }

    // Update stats
    this.stats.inserted += inserted;
    this.stats.updated += updated;
    this.stats.skipped += skipped;
    this.stats.errors += errors;

    logger.info(`${modelName} seeding complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors`);
  }

  async upsertRecord(modelName, record) {
    const model = this.targetDb[modelName];

    // Handle different ID types and unique constraints
    const uniqueFields = this.getUniqueFields(modelName);
    const whereClause = this.buildWhereClause(record, uniqueFields);

    if (!whereClause) {
      // No unique fields, just create
      await model.create({ data: this.sanitizeRecord(record) });
      return { created: true };
    }

    try {
      // Try to find existing record
      const existing = await model.findFirst({ where: whereClause });

      if (existing) {
        // Update existing record
        await model.update({
          where: whereClause,
          data: this.sanitizeRecord(record, true)
        });
        return { updated: true };
      } else {
        // Create new record
        await model.create({ data: this.sanitizeRecord(record) });
        return { created: true };
      }
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation - record already exists
        return { skipped: true };
      }
      throw error;
    }
  }

  getUniqueFields(modelName) {
    // Define unique fields for each model
    const uniqueFieldsMap = {
      user: ['email'],
      organization: ['name'],
      userOrganization: ['userId', 'organizationId'],
      userSession: ['token'],
      call: ['callSid'],
      contact: ['organizationId', 'phone'],
      campaign: ['id'],
      script: ['id'],
      widget: ['id'],
      widgetSession: ['sessionId'],
      contextExtract: ['widgetId', 'url'],
      aiConfig: ['organizationId'],
      voiceConfig: ['organizationId'],
      providerConfig: ['id'],
      providerCall: ['id'],
      notification: ['id'],
      survey: ['callId']
    };

    return uniqueFieldsMap[modelName] || ['id'];
  }

  buildWhereClause(record, uniqueFields) {
    const whereClause = {};

    for (const field of uniqueFields) {
      if (record[field] !== undefined && record[field] !== null) {
        whereClause[field] = record[field];
      }
    }

    return Object.keys(whereClause).length > 0 ? whereClause : null;
  }

  sanitizeRecord(record, isUpdate = false) {
    const sanitized = { ...record };

    // Remove auto-generated fields for updates
    if (isUpdate) {
      delete sanitized.createdAt;
      delete sanitized.id; // Don't update ID fields
    }

    // Convert Date strings back to Date objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && this.isDateString(value)) {
        sanitized[key] = new Date(value);
      }
    }

    return sanitized;
  }

  isDateString(str) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
  }

  async verifyDataIntegrity() {
    logger.info('Verifying data integrity...');

    const sourceData = await this.extractAllData(this.sourceDb);
    const targetData = await this.extractAllData(this.targetDb);

    const report = {
      models: {},
      totalSourceRecords: 0,
      totalTargetRecords: 0,
      discrepancies: []
    };

    for (const [model, sourceRecords] of Object.entries(sourceData)) {
      const targetRecords = targetData[model] || [];

      report.models[model] = {
        source: sourceRecords.length,
        target: targetRecords.length,
        difference: targetRecords.length - sourceRecords.length
      };

      report.totalSourceRecords += sourceRecords.length;
      report.totalTargetRecords += targetRecords.length;

      if (sourceRecords.length !== targetRecords.length) {
        report.discrepancies.push({
          model,
          expected: sourceRecords.length,
          actual: targetRecords.length,
          difference: targetRecords.length - sourceRecords.length
        });
      }
    }

    logger.info('Data integrity verification complete:', report);
    return report;
  }

  async simulateSeeding(sourceData) {
    logger.info('SIMULATION: Analyzing data for seeding...');

    for (const [model, records] of Object.entries(sourceData)) {
      if (records.length > 0) {
        logger.info(`SIMULATION: Would seed ${records.length} records for ${model}`);
      }
    }

    logger.info('SIMULATION: Seeding simulation complete');
    return { simulated: true };
  }

  async run() {
    const startTime = Date.now();
    let backupFile = null;

    try {
      logger.info(`Starting database seeding process - Execution ID: ${this.executionId}`);

      // Step 1: Create backup of target database
      backupFile = await this.createBackup();

      // Step 2: Extract data from source database
      const sourceData = await this.extractAllData(this.sourceDb);

      // Step 3: Seed data to target database
      await this.seedData(sourceData);

      // Step 4: Verify data integrity
      const integrityReport = await this.verifyDataIntegrity();

      // Step 5: Generate final report
      const executionTime = Date.now() - startTime;
      const report = {
        executionId: this.executionId,
        targetEnv: this.options.targetEnv,
        dryRun: this.options.dryRun,
        executionTime: `${(executionTime / 1000).toFixed(2)}s`,
        stats: this.stats,
        integrityReport,
        backupFile,
        timestamp: new Date().toISOString()
      };

      // Save execution report
      const reportFile = path.join(CONFIG.LOG_DIR, `seeding-report-${this.executionId}.json`);
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      logger.info('Database seeding completed successfully:', report);

      // Step 6: Mark as completed and self-destruct (if not dry run)
      if (!this.options.dryRun) {
        await this.markCompleted();
        await this.selfDestruct();
      }

      return report;

    } catch (error) {
      logger.error('Database seeding failed:', error);

      // Attempt to restore from backup if seeding failed
      if (backupFile && !this.options.dryRun) {
        logger.info('Attempting to restore from backup...');
        try {
          await this.restoreFromBackup(backupFile);
          logger.info('Successfully restored from backup');
        } catch (restoreError) {
          logger.error('Failed to restore from backup:', restoreError);
        }
      }

      throw error;
    } finally {
      // Cleanup connections
      await this.cleanup();
    }
  }

  async markCompleted() {
    const completedFile = path.join(CONFIG.BACKUP_DIR, 'seeder-completed.flag');
    const completionData = {
      executionId: this.executionId,
      completedAt: new Date().toISOString(),
      targetEnv: this.options.targetEnv,
      stats: this.stats
    };

    await fs.writeFile(completedFile, JSON.stringify(completionData, null, 2));
    logger.info('Seeding marked as completed');
  }

  async selfDestruct() {
    if (this.options.dryRun) {
      logger.info('DRY RUN: Would self-destruct script file');
      return;
    }

    try {
      // Create a backup of the script before deletion
      const scriptBackup = path.join(CONFIG.BACKUP_DIR, `seeder-script-backup-${Date.now()}.js`);
      await fs.copyFile(CONFIG.SCRIPT_PATH, scriptBackup);

      // Delete the original script
      await fs.unlink(CONFIG.SCRIPT_PATH);

      logger.info(`Script self-destructed. Backup saved to: ${scriptBackup}`);
    } catch (error) {
      logger.warn('Failed to self-destruct script:', error.message);
    }
  }

  async restoreFromBackup(backupFile) {
    logger.info(`Restoring from backup: ${backupFile}`);

    const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));

    // Clear target database
    await this.clearDatabase();

    // Restore data
    await this.seedData(backupData);

    logger.info('Database restored from backup');
  }

  async clearDatabase() {
    logger.warn('Clearing target database...');

    // Get all model names in reverse order for deletion
    const models = [
      'providerCall', 'providerConfig', 'voiceConfig', 'aiConfig',
      'contextExtract', 'widgetInteraction', 'widgetSession', 'widget',
      'notification', 'survey', 'auditLog', 'securityIncident',
      'voiceSettings', 'dailyAnalytics', 'escalationRule', 'knowledgeBase',
      'scriptTest', 'scriptVersion', 'script', 'callInteraction', 'call',
      'campaignContact', 'campaign', 'contact', 'userSession',
      'userOrganization', 'organization', 'user'
    ];

    for (const model of models) {
      try {
        await this.targetDb[model].deleteMany({});
        logger.info(`Cleared ${model} table`);
      } catch (error) {
        logger.warn(`Failed to clear ${model}:`, error.message);
      }
    }
  }

  async cleanup() {
    try {
      if (this.sourceDb) {
        await this.sourceDb.$disconnect();
      }
      if (this.targetDb) {
        await this.targetDb.$disconnect();
      }
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// Export for testing
module.exports = DatabaseSeeder;

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      const args = process.argv.slice(2);
      const options = {};

      // Parse command line arguments
      args.forEach(arg => {
        if (arg.startsWith('--target-env=')) {
          options.targetEnv = arg.split('=')[1];
        } else if (arg === '--dry-run') {
          options.dryRun = true;
        } else if (arg === '--force') {
          options.force = true;
        } else if (arg === '--help' || arg === '-h') {
          console.log(`
VoxAssist Database Seeder

Usage: node scripts/database-seeder.js [options]

Options:
  --target-env=ENV    Target environment (production|staging) [default: production]
  --dry-run          Simulate seeding without making changes
  --force            Force execution even if already completed
  --help, -h         Show this help message

Environment Variables:
  SOURCE_DATABASE_URL    Source database URL (defaults to DATABASE_URL)
  TARGET_DATABASE_URL    Target database URL (defaults to DATABASE_URL)

Examples:
  node scripts/database-seeder.js --dry-run
  node scripts/database-seeder.js --target-env=staging
  node scripts/database-seeder.js --force
          `);
          process.exit(0);
        }
      });

      const seeder = new DatabaseSeeder(options);
      await seeder.initialize();

      // Run the seeding process
      const report = await seeder.run();

      logger.info('Database seeding completed successfully');
      process.exit(0);

    } catch (error) {
      logger.error('Database seeding failed:', error);
      process.exit(1);
    }
  })();
}
