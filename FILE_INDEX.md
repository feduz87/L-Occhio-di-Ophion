# 📖 L'Occhio di Ophion - File Index & Navigation

## 🏠 Root Level Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| **README.md** | Project overview, links, quick links | 2 min |
| **QUICK_REFERENCE.md** | One-page cheat sheet for developers | 5 min |
| **PHASE_1_SUMMARY.md** | Completion summary, metrics, roadmap | 10 min |
| **GETTING_STARTED.md** | Setup guide, debugging, troubleshooting | 15 min |
| **.env.example** | Environment variables template | 1 min |
| **.gitignore** | Git exclusions (Node.js + PostgreSQL) | - |
| **package.json** | Dependencies, npm scripts | 2 min |

---

## 📁 Backend Code

### `server/index.js` (Express App Entry Point)
- **Lines:** 133
- **Purpose:** Express server setup, middleware, health check
- **Key Functions:**
  - Database connection pooling
  - CORS & Helmet security
  - Request logging (Pino)
  - Health endpoint: `GET /api/health`
- **Next:** Implement routes in `server/api/`

### `server/db/` (Database Layer)

| File | Lines | Purpose |
|------|-------|---------|
| **01_schema_core.sql** | 4,719 | Users, characters, stats, inventory |
| **02_schema_world.sql** | 4,476 | Map, NPCs, party system |
| **03_schema_combat.sql** | 3,905 | Combat encounters, combatants, log |
| **04_schema_quests.sql** | 5,406 | Quests, crafting, shop, time |
| **05_schema_ia.sql** | 4,786 | IA caching, dialogue, lore |
| **init.js** | 50 | Automated schema initialization |

**Total Schema:** ~23,300 lines  
**Total Tables:** 50+

### `server/api/` (API Endpoints)

| File | Purpose | Status |
|------|---------|--------|
| **auth.js** | Registration, login, user endpoints | ✅ DONE |
| **characters.js** | Character CRUD operations | ✅ DONE |
| **game.js** | World/exploration | 🔜 TODO |
| **dialogue.js** | NPC conversations | 🔜 TODO |
| **combat.js** | Combat endpoints | 🔜 TODO |
| **quests.js** | Quest system | 🔜 TODO |

### `server/services/` (Business Logic)

| File | Purpose | Status |
|------|---------|--------|
| **auth.js** | User registration, login, JWT generation | ✅ DONE |
| **character.js** | Character creation, ability scores, equipment | ✅ DONE |
| **combat.js** | Combat engine | 🔜 TODO |
| **quest.js** | Quest generation | 🔜 TODO |
| **ia.js** | Gemini API integration | 🔜 TODO |
| **game_time.js** | World clock | 🔜 TODO |

### `server/middleware/` (Middleware)

| File | Purpose | Status |
|------|---------|--------|
| **auth.js** | JWT verification, authMiddleware | ✅ DONE |
| **validation.js** | Input validation (character, UUID) | ✅ DONE |
| **error.js** | Error handling | 🔜 TODO |

### `server/models/` (Data Models - TODO)
- `database.js` — Connection pool, query helpers

---

## 📚 Frontend Code

### `client/src/` (Vue.js/React - TODO)
```
client/src/
├── components/
│   ├── CharacterCreation.vue
│   ├── MapExploration.vue
│   ├── CombatUI.vue
│   └── DialogueUI.vue
├── services/
│   └── api.js
├── stores/
│   └── gameState.js (Vuex/Pinia)
└── App.vue
```

---

## 📖 Documentation

### `docs/ARCHITECTURE.md` (14,100 characters)
**Complete system design guide covering:**

1. **System Architecture** — Layered design, Entity-Component pattern
2. **Database Schema** — Overview of all 50+ tables
3. **Game Loop & Request Flow** — How actions are resolved
4. **IA Narrative Engine** — JSON protocol, caching strategy
5. **Combat System** — D&D 5e modified, action economy
6. **Progression & Leveling** — XP, Masteries, magic
7. **NPC & Relationship System** — Affinity, party management
8. **World Clock & Time** — Game time tracking, events
9. **Dual-Mode IA/Dice System** — Token economy
10. **Developer Console** — Cheat commands
11. **API Endpoints** — List of 40+ endpoints
12. **Security & Validation** — Backend authority
13. **Performance Optimizations** — Caching, indexing
14. **Development Roadmap** — Phases 1-4

**When to Read:** Before starting any development

### `docs/API.md` (11,682 characters)
**Complete API reference with:**

- Base URL & authentication
- 30+ endpoint specifications
- Request/response examples (JSON)
- Error codes & HTTP status meanings
- Rate limiting info

**Endpoints Covered:**
- Authentication (register, login, me, logout)
- Characters (CRUD operations)
- Map/World (nodes, movement)
- Dialogue & NPCs (chat, special actions)
- Inventory (get, use consumable)
- Combat (start, action, end)
- Quests (active, complete)
- Health check

**When to Read:** When implementing endpoints or integrating API

### `docs/DATABASE.md` (TODO)
**Planned: Detailed schema documentation**
- Table-by-table breakdown
- Column definitions
- Foreign key relationships
- Index strategy
- Query examples

---

## 🗺️ Navigation Guide

### I'm a **New Developer** - Where Do I Start?

1. **README.md** (2 min) — Understand what this is
2. **QUICK_REFERENCE.md** (5 min) — Get oriented
3. **GETTING_STARTED.md** (15 min) — Set up environment
4. **ARCHITECTURE.md** (30 min) — Learn the design
5. **Start Phase 2 tasks** — Pick authentication/characters

### I'm Implementing **API Endpoints**

1. **API.md** — See endpoint specs
2. **ARCHITECTURE.md (Section 11)** — Understand API design
3. **server/db/01_schema_core.sql** — Check related tables
4. **QUICK_REFERENCE.md** — Database table quick lookup

