# Getting Started with Kinzen Development

Quick guide to start building your personal website features.

## 🚀 Quick Start

```bash
# Start everything
cd /Users/triok.t/kinzen/portfolio
make docker-up

# Or traditional way
make dev
```

**Access:**

- 🌐 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:3001
- 📚 API Docs: http://localhost:3001/api/v1/docs
- 🗄️ Database GUI: `make db-studio`

## 📝 What to Build First?

Based on your interests, here's the recommended order:

### Phase 1: Foundation (Already Done! ✅)

- ✅ Authentication system
- ✅ User management
- ✅ Basic infrastructure

### Phase 2: Professional Portfolio (Next Up! 🎯)

This is the easiest to start with and immediately useful.

**Backend:**

```bash
cd backend

# Generate module
npx nest g module modules/portfolio
npx nest g service modules/portfolio
npx nest g controller modules/portfolio
```

**Add to Prisma schema:**

```prisma
model Project {
  id          String   @id @default(uuid())
  userId      String
  title       String
  description String?
  imageUrl    String?
  projectUrl  String?
  githubUrl   String?
  tags        String[]
  featured    Boolean  @default(false)

  user User @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("projects")
}
```

**Run migration:**

```bash
npm run prisma:migrate:dev --name add-projects
```

**Frontend:**

```bash
# Create portfolio pages
mkdir -p frontend/src/app/portfolio
mkdir -p frontend/src/features/portfolio
```

### Phase 3: Car Collection 🚗

The fun 3D feature!

**Install Three.js:**

```bash
cd frontend
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

**Backend schema:**

```prisma
model Car {
  id              String   @id @default(uuid())
  userId          String
  make            String
  model           String
  year            Int
  modelUrl        String?  // 3D model URL
  thumbnailUrl    String?

  user User @relation(fields: [userId], references: [id])
  @@map("cars")
}
```

**3D Viewer Component:**

```typescript
// frontend/src/features/cars/components/car-3d-viewer.tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

export function Car3DViewer({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);

  return (
    <Canvas camera={{ position: [5, 5, 5] }}>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} />
      <primitive object={scene} />
      <OrbitControls />
    </Canvas>
  );
}
```

### Phase 4: Stocks Tracker 📈

Real-time financial data!

**APIs to use:**

- Alpha Vantage (free tier)
- Finnhub (free tier)
- Yahoo Finance API

**Backend:**

```bash
npm install axios # For API calls

# Add stock module
npx nest g module modules/stocks
npx nest g service modules/stocks
npx nest g controller modules/stocks
```

**Frontend charting:**

```bash
cd frontend
npm install recharts
# or
npm install lightweight-charts
```

### Phase 5: Manchester United Hub ⚽

**Football APIs:**

- Football-Data.org
- TheSportsDB
- API-Football

## 🛠️ Development Workflow

### 1. Create New Feature

**Backend (example: blog):**

```bash
cd backend

# Generate module
npx nest g module modules/blog
npx nest g service modules/blog
npx nest g controller modules/blog

# Create Clean Architecture structure
mkdir -p src/modules/blog/{domain,application,infrastructure,presentation}
mkdir -p src/modules/blog/domain/{entities,repositories}
mkdir -p src/modules/blog/application/{commands,queries,handlers}
```

**Frontend:**

```bash
cd frontend

# Create feature directory
mkdir -p src/features/blog/{api,components,hooks,types}

# Create app route
mkdir -p src/app/blog
```

### 2. Add Database Schema

Edit `backend/prisma/schema.prisma`:

```prisma
model BlogPost {
  id      String @id @default(uuid())
  title   String
  content String
  // ... more fields
  @@map("blog_posts")
}
```

Run migration:

```bash
cd backend
npm run prisma:migrate:dev --name add-blog-posts
```

### 3. Implement Feature

Follow Clean Architecture pattern:

1. **Domain**: Entities and interfaces
2. **Application**: Use cases (commands/queries)
3. **Infrastructure**: Repository implementations
4. **Presentation**: Controllers and DTOs

### 4. Test It

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## 🎨 UI Components

You already have shadcn/ui components:

```bash
cd frontend

# Add more components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
```

## 📚 Useful Commands

```bash
# Development
make dev              # Start both frontend and backend
make docker-up        # Start with Docker
make test             # Run all tests

# Database
make db-migrate       # Run migrations
make db-studio        # Open Prisma Studio GUI
make db-seed          # Seed database (create this!)

# Build
make build            # Build for production
make docker-build     # Build Docker images

# Code Quality
make lint             # Run linters
make format           # Format code
```

## 🗂️ File Structure Template

When creating a new feature, follow this structure:

```
backend/src/modules/YOUR_FEATURE/
├── domain/
│   ├── entities/
│   │   └── your-entity.entity.ts
│   └── repositories/
│       └── your.repository.interface.ts
├── application/
│   ├── commands/
│   │   └── create-item.command.ts
│   ├── queries/
│   │   └── get-item.query.ts
│   └── handlers/
│       ├── create-item.handler.ts
│       └── get-item.handler.ts
├── infrastructure/
│   └── repositories/
│       └── your.repository.ts
├── presentation/
│   ├── controllers/
│   │   └── your.controller.ts
│   └── dto/
│       ├── create-item.dto.ts
│       └── item-response.dto.ts
└── your-feature.module.ts

frontend/src/features/YOUR_FEATURE/
├── api/
│   └── your-feature.api.ts
├── components/
│   ├── item-card.tsx
│   ├── item-list.tsx
│   └── item-form.tsx
├── hooks/
│   └── use-items.ts
└── types/
    └── index.ts
```

## 🐛 Troubleshooting

### Database Issues

```bash
# Reset database (⚠️ deletes data)
cd backend
npm run prisma:migrate:reset

# Regenerate Prisma client
npm run prisma:generate
```

### Port Conflicts

```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
```

### Docker Issues

```bash
# Restart everything
make docker-down
make docker-up

# View logs
make docker-logs
```

## 📖 Learning Resources

- **NestJS**: https://docs.nestjs.com/
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Three.js**: https://threejs.org/docs/
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber/

## 🎯 Tips for Success

1. **Start Small**: Build one feature at a time
2. **Test Early**: Write tests as you go
3. **Commit Often**: Small, meaningful commits
4. **Document**: Add comments for complex logic
5. **Have Fun**: This is YOUR personal project!

## 🚀 Ready to Build?

Pick a feature from `FEATURES_ROADMAP.md` and start coding!

Remember: There's no pressure. Build what excites you when inspiration strikes. 💡

---

**Next Steps:**

1. Check `FEATURES_ROADMAP.md` for ideas
2. See `ARCHITECTURE_FOR_FEATURES.md` for structure
3. Start with Portfolio (easiest)
4. Have fun building! 🎉
