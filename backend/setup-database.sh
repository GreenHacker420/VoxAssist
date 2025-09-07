#!/bin/bash

# VoxAssist Database Setup Script
# This script helps set up PostgreSQL for development

set -e

echo "🎯 VoxAssist Database Setup"
echo "=========================="

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed"
    
    # Check if PostgreSQL service is running
    if pg_isready &> /dev/null; then
        echo "✅ PostgreSQL service is running"
    else
        echo "⚠️  PostgreSQL service is not running"
        echo "Starting PostgreSQL service..."
        
        # Try to start PostgreSQL (macOS with Homebrew)
        if command -v brew &> /dev/null; then
            brew services start postgresql@15 || brew services start postgresql
        else
            echo "Please start PostgreSQL manually"
            exit 1
        fi
    fi
    
    # Create database and user
    echo "Creating database and user..."
    
    # Create user if not exists
    psql postgres -c "CREATE USER voxassist_user WITH PASSWORD 'voxassist123';" 2>/dev/null || echo "User already exists"
    
    # Create database if not exists
    psql postgres -c "CREATE DATABASE voxassist OWNER voxassist_user;" 2>/dev/null || echo "Database already exists"
    
    # Grant privileges
    psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE voxassist TO voxassist_user;"
    
    echo "✅ Database setup complete!"
    echo ""
    echo "Database connection details:"
    echo "Host: localhost"
    echo "Port: 5432"
    echo "Database: voxassist"
    echo "User: voxassist_user"
    echo "Password: voxassist123"
    echo ""
    echo "DATABASE_URL: postgresql://voxassist_user:voxassist123@localhost:5432/voxassist?schema=public"
    
else
    echo "❌ PostgreSQL is not installed"
    echo ""
    echo "Install options:"
    echo "1. macOS (Homebrew): brew install postgresql@15"
    echo "2. Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "3. Use Docker: Install Docker and run 'docker compose up postgres -d'"
    echo "4. Use cloud database (Supabase, Neon, etc.)"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi
