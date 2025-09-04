const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DatabaseInitializer {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'voxassist',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });
  }

  async initialize() {
    try {
      logger.info('Starting database initialization...');
      
      // Check if database exists and is accessible
      await this.testConnection();
      
      // Run schema creation
      await this.createSchema();
      
      // Verify tables exist
      await this.verifyTables();
      
      logger.info('Database initialization completed successfully');
      return true;
      
    } catch (error) {
      logger.error(`Database initialization failed: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info(`Database connection successful: ${result.rows[0].now}`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createSchema() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf8');
      
      // Split by semicolons and execute each statement
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        try {
          await this.pool.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            logger.warn(`Schema statement warning: ${error.message}`);
          }
        }
      }
      
      logger.info('Database schema created/updated successfully');
    } catch (error) {
      throw new Error(`Schema creation failed: ${error.message}`);
    }
  }

  async verifyTables() {
    const expectedTables = [
      'users',
      'organizations', 
      'user_organizations',
      'calls',
      'call_interactions',
      'knowledge_base',
      'escalation_rules',
      'daily_analytics',
      'voice_settings'
    ];

    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const existingTables = result.rows.map(row => row.table_name);
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        throw new Error(`Missing tables: ${missingTables.join(', ')}`);
      }
      
      logger.info(`All required tables verified: ${expectedTables.join(', ')}`);
    } catch (error) {
      throw new Error(`Table verification failed: ${error.message}`);
    }
  }

  async seedData() {
    try {
      // Check if data already exists
      const userCount = await this.pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) > 0) {
        logger.info('Database already contains data, skipping seed');
        return;
      }

      // Insert sample data
      await this.pool.query(`
        INSERT INTO organizations (name, domain) VALUES 
        ('VoxAssist Demo', 'demo.voxassist.com'),
        ('Acme Corporation', 'acme.com')
        ON CONFLICT DO NOTHING
      `);

      await this.pool.query(`
        INSERT INTO users (email, password_hash, name, role) VALUES 
        ('admin@voxassist.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin'),
        ('demo@voxassist.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', 'user')
        ON CONFLICT DO NOTHING
      `);

      await this.pool.query(`
        INSERT INTO user_organizations (user_id, organization_id, role) VALUES 
        (1, 1, 'admin'),
        (2, 1, 'member')
        ON CONFLICT DO NOTHING
      `);

      await this.pool.query(`
        INSERT INTO knowledge_base (organization_id, category, question, answer, keywords) VALUES 
        (1, 'billing', 'How do I view my bill?', 'You can view your bill by logging into your account and navigating to the Billing section. Your current and past bills will be displayed there.', ARRAY['bill', 'billing', 'invoice', 'payment']),
        (1, 'technical', 'My service is not working', 'I understand you''re experiencing service issues. Let me help you troubleshoot. First, please try restarting your device and checking your internet connection.', ARRAY['not working', 'broken', 'issue', 'problem']),
        (1, 'account', 'How do I reset my password?', 'To reset your password, go to the login page and click "Forgot Password". Enter your email address and you''ll receive a reset link.', ARRAY['password', 'reset', 'login', 'forgot'])
        ON CONFLICT DO NOTHING
      `);

      await this.pool.query(`
        INSERT INTO voice_settings (organization_id, voice_id, voice_name) VALUES 
        (1, 'pNInz6obpgDQGcFmaJgB', 'Adam - Professional Male Voice')
        ON CONFLICT DO NOTHING
      `);

      logger.info('Sample data seeded successfully');
    } catch (error) {
      logger.error(`Data seeding failed: ${error.message}`);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI usage
if (require.main === module) {
  require('dotenv').config();
  
  const initializer = new DatabaseInitializer();
  
  initializer.initialize()
    .then(() => initializer.seedData())
    .then(() => {
      logger.info('Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Database setup failed: ${error.message}`);
      process.exit(1);
    })
    .finally(() => {
      initializer.close();
    });
}

module.exports = DatabaseInitializer;
