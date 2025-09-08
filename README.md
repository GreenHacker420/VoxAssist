# 🎙️ VoxAssist - AI Voice Support Agent

> Eliminate frustrating support experiences with a lifelike AI agent customers can talk to on the phone and through embeddable voice chat widgets.

## 🚀 Enhanced Features

### 🎯 Core AI Voice Support
- **AI Voice Conversations** - Natural, humanlike speech via ElevenLabs
- **Conversational Intelligence** - Powered by Gemini API for advanced query understanding
- **Real-time Dashboard** - Monitor live conversations with wave animations and sentiment analysis
- **Analytics & Insights** - Track resolution rates, call duration, and performance metrics

### 🌐 Plug & Play Voice Chat Widget
- **Embeddable Widget** - Add voice chat to any website with a simple script tag
- **Automatic Context Extraction** - AI understands your website content using Puppeteer/Cheerio
- **Customizable Appearance** - Match your brand colors, position, and behavior
- **Real-time Audio Streaming** - WebRTC/WebSocket for seamless voice communication
- **Multi-language Support** - Serve customers in their preferred language

### 📞 Configurable Multi-Provider Calling
- **Multiple Provider Support** - Twilio, Plivo, Ringg AI, Sarvam AI
- **WhatsApp Integration** - Voice calls and messaging through WhatsApp Business API
- **Provider Switching** - Easy configuration without code changes
- **Cost Optimization** - Choose providers based on regions and pricing
- **Failover Support** - Automatic fallback to secondary providers

### 🔒 GDPR Compliance & Security
- **Data Encryption** - End-to-end encryption for all sensitive data
- **Automatic Data Retention** - Configurable retention and anonymization policies
- **Consent Management** - Built-in GDPR consent tracking and management
- **Right to be Forgotten** - Complete data deletion on user request
- **Audit Logging** - Comprehensive audit trails for compliance

## 🛠️ Enhanced Tech Stack

- **Frontend:** Next.js 15 + TailwindCSS 4 + TypeScript
- **Backend:** Node.js + Express.js + Socket.IO
- **AI Stack:** Gemini API, OpenAI Whisper (ASR), ElevenLabs (TTS)
- **Telephony:** Multi-provider (Twilio, Plivo, Ringg AI, Sarvam AI)
- **Database:** PostgreSQL + Prisma ORM + Redis
- **Auth:** Scalekit + JWT
- **Deployment:** Vercel (frontend), Render (backend)
- **Monitoring:** Real-time analytics + health monitoring

## 🏃‍♂️ Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   # Copy and fill the environment files
   cp backend/.env.template backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Configure your AI and telephony services:**
   ```bash
   # Required API keys in backend/.env
   GEMINI_API_KEY="your_gemini_api_key"
   ELEVENLABS_API_KEY="your_elevenlabs_api_key"
   OPENAI_API_KEY="your_openai_api_key"
   TWILIO_ACCOUNT_SID="your_twilio_sid"
   TWILIO_AUTH_TOKEN="your_twilio_token"
   ```

4. **Initialize the database:**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Admin Dashboard: http://localhost:3000/admin

## 🌐 Embedding the Voice Chat Widget

### Quick Embed
Add this script tag to any website to enable voice chat:

```html
<script 
  src="https://your-domain.com/widget.js" 
  data-widget-id="your-widget-id"
  data-api-url="https://your-api-domain.com"
  data-context-url="https://your-website.com"
></script>
```

### Advanced Configuration
```html
<script 
  src="https://your-domain.com/widget.js" 
  data-widget-id="your-widget-id"
  data-api-url="https://your-api-domain.com"
  data-context-url="https://your-website.com"
  data-position="bottom-right"
  data-theme="light"
  data-primary-color="#3B82F6"
  data-greeting="Hi! How can I help you today?"
></script>
```

### Widget Customization Options
- **Position**: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- **Theme**: `light`, `dark`, `auto`
- **Colors**: Custom primary and accent colors
- **Greeting**: Custom welcome message
- **Language**: Auto-detect or specify language code

## 📞 Multi-Provider Calling Setup

### Supported Providers
1. **Twilio** - Global coverage, WhatsApp support
2. **Plivo** - Cost-effective, good for high volume
3. **Ringg AI** - AI-optimized calling features
4. **Sarvam AI** - Regional optimization for India

### Provider Configuration
Configure providers through the admin dashboard at `/admin/providers`:

1. Add provider credentials
2. Test connection
3. Set as primary or backup
4. Configure WhatsApp Business API (Twilio)

## 📁 Project Structure

```
voxassist/
├── frontend/                    # Next.js frontend application
│   ├── src/app/admin/          # Admin dashboard pages
│   ├── src/components/         # Reusable UI components
│   └── src/contexts/           # React contexts
├── backend/                     # Express.js backend API
│   ├── src/controllers/        # API route handlers
│   ├── src/services/           # Business logic services
│   ├── src/middleware/         # Express middleware
│   ├── src/public/             # Static files (widget.js)
│   └── prisma/                 # Database schema and migrations
├── k8s/                        # Kubernetes deployment configs
├── scripts/                    # Deployment and utility scripts
└── docs/                       # Documentation and guides
```

## 🔧 Environment Setup

### Backend (.env)
```
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
DATABASE_URL=your_postgresql_url
REDIS_URL=your_redis_url
SCALEKIT_CLIENT_ID=your_scalekit_client_id
SCALEKIT_CLIENT_SECRET=your_scalekit_secret
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SCALEKIT_CLIENT_ID=your_scalekit_client_id
```

## 📊 Success Metrics

- ✅ 80%+ of queries resolved without human escalation
- ✅ < 2 seconds response latency
- ✅ 90% accuracy in transcription & intent recognition
- ✅ Positive feedback in post-call surveys

## 🚀 Deployment

- **Frontend:** Deploy to Vercel with automatic builds
- **Backend:** Deploy to Render with PostgreSQL and Redis add-ons
- **Database:** Use Supabase or Neon for managed PostgreSQL

## 📝 License

MIT License - see LICENSE file for details.

---

Built with ❤️ by Harsh Hirawat
