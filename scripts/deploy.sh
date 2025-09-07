#!/bin/bash

# VoxAssist Deployment Script
# This script helps deploy VoxAssist to various platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "All dependencies are installed."
}

# Setup environment files
setup_env() {
    print_status "Setting up environment files..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.production template..."
        cp .env.production .env
        print_warning "Please edit .env file with your actual values before deploying."
    fi
    
    if [ ! -f "frontend/.env.local" ]; then
        print_warning "Frontend .env.local not found. Creating from template..."
        cp frontend/.env.template frontend/.env.local
    fi
    
    if [ ! -f "backend/.env" ]; then
        print_warning "Backend .env not found. Creating from template..."
        cp backend/.env.template backend/.env
    fi
}

# Build and start with Docker Compose
deploy_docker() {
    print_status "Deploying with Docker Compose..."
    
    # Build images
    print_status "Building Docker images..."
    docker-compose build
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_status "✅ VoxAssist deployed successfully!"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:5000"
        print_status "Backend Health: http://localhost:5000/health"
    else
        print_error "❌ Deployment failed. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Deploy to production platforms
deploy_production() {
    print_status "Deploying to production platforms..."
    
    # Check if we're on main branch
    if [ "$(git branch --show-current)" != "main" ]; then
        print_warning "Not on main branch. Switch to main branch for production deployment."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Push to trigger CI/CD
    print_status "Pushing to main branch to trigger CI/CD..."
    git push origin main
    
    print_status "✅ Production deployment initiated!"
    print_status "Check GitHub Actions for deployment status."
}

# Main menu
show_menu() {
    echo "VoxAssist Deployment Script"
    echo "=========================="
    echo "1. Deploy locally with Docker"
    echo "2. Deploy to production (GitHub Actions)"
    echo "3. Setup environment files only"
    echo "4. Check deployment status"
    echo "5. Stop local deployment"
    echo "6. Exit"
    echo
}

# Check deployment status
check_status() {
    print_status "Checking deployment status..."
    
    if docker-compose ps | grep -q "Up"; then
        print_status "✅ Local deployment is running"
        docker-compose ps
    else
        print_warning "❌ Local deployment is not running"
    fi
    
    # Check if services are accessible
    if curl -s http://localhost:5000/health > /dev/null; then
        print_status "✅ Backend API is accessible"
    else
        print_warning "❌ Backend API is not accessible"
    fi
    
    if curl -s http://localhost:3000 > /dev/null; then
        print_status "✅ Frontend is accessible"
    else
        print_warning "❌ Frontend is not accessible"
    fi
}

# Stop local deployment
stop_deployment() {
    print_status "Stopping local deployment..."
    docker-compose down
    print_status "✅ Local deployment stopped"
}

# Main script
main() {
    while true; do
        show_menu
        read -p "Select an option (1-6): " choice
        
        case $choice in
            1)
                check_dependencies
                setup_env
                deploy_docker
                ;;
            2)
                deploy_production
                ;;
            3)
                setup_env
                print_status "✅ Environment files setup complete"
                ;;
            4)
                check_status
                ;;
            5)
                stop_deployment
                ;;
            6)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-6."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        clear
    done
}

# Run main function
main
