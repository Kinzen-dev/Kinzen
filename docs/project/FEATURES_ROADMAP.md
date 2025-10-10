# Kinzen Features Roadmap

A living document of features to build for my personal website.

## 🎯 Core Vision

Kinzen is my personal digital universe - a place where I can build anything that comes to mind, showcase my interests, track my passions, and experiment with new technologies.

---

## 💼 Professional Portfolio (Phase 1 - Foundation)

### ✅ Completed

- [x] User authentication (JWT)
- [x] Basic user management
- [x] Health checks and API docs

### 🚧 In Progress

- [ ] Portfolio projects CRUD
- [ ] Project categories and tags
- [ ] Image upload for projects
- [ ] Project descriptions with markdown support

### 📋 Planned

- [ ] Skills matrix
- [ ] Work experience timeline
- [ ] Testimonials/recommendations
- [ ] Download CV/Resume
- [ ] Contact form

---

## 🚗 Car Collection 3D Gallery (Phase 2)

### Core Features

- [ ] **Car Model Management**

  - [ ] Upload 3D models (GLB/GLTF format)
  - [ ] Car metadata (make, model, year, specs)
  - [ ] Purchase history and documentation
  - [ ] Maintenance logs
  - [ ] Photo galleries

- [ ] **3D Viewer**

  - [ ] Interactive 3D model viewer (Three.js/React Three Fiber)
  - [ ] 360° rotation
  - [ ] Zoom and pan
  - [ ] Multiple camera angles
  - [ ] Hotspots for details
  - [ ] AR view (future)

- [ ] **Car Stories**
  - [ ] Why I bought each car
  - [ ] Modifications and upgrades
  - [ ] Road trip stories
  - [ ] Performance metrics

### Tech Stack

- **Frontend**: React Three Fiber, Three.js, @react-three/drei
- **3D Models**: Blender exports (GLB format)
- **Storage**: AWS S3 for 3D models
- **CDN**: CloudFront for fast delivery

---

## 📈 US Stocks Tracker (Phase 3)

### Core Features

- [ ] **Portfolio Management**

  - [ ] Add/remove stocks
  - [ ] Purchase price and quantity
  - [ ] Profit/loss calculations
  - [ ] Portfolio composition chart

- [ ] **Real-time Data**

  - [ ] Live stock prices (Alpha Vantage or Finnhub API)
  - [ ] Historical charts
  - [ ] Technical indicators
  - [ ] News integration

- [ ] **Analytics**

  - [ ] Performance metrics
  - [ ] Sector allocation
  - [ ] Dividend tracking
  - [ ] Tax reports

- [ ] **Research Tools**
  - [ ] Stock screener
  - [ ] Watchlist
  - [ ] Price alerts
  - [ ] Financial statements viewer

### Tech Stack

- **Data**: Alpha Vantage, Finnhub, or Yahoo Finance API
- **Charts**: Recharts or Lightweight Charts by TradingView
- **Real-time**: WebSocket for live updates
- **Caching**: Redis for rate limit management

---

## ⚽ Manchester United Hub (Phase 4)

### Core Features

- [ ] **Match Center**

  - [ ] Live match updates
  - [ ] Match results and stats
  - [ ] Season standings
  - [ ] Fixture calendar

- [ ] **Player Stats**

  - [ ] Squad overview
  - [ ] Player profiles
  - [ ] Performance statistics
  - [ ] Transfer news

- [ ] **My Commentary**

  - [ ] Match reviews
  - [ ] Season predictions
  - [ ] Player ratings
  - [ ] Tactical analysis

- [ ] **History**
  - [ ] Memorable matches
  - [ ] Legend players
  - [ ] Trophy cabinet
  - [ ] Fan journey timeline

### Tech Stack

- **Data**: Football-Data.org API or TheSportsDB
- **Real-time**: WebSocket for live scores
- **Charts**: Victory Charts for statistics

---

## 📝 Personal Blog (Phase 5)

### Core Features

