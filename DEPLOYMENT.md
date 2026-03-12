# Elite Jarvis Dashboard - Deployment Guide

## Quick Deployment to Vercel

This application is built with Next.js 14 and is ready for production deployment on Vercel.

### Option 1: Deploy via CLI

```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Navigate to project directory
cd elitejarvis-nextjs

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy via GitHub

1. Push this repository to GitHub
2. Visit https://vercel.com/new
3. Import your GitHub repository
4. Vercel will auto-detect Next.js configuration
5. Click "Deploy"

### Environment Variables

Set these on Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_API_URL` - API endpoint (defaults to your Vercel URL)

### Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000 in your browser.

## Dashboard Features

### 🎯 Pages
- **Dashboard** - Real-time metrics, task queue, agent status overview
- **Agents** - Agent cards with status, uptime, and action buttons
- **Tasks** - Task templates, recurring jobs, and task history
- **Chat** - Real-time messaging interface for agent communication
- **Settings** - Configuration and preferences

### 📊 Real-Time Features
- Live metrics updating every 10 seconds
- Task queue monitoring
- Agent status tracking
- System uptime monitoring

### 🎨 UI/UX
- Dark theme with Tailwind CSS
- Responsive design (mobile-first)
- Smooth animations with Framer Motion
- shadcn/ui components
- Recharts for data visualization

## Architecture

```
app/
├── dashboard/          # Dashboard page with metrics
├── agents/             # Agents listing and management
├── tasks/              # Tasks and recurring jobs
├── chat/               # Chat interface
├── settings/           # Settings page
├── api/
│   ├── metrics/        # Metrics API
│   ├── agents/         # Agents API
│   └── tasks/          # Tasks API
├── components/         # Reusable components
│   ├── Sidebar.tsx     # Navigation sidebar
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
└── data/               # Mock data and types
```

## API Endpoints

- `GET /api/metrics` - Dashboard metrics
- `GET /api/agents` - List of agents
- `GET /api/tasks` - List of tasks
- `POST /api/chat` - Chat messages (ready for implementation)

## Production Checklist

- [x] Next.js 14 app directory
- [x] Environment variables configured
- [x] API endpoints ready
- [x] Responsive design
- [x] Dark theme
- [x] Type safety with TypeScript
- [x] Build optimization
- [ ] Database integration (connect Supabase)
- [ ] Authentication (add Auth)
- [ ] Real agent integration

## Troubleshooting

### Build fails with module not found
Ensure all imports use the correct path alias: `@/` instead of `./`

### Vercel deployment fails
Check environment variables are set in Vercel project settings.

### Port already in use
Run with a different port: `npm run dev -- -p 3001`

## Support

For issues or questions, contact the development team.
