# 🎙️ VoxAssist - AI Voice Support Agent

> Eliminate frustrating support experiences with a lifelike AI agent customers can talk to on the phone.

## 🚀 Features

- **AI Voice Conversations** - Natural, humanlike speech via ElevenLabs
- **Conversational Intelligence** - Powered by Gemini API for advanced query understanding
- **Real-time Dashboard** - Monitor live conversations with wave animations and sentiment analysis
- **Analytics & Insights** - Track resolution rates, call duration, and performance metrics
- **Secure & Compliant** - GDPR-compliant with encrypted data handling

## 🛠️ Tech Stack

- **Frontend:** Next.js (SSR), TailwindCSS
- **Backend:** Node.js + Express.js
- **AI:** Gemini API (reasoning), ElevenLabs (voice synthesis)
- **Telephony:** Twilio (call handling)
- **Database:** PostgreSQL + Redis
- **Auth:** Scalekit
- **Deployment:** Vercel (frontend), Render (backend)

## 🏃‍♂️ Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   # Copy and fill the environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
voxassist/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
├── docs/             # Documentation and guides
└── scripts/          # Deployment and utility scripts
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
