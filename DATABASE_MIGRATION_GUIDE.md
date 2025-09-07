# VoxAssist Database Migration Guide
## MySQL → PostgreSQL + Prisma ORM

## 🎯 Migration Complete!

Your VoxAssist project has been successfully migrated from MySQL to PostgreSQL with Prisma ORM. Here's what changed and how to get started.

## 📋 What Changed

### Database Technology Stack
- ✅ **From**: MySQL 8.0 with mysql2 driver
- ✅ **To**: PostgreSQL 15+ with Prisma ORM
- ✅ **Benefits**: Better JSON support, advanced indexing, type safety, auto-generated client

### Files Updated
- `backend/package.json` - Added Prisma dependencies
- `backend/prisma/schema.prisma` - Complete database schema
- `backend/src/database/connection.js` - Updated for Prisma
- `backend/src/database/prisma.js` - New Prisma client setup
- `backend/src/database/seed.js` - Database seeding script
- `docker-compose.yml` - PostgreSQL container configuration
- Environment templates - Updated for PostgreSQL

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment

Update your `.env` file:

```env
# Replace MySQL connection with PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/voxassist?schema=public"

# Keep existing Redis and other configs
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
# ... other variables
```

### 3. Start PostgreSQL

**Option A: Using Docker Compose (Recommended)**
```bash
# From project root
docker-compose up postgres redis -d
```

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb voxassist
```

### 4. Run Database Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Apply database schema
npx prisma migrate dev --name init

# Seed with sample data
npm run db:seed
```

### 5. Start the Application

```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Prisma Commands

```bash
# Generate client after schema changes
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# View database in browser
npx prisma studio

# Reset database (development only)
npx prisma migrate reset

# Seed database
npm run db:seed
```

## 📊 Database Schema Overview

### Core Tables
- `users` - User accounts and authentication
- `organizations` - Multi-tenant organization support
- `user_organizations` - User-organization relationships
- `user_sessions` - Active user sessions

### Voice & Call Management
- `calls` - Call records and metadata
- `call_interactions` - Conversation turns and AI responses
- `voice_settings` - ElevenLabs voice configurations

### AI & Knowledge
- `knowledge_base` - AI training data and responses
- `escalation_rules` - Automated escalation logic
- `daily_analytics` - Aggregated performance metrics

### Security & Monitoring
- `security_incidents` - Security event tracking
- `audit_logs` - User action auditing

## 🔄 Migration Benefits

### Type Safety
```javascript
// Before (MySQL)
const users = await db.query('SELECT * FROM users WHERE active = ?', [true]);

// After (Prisma)
const users = await prisma.user.findMany({
  where: { active: true }
}); // Fully typed!
```

### Better Relationships
```javascript
// Get user with organizations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userOrganizations: {
      include: {
        organization: true
      }
    }
  }
});
```

### Advanced Queries
```javascript
// Complex analytics query
const analytics = await prisma.call.groupBy({
  by: ['status'],
  where: {
    startTime: {
      gte: new Date('2024-01-01')
    }
  },
  _count: {
    id: true
  },
  _avg: {
    duration: true
  }
});
```

## 🚨 Breaking Changes

### Environment Variables
- Replace `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` with single `DATABASE_URL`
- Update deployment configurations accordingly

### Query Syntax
- All database queries now use Prisma client methods
- Raw SQL queries use `prisma.$queryRaw` template literals
- Automatic parameter sanitization and type checking

### JSON Fields
- MySQL `JSON` columns → PostgreSQL `JSONB` with better performance
- Prisma provides type-safe JSON field access

## 🐳 Docker Configuration

The `docker-compose.yml` now includes:
- PostgreSQL 15 Alpine container
- Automatic health checks
- Volume persistence
- Environment variable configuration

## 📈 Performance Improvements

1. **Connection Pooling**: Prisma handles connection pooling automatically
2. **Query Optimization**: Generated queries are optimized for PostgreSQL
3. **Indexing**: All indexes preserved and optimized for PostgreSQL
4. **JSON Performance**: JSONB provides faster JSON operations

## 🔐 Security Enhancements

1. **SQL Injection Protection**: Prisma prevents SQL injection by design
2. **Type Validation**: Runtime type checking for all database operations
3. **Audit Logging**: Enhanced audit trail with structured logging

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) - Schema migrations

## 🎉 You're Ready!

Your VoxAssist project now uses PostgreSQL with Prisma ORM, providing:
- ✅ Better performance and scalability
- ✅ Type-safe database operations
- ✅ Modern ORM with excellent developer experience
- ✅ Production-ready deployment configurations
- ✅ Enhanced security and monitoring

Run `npm run dev` to start developing with your new database setup!
