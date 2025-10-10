# Kinzen Frontend

The user interface for Kinzen personal website - a modern, production-ready frontend built with **Next.js 15**, **TypeScript**, and **Tailwind CSS**.

## Features

- 💼 **Portfolio Showcase** - Professional work and projects
- 🚗 **3D Car Gallery** - Interactive 3D models with Three.js/React Three Fiber
- 📈 **Stocks Dashboard** - Real-time US stocks tracking with charts
- ⚽ **Manchester United Hub** - Team stats, match results, personal commentary
- 📝 **Personal Blog** - Life updates and articles
- 🎨 **Creative Gallery** - Photography and creative works

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Testing**: Vitest + Testing Library

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   ├── layout.tsx
│   └── page.tsx
├── features/               # Feature-based modules
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   └── hooks/
│   └── ...
├── shared/                 # Shared resources
│   ├── components/         # Reusable components
│   │   ├── ui/            # shadcn/ui components
│   │   └── ...
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   │   ├── api-client.ts
│   │   └── utils.ts
│   └── types/             # TypeScript types
└── config/                # Configuration
```

## 📦 Installation

```bash
# Install dependencies
npm install
```

## 🛠️ Environment Setup

Copy the environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🏃 Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Lint
npm run lint
```

Visit [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Test coverage
npm run test:coverage
```

## 🎨 UI Components

This project uses **shadcn/ui** components. All components are located in `src/shared/components/ui/`.

### Available Components:
- Button
- Card
- Input
- Label
- And more...

## 🔐 Authentication

The app includes a complete authentication flow:

1. **Register**: `/register` - Create a new account
2. **Login**: `/login` - Login with credentials
3. **Dashboard**: `/dashboard` - Protected route (requires auth)

### Authentication Flow:
- JWT tokens stored in localStorage
- Automatic token refresh on 401 errors
- Protected routes with auth state management
- Zustand for auth state persistence

## 🌐 API Integration

The app uses Axios with interceptors for API calls:

```typescript
// Example usage
import { apiClient } from '@/lib/api-client';

const response = await apiClient.get('/users');
```

Features:
- Automatic JWT token injection
- Token refresh on expiry
- Error handling
- Request/response interceptors

## 🎯 Features

- ✅ Modern UI with Tailwind CSS
- ✅ Type-safe with TypeScript
- ✅ Form validation with Zod
- ✅ State management with Zustand
- ✅ Server-side data fetching with TanStack Query
- ✅ Protected routes
- ✅ Toast notifications
- ✅ Responsive design
- ✅ Dark mode ready

## 📱 Responsive Design

The app is fully responsive and works on:
- Mobile devices (320px+)
- Tablets (768px+)
- Desktops (1024px+)
- Large screens (1440px+)

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
# Build
docker build -t kinzen-frontend .

# Run
docker run -p 3000:3000 kinzen-frontend
```

### Production Checklist
- [ ] Set environment variables
- [ ] Configure API_URL
- [ ] Enable analytics
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN
- [ ] Enable caching
- [ ] Set up monitoring

## 🛠️ Code Quality

```bash
# Format code
npm run format

# Lint
npm run lint

# Type check
npm run type-check
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query)

## 📄 License

MIT

