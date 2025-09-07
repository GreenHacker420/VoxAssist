# VoxAssist Render Deployment Guide

## 🚀 Complete Render.com Deployment Guide

This guide walks you through deploying VoxAssist to Render.com with PostgreSQL and Redis services.

## 📋 Prerequisites

- [Render.com](https://render.com) account
- GitHub repository with VoxAssist code
- API keys for external services:
  - Google Gemini API Key
  - ElevenLabs API Key
  - Twilio Account SID and Auth Token

## 🗄️ Database Setup

### 1. Create PostgreSQL Database

1. Go to your Render Dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `voxassist-db`
   - **Database**: `voxassist`
   - **User**: `voxassist_user`
   - **Region**: Choose closest to your users
   - **Plan**: Start with **Free** (can upgrade later)
4. Click **"Create Database"**
5. Save the connection details (you'll need them later)

### 2. Database Migration with Prisma

After creating the database, you'll need to run Prisma migrations:

```bash
# Set your DATABASE_URL environment variable
export DATABASE_URL="postgresql://username:password@host:port/database"

# Generate Prisma client
npx prisma generate

# Deploy migrations to production
npx prisma migrate deploy

# Seed the database with initial data
npm run db:seed
```

### 3. Create Redis Instance

1. Click **"New +"** → **"Redis"**
2. Configure:
   - **Name**: `voxassist-redis`
   - **Region**: Same as your database
   - **Plan**: **Free** (25MB)
   - **Maxmemory Policy**: `allkeys-lru`
3. Click **"Create Redis"**

## 🔧 Backend API Deployment

### 1. Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `voxassist-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Plan**: **Free** (can upgrade later)

### 2. Environment Variables

Add these environment variables in the Render dashboard:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database (Auto-populated from PostgreSQL service)
DATABASE_URL=[Link to PostgreSQL service]

# Redis (Auto-populated from Redis service)  
REDIS_URL=[Link to Redis service]

# Security
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhook Configuration
WEBHOOK_BASE_URL=https://voxassist-backend.onrender.com

# Optional: File Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=voxassist-audio

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 3. Health Check Configuration

Render will automatically use the `/health` endpoint for health checks. No additional configuration needed.

### 4. Deploy

1. Click **"Create Web Service"**
2. Wait for the initial deployment to complete
3. Check logs for any errors

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. Environment Variables:
```env
NEXT_PUBLIC_API_URL=https://voxassist-backend.onrender.com
```

### Option 2: Render Static Site

1. Click **"New +"** → **"Static Site"**
2. Connect repository
3. Configure:
   - **Name**: `voxassist-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `out`

4. Environment Variables:
```env
NEXT_PUBLIC_API_URL=https://voxassist-backend.onrender.com
```

## 🔗 Service Linking

### Link Database to Backend

1. Go to your backend service settings
2. Under **"Environment"**, find `DATABASE_URL`
3. Click **"Link to Database"** and select your PostgreSQL service
4. Render will auto-populate the connection string

### Link Redis to Backend

1. In backend service settings
2. Find `REDIS_URL` environment variable
3. Click **"Link to Redis"** and select your Redis service

## 📞 Twilio Webhook Configuration

After deployment, configure these webhook URLs in your Twilio Console:

1. **Voice URL**: `https://voxassist-backend.onrender.com/api/voice/incoming`
2. **Status Callback**: `https://voxassist-backend.onrender.com/api/voice/call-status`
3. **Recording Status Callback**: `https://voxassist-backend.onrender.com/api/voice/recording-status`

## 🗃️ Database Initialization

### Option 1: Manual Initialization

1. Connect to your database using the connection string
2. Run the SQL schema from `backend/src/database/schema.sql`

### Option 2: Automatic Initialization

Add this to your backend's start script in `package.json`:

```json
{
  "scripts": {
    "start": "node src/database/init.js && node src/server.js"
  }
}
```

## 🔍 Monitoring & Health Checks

### Built-in Health Endpoints

- **Backend Health**: `https://voxassist-backend.onrender.com/health`
- **Frontend Health**: `https://your-frontend-url.vercel.app/api/health`

### Render Monitoring

1. Go to your service dashboard
2. Monitor:
   - **Metrics**: CPU, Memory, Response times
   - **Logs**: Real-time application logs
   - **Events**: Deployment history

### Custom Alerts

Set up alerts in Render:
1. Go to service settings
2. **"Notifications"** tab
3. Configure email/Slack alerts for:
   - Service failures
   - High error rates
   - Performance issues

## 🔐 Security Best Practices

### Environment Variables

- ✅ Never commit API keys to Git
- ✅ Use Render's environment variable encryption
- ✅ Rotate secrets regularly
- ✅ Use different keys for staging/production

### Database Security

- ✅ Enable SSL connections (default on Render)
- ✅ Use strong passwords
- ✅ Limit database access to your services only
- ✅ Regular backups (automatic on Render)

### API Security

- ✅ Rate limiting enabled
- ✅ CORS configured properly
- ✅ Security headers implemented
- ✅ Input validation and sanitization

## 📊 Performance Optimization

### Backend Optimization

1. **Enable Compression**: Already configured in your app
2. **Database Indexing**: Ensure proper indexes on frequently queried columns
3. **Redis Caching**: Implement caching for expensive operations
4. **Connection Pooling**: Configure appropriate pool sizes

### Frontend Optimization

1. **Static Generation**: Use Next.js ISR where possible
2. **Image Optimization**: Use Next.js Image component
3. **Bundle Analysis**: Monitor bundle size
4. **CDN**: Vercel provides global CDN automatically

## 🚨 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check build logs in Render dashboard
# Ensure all dependencies are in package.json
# Verify Node.js version compatibility
```

**Database Connection Issues**
```bash
# Verify DATABASE_URL is correctly linked
# Check database service status
# Ensure SSL is enabled in connection string
```

**Environment Variable Issues**
```bash
# Double-check all required variables are set
# Verify no typos in variable names
# Check for special characters that need escaping
```

**Webhook Issues**
```bash
# Ensure webhook URLs are publicly accessible
# Check SSL certificate validity
# Verify webhook signature validation
```

### Performance Issues

**High Response Times**
- Check database query performance
- Monitor memory usage
- Consider upgrading to paid plan
- Implement caching strategies

**Memory Issues**
- Monitor heap usage in logs
- Check for memory leaks
- Consider upgrading plan
- Optimize data structures

## 💰 Cost Optimization

### Free Tier Limits

- **Web Service**: 750 hours/month
- **PostgreSQL**: 1GB storage, 1 month retention
- **Redis**: 25MB memory
- **Bandwidth**: 100GB/month

### Scaling Strategy

1. **Start Free**: Use free tier for development/testing
2. **Monitor Usage**: Track metrics and costs
3. **Upgrade Gradually**: Scale services as needed
4. **Optimize First**: Before upgrading, optimize code and queries

### Cost-Effective Tips

- Use Redis for session storage only
- Implement efficient database queries
- Use CDN for static assets
- Monitor and optimize API usage

## 🔄 Continuous Deployment

### Auto-Deploy Setup

1. In service settings, enable **"Auto-Deploy"**
2. Choose branch (usually `main`)
3. Every push triggers automatic deployment
4. Monitor deployment status in dashboard

### Deployment Hooks

Add deployment hooks in `render.yaml`:

```yaml
services:
  - type: web
    name: voxassist-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    preDeployCommand: npm run db:migrate
```

## 📈 Scaling Considerations

### Horizontal Scaling

- Use Render's load balancing
- Implement stateless architecture
- Use Redis for shared state
- Consider microservices architecture

### Database Scaling

- Monitor connection pool usage
- Implement read replicas if needed
- Consider database sharding for high volume
- Use connection pooling

## 🎯 Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] SSL certificates configured
- [ ] Webhook URLs updated in Twilio
- [ ] Health checks responding
- [ ] Monitoring alerts configured

### Post-Deployment

- [ ] Test all API endpoints
- [ ] Verify webhook functionality
- [ ] Check real-time features
- [ ] Monitor error rates
- [ ] Test voice call flow
- [ ] Verify analytics dashboard

### Ongoing Maintenance

- [ ] Monitor service health daily
- [ ] Review error logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate API keys quarterly
- [ ] Review performance metrics
- [ ] Backup verification

## 📞 Support & Resources

### Render Resources

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status Page](https://status.render.com)

### VoxAssist Resources

- Check service logs: Render Dashboard → Service → Logs
- Monitor metrics: Dashboard → Analytics
- Health status: `/health` endpoints
- Real-time debugging: Browser console for Socket.IO events

---

## 🎉 Deployment Complete!

Your VoxAssist application is now deployed on Render! 

**Access URLs:**
- **Backend API**: `https://voxassist-backend.onrender.com`
- **Frontend**: `https://your-frontend-url.vercel.app`
- **Health Check**: `https://voxassist-backend.onrender.com/health`

**Next Steps:**
1. Test the complete voice call flow
2. Monitor performance and errors
3. Set up monitoring alerts
4. Plan for scaling as usage grows

🚀 **VoxAssist is now live and ready to handle customer calls!**
