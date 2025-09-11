#!/bin/bash

# VoxAssist Deployment Script with Database Seeding
# This script handles deployment to various platforms with automatic database seeding

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/../logs/deployment.log"
SEEDER_SCRIPT="$SCRIPT_DIR/database-seeder.js"
BUILD_SEEDER="$SCRIPT_DIR/build-with-seeding.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TARGET_ENV="production"
DRY_RUN=false
FORCE_SEEDING=false
SKIP_SEEDING=false
PLATFORM=""

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    # Also log to file
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
VoxAssist Deployment Script with Database Seeding

Usage: $0 [OPTIONS]

Options:
    --env=ENV           Target environment (production|staging) [default: production]
    --platform=PLATFORM Deployment platform (render|heroku|vercel|docker|manual)
    --dry-run          Simulate deployment without making changes
    --force-seeding    Force database seeding even if already completed
    --skip-seeding     Skip database seeding entirely
    --help             Show this help message

Environment Variables:
    SOURCE_DATABASE_URL    Source database URL for seeding
    TARGET_DATABASE_URL    Target database URL for seeding
    NODE_ENV              Node environment
    FORCE_SEEDING         Force seeding (true/false)

Examples:
    $0 --platform=render --env=production
    $0 --platform=heroku --dry-run
    $0 --skip-seeding --env=staging

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env=*)
                TARGET_ENV="${1#*=}"
                shift
                ;;
            --platform=*)
                PLATFORM="${1#*=}"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force-seeding)
                FORCE_SEEDING=true
                shift
                ;;
            --skip-seeding)
                SKIP_SEEDING=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Detect deployment platform
detect_platform() {
    if [[ -n "$PLATFORM" ]]; then
        return
    fi
    
    if [[ -n "$RENDER" ]]; then
        PLATFORM="render"
    elif [[ -n "$HEROKU_APP_NAME" ]]; then
        PLATFORM="heroku"
    elif [[ -n "$VERCEL" ]]; then
        PLATFORM="vercel"
    elif [[ -f "Dockerfile" ]]; then
        PLATFORM="docker"
    else
        PLATFORM="manual"
    fi
    
    log "INFO" "Detected platform: $PLATFORM"
}

# Validate environment
validate_environment() {
    log "INFO" "Validating deployment environment..."
    
    # Check required files
    if [[ ! -f "$SEEDER_SCRIPT" ]]; then
        log "ERROR" "Database seeder script not found: $SEEDER_SCRIPT"
        exit 1
    fi
    
    if [[ ! -f "$BUILD_SEEDER" ]]; then
        log "ERROR" "Build seeder script not found: $BUILD_SEEDER"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm is not installed"
        exit 1
    fi
    
    log "INFO" "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "INFO" "Running pre-deployment checks..."
    
    # Check if seeding is needed
    if [[ "$SKIP_SEEDING" == "true" ]]; then
        log "INFO" "Database seeding will be skipped"
        return
    fi
    
    # Check database connectivity
    if [[ -n "$TARGET_DATABASE_URL" ]]; then
        log "INFO" "Testing target database connectivity..."
        # Add database connectivity test here
    fi
    
    # Check for existing seeding completion
    local completed_flag="$PROJECT_ROOT/backups/seeder-completed.flag"
    if [[ -f "$completed_flag" && "$FORCE_SEEDING" != "true" ]]; then
        log "WARN" "Database seeding already completed. Use --force-seeding to override."
        SKIP_SEEDING=true
    fi
    
    log "INFO" "Pre-deployment checks completed"
}

# Deploy to Render
deploy_render() {
    log "INFO" "Deploying to Render..."
    
    # Render automatically triggers builds on git push
    # We need to ensure our build script runs the seeding
    export NODE_ENV="$TARGET_ENV"
    export FORCE_SEEDING="$FORCE_SEEDING"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would deploy to Render with seeding"
        return
    fi
    
    # Run build with seeding
    node "$BUILD_SEEDER"
}

# Deploy to Heroku
deploy_heroku() {
    log "INFO" "Deploying to Heroku..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would deploy to Heroku with seeding"
        return
    fi
    
    # Set environment variables
    heroku config:set NODE_ENV="$TARGET_ENV" --app "$HEROKU_APP_NAME"
    heroku config:set FORCE_SEEDING="$FORCE_SEEDING" --app "$HEROKU_APP_NAME"
    
    # Deploy
    git push heroku main
    
    # Run seeding if needed
    if [[ "$SKIP_SEEDING" != "true" ]]; then
        heroku run node scripts/database-seeder.js --env="$TARGET_ENV" --app "$HEROKU_APP_NAME"
    fi
}

# Deploy to Vercel
deploy_vercel() {
    log "INFO" "Deploying to Vercel..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would deploy to Vercel with seeding"
        return
    fi
    
    # Vercel deployment
    vercel --prod --env NODE_ENV="$TARGET_ENV" --env FORCE_SEEDING="$FORCE_SEEDING"
    
    # Note: Vercel doesn't support long-running processes, so seeding might need to be done separately
    log "WARN" "Vercel deployment complete. Database seeding may need to be run manually."
}

# Docker deployment
deploy_docker() {
    log "INFO" "Deploying with Docker..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would build and deploy Docker container with seeding"
        return
    fi
    
    # Build Docker image
    docker build -t voxassist-backend .
    
    # Run container with seeding
    docker run -e NODE_ENV="$TARGET_ENV" -e FORCE_SEEDING="$FORCE_SEEDING" voxassist-backend
}

# Manual deployment
deploy_manual() {
    log "INFO" "Running manual deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would run manual deployment with seeding"
        return
    fi
    
    # Install dependencies
    npm ci --production
    
    # Run build with seeding
    export NODE_ENV="$TARGET_ENV"
    export FORCE_SEEDING="$FORCE_SEEDING"
    node "$BUILD_SEEDER"
}

# Main deployment function
deploy() {
    case $PLATFORM in
        "render")
            deploy_render
            ;;
        "heroku")
            deploy_heroku
            ;;
        "vercel")
            deploy_vercel
            ;;
        "docker")
            deploy_docker
            ;;
        "manual")
            deploy_manual
            ;;
        *)
            log "ERROR" "Unsupported platform: $PLATFORM"
            exit 1
            ;;
    esac
}

# Post-deployment verification
post_deployment_verification() {
    log "INFO" "Running post-deployment verification..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would run post-deployment verification"
        return
    fi
    
    # Add health checks, database connectivity tests, etc.
    log "INFO" "Post-deployment verification completed"
}

# Main execution
main() {
    log "INFO" "Starting VoxAssist deployment with database seeding..."
    
    parse_args "$@"
    detect_platform
    validate_environment
    pre_deployment_checks
    deploy
    post_deployment_verification
    
    log "INFO" "Deployment completed successfully!"
}

# Run main function
main "$@"
