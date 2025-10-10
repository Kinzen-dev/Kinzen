# Kinzen Architecture for Multiple Features

How to structure the codebase to support multiple diverse features (portfolio, cars, stocks, football, etc.)

## 🏗️ Backend Architecture

### Module Structure (Domain-Driven Design)

Each major feature is a **Bounded Context** with its own module:

```
backend/src/modules/
├── portfolio/          # Professional portfolio
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── cars/              # Car collection & 3D models
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── car.entity.ts
│   │   │   └── car-model.entity.ts
│   │   └── repositories/
│   ├── application/
│   │   ├── commands/
│   │   │   └── add-car.handler.ts
│   │   └── queries/
│   │       └── get-car-by-id.handler.ts
│   ├── infrastructure/
│   │   └── repositories/
│   └── presentation/
│       ├── controllers/
│       │   └── cars.controller.ts
│       └── dto/
│
├── stocks/            # US stocks tracking
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── stock.entity.ts
│   │   │   ├── portfolio-holding.entity.ts
│   │   │   └── transaction.entity.ts
│   │   └── services/
│   │       └── stock-calculator.service.ts
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   └── integrations/
│   │       └── alpha-vantage.service.ts
│   ├── infrastructure/
│   └── presentation/
│
├── football/          # Manchester United hub
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── match.entity.ts
│   │   │   ├── player.entity.ts
│   │   │   └── commentary.entity.ts
│   │   └── repositories/
│   ├── application/
│   │   └── integrations/
│   │       └── football-api.service.ts
│   ├── infrastructure/
│   └── presentation/
│
├── blog/              # Personal blog
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── post.entity.ts
│   │   │   └── category.entity.ts
│   │   └── repositories/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── media/             # Shared media handling
│   ├── application/
│   │   └── upload.service.ts
│   └── presentation/
│       └── media.controller.ts
│
└── shared/            # Cross-cutting concerns
    ├── infrastructure/
    │   ├── cache/
    │   ├── storage/     # S3, file uploads
    │   └── notifications/
    └── ...
```

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma

