#!/usr/bin/env node

/**
 * Test Script for Database Seeding System
 * 
 * This script tests the database seeding functionality without affecting
 * production data. It creates a temporary test database and verifies
 * the seeding process works correctly.
 */

const { PrismaClient } = require('@prisma/client');
const DatabaseSeeder = require('./database-seeder');
const fs = require('fs').promises;
const path = require('path');

class SeedingTester {
  constructor() {
    this.testDbUrl = process.env.TEST_DATABASE_URL || 'file:./test-seeding.db';
    this.sourceDb = null;
    this.testDb = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async initialize() {
    console.log('🧪 Initializing seeding test environment...');
    
    // Initialize databases
    this.sourceDb = new PrismaClient();
    this.testDb = new PrismaClient({
      datasources: {
        db: {
          url: this.testDbUrl
        }
      }
    });

    await this.sourceDb.$connect();
    await this.testDb.$connect();
    
    console.log('✅ Test databases connected');
  }

  async runTests() {
    console.log('🚀 Starting database seeding tests...\n');

    const tests = [
      { name: 'Test Data Extraction', fn: () => this.testDataExtraction() },
      { name: 'Test Dry Run Mode', fn: () => this.testDryRunMode() },
      { name: 'Test Data Seeding', fn: () => this.testDataSeeding() },
      { name: 'Test Conflict Resolution', fn: () => this.testConflictResolution() },
      { name: 'Test Data Integrity', fn: () => this.testDataIntegrity() },
      { name: 'Test Backup Creation', fn: () => this.testBackupCreation() }
    ];

    for (const test of tests) {
      try {
        console.log(`🔍 Running: ${test.name}`);
        await test.fn();
        this.testResults.passed++;
        console.log(`✅ ${test.name} - PASSED\n`);
      } catch (error) {
        this.testResults.failed++;
        this.testResults.errors.push({
          test: test.name,
          error: error.message
        });
        console.log(`❌ ${test.name} - FAILED: ${error.message}\n`);
      }
    }

    this.printResults();
  }

  async testDataExtraction() {
    const seeder = new DatabaseSeeder({
      targetEnv: 'test',
      dryRun: true
    });

    // Mock the database connections
    seeder.sourceDb = this.sourceDb;
    seeder.targetDb = this.testDb;

    const data = await seeder.extractAllData(this.sourceDb);
    
    if (!data || typeof data !== 'object') {
      throw new Error('Data extraction failed - no data returned');
    }

    // Check if we have expected models
    const expectedModels = ['user', 'organization', 'widget'];
    for (const model of expectedModels) {
      if (!(model in data)) {
        throw new Error(`Missing expected model in extracted data: ${model}`);
      }
    }

    console.log(`   📊 Extracted data for ${Object.keys(data).length} models`);
  }

  async testDryRunMode() {
    const seeder = new DatabaseSeeder({
      targetEnv: 'test',
      dryRun: true
    });

    seeder.sourceDb = this.sourceDb;
    seeder.targetDb = this.testDb;

    const sourceData = await seeder.extractAllData(this.sourceDb);
    const result = await seeder.simulateSeeding(sourceData);

    if (!result.simulated) {
      throw new Error('Dry run mode did not return simulation result');
    }

    console.log('   🔍 Dry run simulation completed successfully');
  }

  async testDataSeeding() {
    // Create some test data in source
    await this.createTestData();

    const seeder = new DatabaseSeeder({
      targetEnv: 'test',
      dryRun: false
    });

    seeder.sourceDb = this.sourceDb;
    seeder.targetDb = this.testDb;

    const sourceData = await seeder.extractAllData(this.sourceDb);
    await seeder.seedData(sourceData);

    // Verify data was seeded
    const targetData = await seeder.extractAllData(this.testDb);
    
    if (targetData.user.length === 0) {
      throw new Error('No data was seeded to target database');
    }

    console.log(`   📝 Successfully seeded ${targetData.user.length} users`);
  }

  async testConflictResolution() {
    // Create duplicate data to test conflict resolution
    const testUser = {
      email: 'conflict-test@example.com',
      name: 'Conflict Test User',
      password: 'hashedpassword',
      role: 'user'
    };

    // Insert in both databases
    await this.sourceDb.user.create({ data: testUser });
    await this.testDb.user.create({ data: testUser });

    const seeder = new DatabaseSeeder({
      targetEnv: 'test',
      dryRun: false
    });

    seeder.sourceDb = this.sourceDb;
    seeder.targetDb = this.testDb;

    // This should handle the conflict gracefully
    const result = await seeder.upsertRecord('user', testUser);
    
    if (!result.updated && !result.skipped) {
      throw new Error('Conflict resolution failed');
    }

    console.log('   🔄 Conflict resolution handled successfully');
  }

  async testDataIntegrity() {
    const seeder = new DatabaseSeeder({
      targetEnv: 'test',
      dryRun: false
    });

    seeder.sourceDb = this.sourceDb;
    seeder.targetDb = this.testDb;

    const report = await seeder.verifyDataIntegrity();
    
    if (!report || !report.models) {
      throw new Error('Data integrity verification failed');
    }

    console.log(`   🔍 Verified integrity for ${Object.keys(report.models).length} models`);
  }

  async testBackupCreation() {
    const seeder = new DatabaseSeeder({
      targetEnv: 'test',
      dryRun: false
    });

    seeder.sourceDb = this.sourceDb;
    seeder.targetDb = this.testDb;

    const backupFile = await seeder.createBackup();
    
    // Check if backup file exists
    try {
      await fs.access(backupFile);
      console.log(`   💾 Backup created successfully: ${path.basename(backupFile)}`);
    } catch (error) {
      throw new Error('Backup file was not created');
    }
  }

  async createTestData() {
    // Create test organization
    const org = await this.sourceDb.organization.upsert({
      where: { name: 'Test Organization' },
      update: {},
      create: {
        name: 'Test Organization',
        domain: 'test.com'
      }
    });

    // Create test user
    await this.sourceDb.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'user'
      }
    });

    // Create test widget
    await this.sourceDb.widget.upsert({
      where: { id: 'test-widget-123' },
      update: {},
      create: {
        id: 'test-widget-123',
        organizationId: org.id,
        name: 'Test Widget',
        appearance: { theme: 'light' },
        behavior: { autoOpen: false },
        permissions: { collectPersonalData: false }
      }
    });

    console.log('   📝 Test data created in source database');
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 DATABASE SEEDING TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total:  ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }

    const success = this.testResults.failed === 0;
    console.log(`\n${success ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED'}`);
    console.log('='.repeat(50) + '\n');

    return success;
  }

  async cleanup() {
    try {
      if (this.sourceDb) {
        await this.sourceDb.$disconnect();
      }
      if (this.testDb) {
        await this.testDb.$disconnect();
      }

      // Clean up test database file
      const testDbFile = './test-seeding.db';
      try {
        await fs.unlink(testDbFile);
      } catch (error) {
        // Ignore if file doesn't exist
      }

      console.log('🧹 Test cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    const tester = new SeedingTester();
    let success = false;

    try {
      await tester.initialize();
      await tester.runTests();
      success = tester.testResults.failed === 0;
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      await tester.cleanup();
      process.exit(success ? 0 : 1);
    }
  })();
}

module.exports = SeedingTester;