- [ ] **Content Management**

  - [ ] Blog post CRUD
  - [ ] Markdown editor with preview
  - [ ] Categories and tags
  - [ ] Featured images
  - [ ] SEO optimization

- [ ] **Reader Features**

  - [ ] Search functionality
  - [ ] Comments (optional)
  - [ ] Reading time estimate
  - [ ] Related posts
  - [ ] Share on social media

- [ ] **Topics**
  - [ ] Technology and coding
  - [ ] Car ownership experiences
  - [ ] Investment insights
  - [ ] Football analysis
  - [ ] Travel and life updates

### Tech Stack

- **Editor**: MDX or Tiptap
- **Search**: Algolia or ElasticSearch
- **Comments**: Disqus or custom implementation

---

## 🎨 Creative Showcase (Phase 6)

### Core Features

- [ ] **Photography Gallery**

  - [ ] Photo albums
  - [ ] Lightbox viewer
  - [ ] EXIF data display
  - [ ] Location map integration

- [ ] **Art & Design**

  - [ ] Graphic design portfolio
  - [ ] UI/UX case studies
  - [ ] Creative experiments

- [ ] **Video Content**
  - [ ] YouTube integration
  - [ ] Video gallery
  - [ ] Playlists

### Tech Stack

- **Images**: Next.js Image optimization
- **Gallery**: PhotoSwipe or Lightbox
- **Video**: YouTube API or Vimeo

---

## 🔮 Future Ideas (Backlog)

### Advanced Features

- [ ] **Dashboard Overview**

  - [ ] Personalized homepage
  - [ ] Quick stats (stocks, visitors, etc.)
  - [ ] Recent activities
  - [ ] Quick actions

- [ ] **Analytics**

  - [ ] Visitor tracking
  - [ ] Popular content
  - [ ] User engagement metrics

- [ ] **Integrations**

  - [ ] Strava for running/cycling
  - [ ] Goodreads for books
  - [ ] Spotify for music
  - [ ] GitHub contributions

- [ ] **AI Features**

  - [ ] AI-powered content recommendations
  - [ ] Chatbot for site navigation
  - [ ] Image recognition for photo tagging

- [ ] **Mobile App**
  - [ ] React Native app
  - [ ] Push notifications
  - [ ] Offline mode

---

## 🛠️ Technical Improvements

### Performance

- [ ] Service Worker for offline support
- [ ] Image lazy loading
- [ ] Code splitting optimization
- [ ] CDN for all static assets

### SEO

- [ ] Sitemap generation
- [ ] Rich snippets
- [ ] Open Graph tags
- [ ] Schema.org markup

### Security

- [ ] 2FA authentication
- [ ] Rate limiting per feature
- [ ] Content Security Policy
- [ ] Regular security audits

### DevOps

- [ ] Monitoring dashboard
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Automated backups

---

## 📊 Priority Matrix

### High Priority (Do First)

1. ✅ Authentication & Basic Setup
2. 💼 Portfolio Projects Management
3. 📈 US Stocks Tracker (Core)
4. 🚗 Car Gallery (Basic)

### Medium Priority (Do Next)

5. ⚽ Manchester United Hub
6. 📝 Personal Blog
7. 🎨 Photography Gallery

### Low Priority (Nice to Have)

8. Advanced Analytics
9. Third-party Integrations
10. Mobile App

---

## 🎯 Current Sprint

**Focus:** Complete Professional Portfolio Foundation

- [ ] Create Projects module with Clean Architecture
- [ ] Project CRUD API endpoints
- [ ] Frontend project showcase page
- [ ] Image upload functionality
- [ ] Markdown editor for project descriptions

---

## 💡 Ideas Inbox

Random ideas that might become features:

- [ ] Workout tracker
- [ ] Recipe collection
- [ ] Travel map
- [ ] Music playlist curator
- [ ] Book reviews
- [ ] Coding challenges tracker
- [ ] Personal finance dashboard
- [ ] Goal tracking system
- [ ] Daily journal

---

**Remember:** This is MY website. Build what excites you, experiment freely, and have fun! 🚀

_Last updated: $(date)_