// User (shared)
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  firstName String?
  lastName  String?
  roles     String[] @default(["user"])

  // Relations
  projects     Project[]
  cars         Car[]
  stockHoldings StockHolding[]
  blogPosts    BlogPost[]
  commentaries FootballCommentary[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

// Portfolio Module
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

// Cars Module
model Car {
  id              String   @id @default(uuid())
  userId          String
  make            String
  model           String
  year            Int
  color           String?
  vin             String?  @unique
  purchaseDate    DateTime?
  purchasePrice   Decimal?
  currentValue    Decimal?

  // 3D Model
  modelUrl        String?  // S3 URL for GLB/GLTF
  thumbnailUrl    String?

  // Details
  specifications  Json?
  story           String?  // Why I bought it

  // Relations
  user            User @relation(fields: [userId], references: [id])
  maintenanceLogs CarMaintenance[]
  photos          CarPhoto[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("cars")
}

model CarMaintenance {
  id          String   @id @default(uuid())
  carId       String
  date        DateTime
  type        String   // oil_change, tire_rotation, etc.
  description String?
  cost        Decimal?
  mileage     Int?

  car Car @relation(fields: [carId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@map("car_maintenance")
}

model CarPhoto {
  id       String @id @default(uuid())
  carId    String
  url      String
  caption  String?
  order    Int    @default(0)

  car Car @relation(fields: [carId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@map("car_photos")
}

// Stocks Module
model Stock {
  id          String   @id @default(uuid())
  symbol      String   @unique
  name        String
  exchange    String
  sector      String?
  industry    String?

  // External API cache
  lastPrice   Decimal?
  priceUpdatedAt DateTime?

  holdings StockHolding[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("stocks")
}

model StockHolding {
  id              String   @id @default(uuid())
  userId          String
  stockId         String
  shares          Decimal
  averageCost     Decimal

  user  User  @relation(fields: [userId], references: [id])
  stock Stock @relation(fields: [stockId], references: [id])

  transactions StockTransaction[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("stock_holdings")
}

model StockTransaction {
  id          String   @id @default(uuid())
  holdingId   String
  type        String   // buy, sell
  shares      Decimal
  price       Decimal
  total       Decimal
  date        DateTime
  notes       String?

  holding StockHolding @relation(fields: [holdingId], references: [id])

  createdAt DateTime @default(now())

  @@map("stock_transactions")
}

// Football Module
model FootballMatch {
  id              String   @id @default(uuid())
  homeTeam        String
  awayTeam        String
  homeScore       Int?
  awayScore       Int?
  competition     String
  matchDate       DateTime
  venue           String?

  // External API reference
  externalApiId   String?

  commentaries FootballCommentary[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("football_matches")
}

model FootballCommentary {
  id          String   @id @default(uuid())
  userId      String
  matchId     String
  title       String
  content     String
  rating      Int?     // My rating out of 10

  user  User           @relation(fields: [userId], references: [id])
  match FootballMatch  @relation(fields: [matchId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("football_commentaries")
}

// Blog Module
model BlogPost {
  id          String   @id @default(uuid())
  userId      String
  title       String
  slug        String   @unique
  content     String   // Markdown content
  excerpt     String?
  featuredImage String?
  published   Boolean  @default(false)
  publishedAt DateTime?

  // SEO
  metaTitle       String?
  metaDescription String?

  // Organization
  categoryId String?
  tags       String[]

  user     User          @relation(fields: [userId], references: [id])
  category BlogCategory? @relation(fields: [categoryId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("blog_posts")
}

model BlogCategory {
  id          String @id @default(uuid())
  name        String @unique
  slug        String @unique
  description String?

  posts BlogPost[]

  @@map("blog_categories")
}
```

## 🎨 Frontend Architecture

### Feature-Based Structure

```
frontend/src/
├── app/                      # Next.js App Router
│   ├── (home)/
│   │   └── page.tsx         # Landing page
│   │
│   ├── portfolio/
│   │   ├── page.tsx         # Portfolio list
│   │   └── [id]/
│   │       └── page.tsx     # Project detail
│   │
│   ├── cars/
│   │   ├── page.tsx         # Car gallery
│   │   └── [id]/
│   │       └── page.tsx     # Car detail with 3D viewer
│   │
│   ├── stocks/
│   │   ├── page.tsx         # Stocks dashboard
│   │   ├── portfolio/
│   │   │   └── page.tsx     # My holdings
│   │   └── [symbol]/
│   │       └── page.tsx     # Stock detail
│   │
│   ├── football/
│   │   ├── page.tsx         # Manchester United hub
│   │   ├── matches/
│   │   ├── players/
│   │   └── commentary/
│   │
│   ├── blog/
│   │   ├── page.tsx         # Blog list
│   │   └── [slug]/
│   │       └── page.tsx     # Blog post
│   │
│   └── dashboard/
│       └── page.tsx         # Personal dashboard
│
├── features/                 # Feature modules
│   ├── portfolio/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   │
│   ├── cars/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── car-card.tsx
│   │   │   ├── car-3d-viewer.tsx  # Three.js component
│   │   │   └── car-specs.tsx
│   │   ├── hooks/
│   │   │   └── use-car-3d.ts
│   │   └── types/
│   │
│   ├── stocks/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── stock-chart.tsx
│   │   │   ├── portfolio-summary.tsx
│   │   │   └── stock-card.tsx
│   │   ├── hooks/
│   │   │   └── use-stock-data.ts
│   │   └── utils/
│   │       └── calculations.ts
│   │
│   ├── football/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── match-card.tsx
│   │   │   ├── standings-table.tsx
│   │   │   └── player-stats.tsx
│   │   └── hooks/
│   │
│   └── blog/
│       ├── api/
│       ├── components/
│       │   ├── post-card.tsx
│       │   ├── markdown-renderer.tsx
│       │   └── post-editor.tsx
│       └── hooks/
│
└── shared/                   # Shared across features
    ├── components/
    │   ├── layout/
    │   │   ├── header.tsx
    │   │   ├── footer.tsx
    │   │   └── sidebar.tsx
    │   └── ui/
    ├── hooks/
    ├── lib/
    └── types/
```

## 🔌 API Design

### RESTful Endpoints by Feature

```
# Portfolio
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id

# Cars
GET    /api/v1/cars
POST   /api/v1/cars
GET    /api/v1/cars/:id
PUT    /api/v1/cars/:id
DELETE /api/v1/cars/:id
POST   /api/v1/cars/:id/photos
GET    /api/v1/cars/:id/maintenance

# Stocks
GET    /api/v1/stocks                    # All tracked stocks
GET    /api/v1/stocks/:symbol            # Stock details
GET    /api/v1/stocks/portfolio          # My holdings
POST   /api/v1/stocks/holdings           # Add holding
POST   /api/v1/stocks/transactions       # Record transaction
GET    /api/v1/stocks/portfolio/summary  # Portfolio metrics

# Football
GET    /api/v1/football/matches
GET    /api/v1/football/matches/:id
GET    /api/v1/football/standings
GET    /api/v1/football/players
POST   /api/v1/football/commentary       # My commentary
GET    /api/v1/football/commentary/:id

# Blog
GET    /api/v1/blog/posts
POST   /api/v1/blog/posts
GET    /api/v1/blog/posts/:slug
PUT    /api/v1/blog/posts/:id
DELETE /api/v1/blog/posts/:id
GET    /api/v1/blog/categories
```

## 📦 Shared Services

### Common Infrastructure

```typescript
// backend/src/shared/infrastructure/

storage/
├── storage.service.ts       # Abstract storage interface
├── s3-storage.service.ts    # AWS S3 implementation
└── local-storage.service.ts # Local filesystem (dev)

cache/
├── cache.service.ts         # Abstract cache interface
└── redis-cache.service.ts   # Redis implementation

external-apis/
├── http-client.service.ts   # Axios wrapper
└── api-rate-limiter.ts      # Rate limiting for external APIs

notifications/
├── notification.service.ts  # Email, push, etc.
└── email.service.ts         # Email implementation
```

## 🎯 Benefits of This Architecture

1. **Scalability**: Each feature can grow independently
2. **Maintainability**: Clear boundaries between features
3. **Testability**: Isolated feature testing
4. **Team-Ready**: Multiple developers can work on different features
5. **Flexibility**: Easy to add/remove features
6. **Reusability**: Shared components and services

## 🚀 Getting Started with New Features

### Adding a New Feature (e.g., "Travel Map")

1. **Backend Module**:

```bash
cd backend/src/modules
nest g module travel
nest g controller travel
nest g service travel
```

2. **Create Domain Layer**:

```
travel/
├── domain/
│   ├── entities/
│   │   └── destination.entity.ts
│   └── repositories/
│       └── destination.repository.interface.ts
```

3. **Add Prisma Schema**:

```prisma
model Destination {
  id          String   @id @default(uuid())
  userId      String
  name        String
  country     String
  latitude    Decimal
  longitude   Decimal
  visitedDate DateTime
  photos      String[]
  notes       String?

  user User @relation(fields: [userId], references: [id])

  @@map("destinations")
}
```

4. **Frontend Feature**:

```
frontend/src/features/travel/
├── api/
│   └── travel.api.ts
├── components/
│   ├── travel-map.tsx
│   └── destination-card.tsx
└── hooks/
    └── use-destinations.ts
```

5. **Add Route**:

```typescript
// frontend/src/app/travel/page.tsx
export default function TravelPage() {
  // Your travel map page
}
```

That's it! The architecture supports infinite features! 🎉
