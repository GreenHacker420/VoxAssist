# Quick Database Setup Options

## 🚀 Option 1: Install PostgreSQL Locally (Recommended)

### macOS (Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Run our setup script
cd backend && ./setup-database.sh
```

### Alternative: Postgres.app (macOS GUI)
1. Download from https://postgresapp.com/
2. Install and start the app
3. Create database: `createdb voxassist`

## 🌐 Option 2: Use Cloud Database (Fastest)

### Supabase (Free)
1. Go to https://supabase.com/
2. Create new project
3. Copy connection string
4. Update `.env` file

### Neon (Free)
1. Go to https://neon.tech/
2. Create database
3. Copy connection string

## 🐳 Option 3: Install Docker

### macOS
```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop app
# Then run: docker compose up postgres -d
```

## ⚡ Quick Start with Cloud Database

If you want to get started immediately:

1. **Create Supabase account**: https://supabase.com/
2. **Create new project**
3. **Get connection string** from Settings → Database
4. **Update your `.env` file**:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

5. **Run migrations**:
```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## 🔧 Current Status

Your Prisma setup is ready! You just need a PostgreSQL database. Choose any option above, then run:

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
