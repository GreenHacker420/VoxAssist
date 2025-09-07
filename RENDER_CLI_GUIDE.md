# Render CLI Deployment Monitoring Guide

## 🚀 VoxAssist Backend Deployment Status

### ✅ Current Status
- **Backend**: Running locally on port 5005
- **Database**: PostgreSQL with Prisma ORM (migrated & seeded)
- **Render CLI**: Installed and authenticated
- **Tables Created**: All database tables exist and populated

### 🔧 Render CLI Commands

#### Authentication & Setup
```bash
# Login (already completed)
render login

# Set workspace (required before using services)
render workspace set

# List workspaces
render workspace list --output json
```

#### Service Management
```bash
# List all services
render services --output json

# View specific service details
render services --output json | jq '.[] | select(.name=="voxassist-backend")'

# View service logs
render logs --service-id <SERVICE_ID>

# View recent deployments
render deploys --service-id <SERVICE_ID> --output json
```

#### Database Management
```bash
# Connect to PostgreSQL database
render psql --database-id <DATABASE_ID>

# View database logs
render logs --database-id <DATABASE_ID>
```

#### Deployment Commands
```bash
# Trigger manual deployment
render services deploy --service-id <SERVICE_ID>

# View deployment status
render deploys --service-id <SERVICE_ID> --limit 5 --output json
```

### 📊 Monitoring Your Deployment

#### 1. Check Service Health
```bash
# Get service status
render services --output json | jq '.[] | {name: .name, status: .status, url: .url}'

# Monitor logs in real-time
render logs --service-id <SERVICE_ID> --follow
```

#### 2. Database Monitoring
```bash
# Check database status
render services --output json | jq '.[] | select(.type=="postgresql") | {name: .name, status: .status}'

# Connect to database for queries
render psql --database-id <DATABASE_ID>
```

#### 3. Environment Variables
```bash
# View service environment (sensitive data masked)
render services --output json | jq '.[] | select(.name=="voxassist-backend") | .environmentVariables'
```

### 🔍 Troubleshooting Commands

#### Common Issues
```bash
# Check recent deployment failures
render deploys --service-id <SERVICE_ID> --output json | jq '.[] | select(.status=="build_failed" or .status=="deploy_failed")'

# View build logs for failed deployment
render logs --deploy-id <DEPLOY_ID>

# Restart service
render restart --service-id <SERVICE_ID>
```

#### Database Issues
```bash
# Check database connections
render logs --database-id <DATABASE_ID> | grep -i "connection"

# Run Prisma migrations on production
# (Add to your render.yaml build command)
npx prisma migrate deploy
```

### 📈 Production Deployment Checklist

#### Before Deploying
- [ ] Update environment variables in Render dashboard
- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL` with production PostgreSQL
- [ ] Set up Redis URL for caching
- [ ] Add all API keys (Gemini, ElevenLabs, Twilio)

#### After Deploying
```bash
# Verify deployment
render services --output json | jq '.[] | select(.name=="voxassist-backend") | {status: .status, url: .url}'

# Check health endpoint
curl https://your-service-url.onrender.com/health

# Monitor startup logs
render logs --service-id <SERVICE_ID> --tail 100
```

### 🎯 Next Steps for Production

1. **Deploy to Render**:
   ```bash
   git push origin main  # Triggers auto-deploy if connected
   ```

2. **Monitor Deployment**:
   ```bash
   render deploys --service-id <SERVICE_ID> --output json
   ```

3. **Verify Health**:
   ```bash
   curl https://your-backend-url.onrender.com/health
   ```

4. **Run Production Migrations**:
   ```bash
   # These run automatically via package.json build script
   npx prisma generate
   npx prisma migrate deploy
   ```

### 🔗 Useful Render Dashboard URLs

- **Services**: https://dashboard.render.com/
- **Logs**: https://dashboard.render.com/web/[SERVICE_ID]/logs
- **Environment**: https://dashboard.render.com/web/[SERVICE_ID]/env-vars
- **Deployments**: https://dashboard.render.com/web/[SERVICE_ID]/deploys

### 📝 Notes

- Your backend is ready for production deployment
- All Prisma migrations are configured to run automatically
- Database is seeded with initial data
- Health monitoring is active and working
- Redis warning is non-critical (caching will be disabled)

Use `render workspace set` to configure your workspace, then start monitoring your deployments!
