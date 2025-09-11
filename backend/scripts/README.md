# VoxAssist Database Seeding System

This directory contains scripts for automatically transferring data from your local development database to production/staging environments during deployment.

## Overview

The database seeding system provides:

- **Automatic data extraction** from local SQLite/PostgreSQL development database
- **Safe data transfer** to production database with backup creation
- **Conflict resolution** and data integrity verification
- **Self-destructing script** to prevent re-execution
- **Integration with build pipelines** for seamless deployment
- **Support for multiple deployment platforms** (Render, Heroku, Vercel, Docker)

## Files

- `database-seeder.js` - Main seeding script with full functionality
- `build-with-seeding.js` - Build integration script
- `deploy-with-seeding.sh` - Deployment script for various platforms
- `seeding-config.json` - Configuration file for seeding behavior
- `README.md` - This documentation file

## Quick Start

### 1. Basic Usage

```bash
# Dry run to see what would be seeded
npm run db:seed:dry-run

# Seed to production
npm run db:seed:production

# Seed to staging
npm run db:seed:staging

# Force seeding even if already completed
node scripts/database-seeder.js --force
```

### 2. Build Integration

The seeding system automatically integrates with your build process:

```bash
# Build with automatic seeding (production only)
npm run build

# Build without seeding
npm run build:simple
```

### 3. Deployment Integration

```bash
# Deploy to Render with seeding
npm run deploy:render

# Deploy to Heroku with seeding
npm run deploy:heroku

# Deploy with Docker
npm run deploy:docker

# Manual deployment
./scripts/deploy-with-seeding.sh --platform=manual
```

## Environment Variables

Set these environment variables for proper operation:

```bash
# Source database (your local development database)
SOURCE_DATABASE_URL="postgresql://user:pass@localhost:5432/voxassist_dev"

# Target database (production/staging database)
TARGET_DATABASE_URL="postgresql://user:pass@prod-host:5432/voxassist_prod"

# Force seeding even if already completed
FORCE_SEEDING="true"

# Node environment
NODE_ENV="production"
```

## Configuration

Edit `seeding-config.json` to customize seeding behavior:

```json
{
  "environments": {
    "production": {
      "enabled": true,
      "dryRun": false,
      "autoBackup": true,
      "batchSize": 100
    }
  },
  "models": {
    "excludeFromSeeding": ["auditLog", "securityIncident"]
  }
}
```

## Command Line Options

### database-seeder.js

```bash
node scripts/database-seeder.js [options]

Options:
  --target-env=ENV    Target environment (production|staging) [default: production]
  --dry-run          Simulate seeding without making changes
  --force            Force execution even if already completed
  --help, -h         Show help message
```

### deploy-with-seeding.sh

```bash
./scripts/deploy-with-seeding.sh [options]

Options:
  --env=ENV           Target environment (production|staging) [default: production]
  --platform=PLATFORM Deployment platform (render|heroku|vercel|docker|manual)
  --dry-run          Simulate deployment without making changes
  --force-seeding    Force database seeding even if already completed
  --skip-seeding     Skip database seeding entirely
  --help             Show help message
```

## How It Works

### 1. Data Extraction
- Connects to your local development database
- Extracts all data in dependency order (respecting foreign keys)
- Validates data integrity and structure

### 2. Backup Creation
- Creates a complete backup of the target database before seeding
- Stores backups in `backend/backups/` directory
- Enables rollback in case of seeding failure

### 3. Data Transfer
- Processes data in configurable batches
- Handles conflicts using upsert operations
- Maintains referential integrity

### 4. Verification
- Compares source and target record counts
- Validates data integrity after transfer
- Generates detailed execution reports

### 5. Self-Destruction
- Automatically deletes the seeding script after successful execution
- Creates a completion flag to prevent re-execution
- Maintains backup copy of the script for reference

## Safety Features

### Automatic Backups
- Full database backup before seeding
- Automatic restoration on failure
- Configurable backup retention

### Conflict Resolution
- Intelligent upsert operations
- Unique constraint handling
- Data validation and sanitization

### Error Handling
- Comprehensive error logging
- Graceful failure recovery
- Detailed execution reports

### Dry Run Mode
- Test seeding without making changes
- Validate data and configuration
- Preview what would be transferred

## Deployment Platform Integration

### Render
```bash
# Automatic integration via build script
npm run deploy:render
```

### Heroku
```bash
# Deploy with Heroku CLI integration
npm run deploy:heroku
```

### Docker
```bash
# Build and run with Docker
npm run deploy:docker
```

### Manual/Custom
```bash
# For custom deployment setups
./scripts/deploy-with-seeding.sh --platform=manual
```

## Troubleshooting

### Common Issues

1. **"Seeding already completed"**
   ```bash
   # Use force flag to override
   node scripts/database-seeder.js --force
   ```

2. **Database connection errors**
   ```bash
   # Check environment variables
   echo $SOURCE_DATABASE_URL
   echo $TARGET_DATABASE_URL
   ```

3. **Permission errors**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   chmod +x scripts/*.js
   ```

### Logs and Reports

- Execution logs: `backend/logs/seeder.log`
- Error logs: `backend/logs/seeder-error.log`
- Execution reports: `backend/logs/seeding-report-*.json`
- Build logs: `backend/logs/build-seeding.log`

### Recovery

If seeding fails, the system will automatically attempt to restore from backup:

```bash
# Manual restoration (if needed)
node scripts/database-seeder.js --restore-from-backup=backup-file.json
```

## Best Practices

1. **Always test with dry run first**
   ```bash
   npm run db:seed:dry-run
   ```

2. **Backup your production database separately**
   ```bash
   # Create manual backup before first seeding
   pg_dump $TARGET_DATABASE_URL > manual-backup.sql
   ```

3. **Monitor seeding logs**
   ```bash
   tail -f backend/logs/seeder.log
   ```

4. **Use staging environment for testing**
   ```bash
   npm run db:seed:staging
   ```

5. **Keep seeding scripts in version control**
   - Scripts are automatically backed up before self-destruction
   - Maintain copies for debugging and reference

## Support

For issues or questions:
1. Check the logs in `backend/logs/`
2. Review the execution reports
3. Use dry-run mode to debug issues
4. Check environment variable configuration
