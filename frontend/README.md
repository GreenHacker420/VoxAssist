# VoxAssist Frontend

> Production-ready Next.js frontend for the VoxAssist AI voice calling platform. Built with TypeScript, Tailwind CSS, and modern React patterns.

## Features

- 🔐 **Authentication System** - Complete login/register with JWT handling
- 📊 **Analytics Dashboard** - Real-time metrics and performance insights
- 📞 **Call Management** - Monitor and manage voice calls
- 👥 **Contact Management** - CRM integration and lead tracking
- 🎯 **Campaign Management** - Create and track calling campaigns
- 📝 **Script Management** - AI conversation prompts and scripts
- 🎙️ **Real-time Transcription** - Live call transcription display
- ⚙️ **Settings & Configuration** - Voice, AI, and organization settings
- 🔄 **Real-time Updates** - WebSocket integration for live data
- 📱 **Responsive Design** - Mobile-first, modern UI/UX

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Charts**: Recharts
- **Real-time**: Socket.io Client
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Authentication**: JWT with cookies
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- VoxAssist backend running on port 5000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── analytics/         # Analytics dashboard
│   ├── calls/            # Call management
│   ├── campaigns/        # Campaign management
│   ├── contacts/         # Contact/lead management
│   ├── dashboard/        # Main dashboard
│   ├── login/           # Authentication pages
│   ├── register/
│   ├── scripts/         # Script management
│   └── settings/        # Settings pages
├── components/           # Reusable components
│   ├── Layout/          # Layout components
│   ├── RealTime/        # Real-time components
│   └── ProtectedRoute.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx
├── hooks/               # Custom hooks
│   └── useSocket.ts
├── lib/                 # Utilities
│   ├── api.ts          # API client
│   └── utils.ts        # Helper functions
├── services/           # API services
│   ├── analytics.ts
│   ├── auth.ts
│   ├── calls.ts
│   └── crm.ts
└── types/              # TypeScript types
    └── index.ts
```

## API Integration

The frontend integrates with all VoxAssist backend APIs:

- **Authentication**: Login, register, profile management
- **Calls**: Call management, AI responses, transcription
- **Analytics**: Dashboard metrics, performance data
- **CRM**: Contact sync, lead management
- **Real-time**: WebSocket for live updates

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment Variables for Production

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-frontend-domain.com
```

### Deployment Platforms

- **Vercel** (Recommended): Automatic deployments from Git
- **Netlify**: Static site deployment
- **Docker**: Use included Dockerfile
- **Traditional hosting**: Build and serve static files

## Features Overview

### Authentication
- JWT-based authentication with secure cookie storage
- Protected routes with automatic redirects
- Profile management and password changes

### Dashboard
- Real-time analytics and KPIs
- Call volume and sentiment trends
- Recent activity feed
- Performance metrics

### Call Management
- Live call monitoring
- Call history and details
- Real-time transcription
- Sentiment analysis

### Analytics
- Comprehensive reporting dashboard
- Interactive charts and graphs
- Data export functionality
- Performance vs targets tracking

### Real-time Features
- Live call transcription
- Real-time notifications
- WebSocket integration
- Automatic reconnection

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Add proper error handling and loading states
4. Include responsive design considerations
5. Test with the backend API integration

## License

This project is part of the VoxAssist platform.
