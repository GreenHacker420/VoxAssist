#!/usr/bin/env node

/**
 * Build Integration Script for Database Seeding
 * 
 * This script integrates the database seeder into the build process.
 * It runs during deployment to transfer development data to production.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  SEEDER_SCRIPT: path.join(__dirname, 'database-seeder.js'),
  BUILD_LOG: path.join(__dirname, '../logs/build-seeding.log'),
  MAX_WAIT_TIME: 300000, // 5 minutes
};

class BuildSeeder {
  constructor() {
    this.buildEnv = process.env.NODE_ENV || 'production';
    this.shouldSeed = this.shouldRunSeeding();
  }

  shouldRunSeeding() {
    // Only run seeding in production builds or when explicitly requested
    return (
      this.buildEnv === 'production' ||
      process.env.FORCE_SEEDING === 'true' ||
      process.argv.includes('--seed')
    );
  }

  async run() {
    console.log('🚀 Starting build with database seeding...');
    
    if (!this.shouldSeed) {
      console.log('⏭️  Skipping database seeding (not in production build)');
      return this.runNormalBuild();
    }

    try {
      // Step 1: Run normal build first
      console.log('📦 Running normal build process...');
      await this.runNormalBuild();
      
      // Step 2: Check if seeding is needed
      if (await this.isSeeddingAlreadyCompleted()) {
        console.log('✅ Database seeding already completed, skipping...');
        return;
      }
      
      // Step 3: Run database seeding
      console.log('🌱 Starting database seeding...');
      await this.runSeeding();
      
      console.log('🎉 Build with seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Build with seeding failed:', error.message);
      process.exit(1);
    }
  }

  async runNormalBuild() {
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build process failed with code ${code}`));
        }
      });

      buildProcess.on('error', reject);
    });
  }

  async isSeeddingAlreadyCompleted() {
    const completedFile = path.join(__dirname, '../backups/seeder-completed.flag');
    
    try {
      await fs.access(completedFile);
      return true;
    } catch {
      return false;
    }
  }

  async runSeeding() {
    const seedingArgs = [
      CONFIG.SEEDER_SCRIPT,
      `--target-env=${this.buildEnv}`
    ];

    // Add dry-run for non-production environments
    if (this.buildEnv !== 'production' && process.env.FORCE_SEEDING !== 'true') {
      seedingArgs.push('--dry-run');
    }

    return new Promise((resolve, reject) => {
      const seedProcess = spawn('node', seedingArgs, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let output = '';
      let errorOutput = '';

      seedProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text.trim());
      });

      seedProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text.trim());
      });

      seedProcess.on('close', async (code) => {
        // Save build log
        try {
          await this.saveBuildLog(output, errorOutput, code);
        } catch (logError) {
          console.warn('Failed to save build log:', logError.message);
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Seeding process failed with code ${code}`));
        }
      });

      seedProcess.on('error', reject);

      // Set timeout
      setTimeout(() => {
        seedProcess.kill('SIGTERM');
        reject(new Error('Seeding process timed out'));
      }, CONFIG.MAX_WAIT_TIME);
    });
  }

  async saveBuildLog(output, errorOutput, exitCode) {
    const logData = {
      timestamp: new Date().toISOString(),
      buildEnv: this.buildEnv,
      exitCode,
      output,
      errorOutput,
      success: exitCode === 0
    };

    // Ensure logs directory exists
    const logsDir = path.dirname(CONFIG.BUILD_LOG);
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
    }

    await fs.writeFile(CONFIG.BUILD_LOG, JSON.stringify(logData, null, 2));
  }
}

// CLI execution
if (require.main === module) {
  const buildSeeder = new BuildSeeder();
  buildSeeder.run().catch((error) => {
    console.error('Build seeding failed:', error);
    process.exit(1);
  });
}

module.exports = BuildSeeder;
