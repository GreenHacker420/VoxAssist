const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DatabaseInitializer {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voxassist',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
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
      const connection = await this.pool.getConnection();
      const [result] = await connection.query('SELECT NOW() as now');
      connection.release();
      logger.info(`Database connection successful: ${result[0].now}`);
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
          await this.pool.execute(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && !error.message.includes('Table') && !error.message.includes('exists')) {
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
      const [result] = await this.pool.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [process.env.DB_NAME || 'voxassist']);
      
      const existingTables = result.map(row => row.table_name || row.TABLE_NAME);
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
      const [userCount] = await this.pool.execute('SELECT COUNT(*) as count FROM users');
      if (parseInt(userCount[0].count) > 0) {
        logger.info('Database already contains data, skipping seed');
        return;
      }

      // Insert sample data
      await this.pool.execute(`
        INSERT IGNORE INTO organizations (name, domain) VALUES 
        ('VoxAssist Demo', 'demo.voxassist.com'),
        ('Acme Corporation', 'acme.com')
      `);

      await this.pool.execute(`
        INSERT IGNORE INTO users (email, password_hash, name, role) VALUES 
        ('admin@voxassist.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin'),
        ('demo@voxassist.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', 'user')
      `);

      await this.pool.execute(`
        INSERT IGNORE INTO user_organizations (user_id, organization_id, role) VALUES 
        (1, 1, 'admin'),
        (2, 1, 'member')
      `);

      await this.pool.execute(`
        INSERT IGNORE INTO knowledge_base (organization_id, category, question, answer, keywords) VALUES 
        (1, 'billing', 'How do I view my bill?', 'You can view your bill by logging into your account and navigating to the Billing section. Your current and past bills will be displayed there.', JSON_ARRAY('bill', 'billing', 'invoice', 'payment')),
        (1, 'technical', 'My service is not working', 'I understand you''re experiencing service issues. Let me help you troubleshoot. First, please try restarting your device and checking your internet connection.', JSON_ARRAY('not working', 'broken', 'issue', 'problem')),
        (1, 'account', 'How do I reset my password?', 'To reset your password, go to the login page and click "Forgot Password". Enter your email address and you''ll receive a reset link.', JSON_ARRAY('password', 'reset', 'login', 'forgot'))
      `);

      await this.pool.execute(`
        INSERT IGNORE INTO voice_settings (organization_id, voice_id, voice_name) VALUES 
        (1, 'pNInz6obpgDQGcFmaJgB', 'Adam - Professional Male Voice')
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