### I'm **Debugging a Database Issue**

1. **QUICK_REFERENCE.md (Database Operations)** — Common commands
2. **server/db/01-05_schema_*.sql** — Check table definitions
3. **GETTING_STARTED.md (Debugging)** — Connection troubleshooting

### I'm **Implementing Combat**

1. **ARCHITECTURE.md (Section 4)** — Combat system design
2. **server/db/03_schema_combat.sql** — Combat tables
3. **docs/API.md (Combat endpoints)** — Expected API behavior
4. **QUICK_REFERENCE.md (Game Rules)** — D&D 5e rules

### I'm **Working on IA/Dialogue**

1. **ARCHITECTURE.md (Section 3)** — IA narrative protocol
2. **server/db/05_schema_ia.sql** — Dialogue tables
3. **docs/API.md (Dialogue)** — Dialogue endpoints
4. **QUICK_REFERENCE.md (IA Response Protocol)** — JSON format

### I Need **Project Overview for Stakeholders**

1. **README.md** — Start here
2. **PHASE_1_SUMMARY.md** — Deliverables & metrics
3. **QUICK_REFERENCE.md (Key Design Patterns)** — Architecture highlights

---

## 📊 File Statistics

```
Total Files:        16
Total Directories:  7
Total Lines:        ~2,200

Breakdown:
  SQL Schema:       ~19,000 lines (5 files)
  Documentation:    ~38,000 characters (4 files)
  Backend Code:     ~200 lines (2 files)
  Config:           ~200 lines (2 files)

Git Commits:        4
Repository Size:    ~150 KB
```

---

## 🚀 Phase-Specific Files

### Phase 1 (Complete ✅)
- All schema files (`01-05_schema_*.sql`)
- `server/index.js` (backend boilerplate)
- `package.json` (dependencies)
- All documentation files
- `.env.example`, `.gitignore`

### Phase 2 (Ready 🚀)
- **Create:** `server/api/auth.js`
- **Create:** `server/api/characters.js`
- **Create:** `server/services/auth.js`
- **Create:** `server/middleware/auth.js`
- **Create:** `server/db/seed.js` (sample data)
- **Create:** Database tests

### Phase 3
- **Create:** `server/api/combat.js`
- **Create:** `server/api/dialogue.js`
- **Create:** `server/services/ia.js` (Gemini integration)
- **Create:** `server/services/quest.js`

### Phase 4
- **Create:** `client/src/components/`
- **Create:** `client/src/services/`
- **Create:** PWA manifest
- **Update:** API endpoints for frontend

---

## 📌 Key File Relationships

```
.env.example
    └─ Configures: server/db/init.js, server/index.js

package.json
    ├─ Defines: npm run db:init, npm run dev
    └─ References: all server/ files

server/index.js
    ├─ Imports: server/db/init.js setup
    ├─ Requires: .env configuration
    └─ Serves: API routes (TODO in server/api/)

server/db/init.js
    └─ Executes: 01-05_schema_*.sql files in order

ARCHITECTURE.md
    ├─ Explains: Database schema (in sql files)
    ├─ Details: API design (described in API.md)
    └─ References: All files conceptually

API.md
    ├─ Specifies: All server/api/*.js endpoints
    └─ References: server/db schema tables

GETTING_STARTED.md
    └─ Guides: Setup for all files
```

---

## 💾 How Files Connect (Data Flow)

```
┌─────────────────┐
│  client/src/    │  (Phase 4 - frontend)
│   (Vue.js PWA)  │
└────────┬────────┘
         │ HTTP
         ▼
┌──────────────────────────────┐
│   server/index.js            │  ← Express app entry point
│   + server/api/*.js          │  ← Route handlers
│   + server/middleware/*.js   │  ← Auth, validation
└────────┬─────────────────────┘
         │ SQL queries
         ▼
┌──────────────────────────────┐
│   server/db/                 │  ← Database layer
│   └─ 01-05_schema_*.sql      │  ← 50+ tables
└──────────────────────────────┘
```

---

## 🔍 Quick Lookups

### "How do I...?"

| Question | Answer |
|----------|--------|
| ...set up the project? | `GETTING_STARTED.md` |
| ...understand the architecture? | `ARCHITECTURE.md` + `QUICK_REFERENCE.md` |
| ...implement an API endpoint? | `API.md` + `ARCHITECTURE.md` section 11 |
| ...add a new database table? | Edit relevant `01-05_schema_*.sql`, run `npm run db:reset` |
| ...understand combat system? | `ARCHITECTURE.md` section 4 + `QUICK_REFERENCE.md` game rules |
| ...integrate Gemini API? | `ARCHITECTURE.md` section 3 + Phase 3 tasks |
| ...debug a database issue? | `GETTING_STARTED.md` debugging section |
| ...see what was delivered? | `PHASE_1_SUMMARY.md` |

---

## 🎯 Next Developer Checklist

- [ ] Read **README.md** (2 min)
- [ ] Skim **QUICK_REFERENCE.md** (5 min)
- [ ] Follow **GETTING_STARTED.md** setup (30 min)
- [ ] Review **ARCHITECTURE.md** (1 hour)
- [ ] Read **API.md** endpoints (30 min)
- [ ] Check database: `npm run db:init` && verify tables
- [ ] Test health endpoint: `curl http://localhost:3000/api/health`
- [ ] Pick Phase 2 task from **PHASE_1_SUMMARY.md**
- [ ] Start coding! 🚀

---

**File Index Last Updated:** 2026-11-08  
**Project Status:** Phase 1 ✅ Complete | Phase 2 🚀 Ready  
**Total Development Time:** ~3 hours for Phase 1 foundation
