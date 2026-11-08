# Getting Started - Development Setup

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 14+
- **npm** or **yarn**

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
cd "L-Occhio-di-Ophion"
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb ophion_db
createuser ophion_user -P  # Set password when prompted
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://ophion_user:ophion_password@localhost:5432/ophion_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ophion_db
DB_USER=ophion_user
DB_PASSWORD=ophion_password

NODE_ENV=development
PORT=3000
JWT_SECRET=dev_secret_key_change_in_production
```

### 4. Initialize Database Schema

```bash
npm run db:init
```

Output should show:
```
✅ 01_schema_core.sql completed
✅ 02_schema_world.sql completed
✅ 03_schema_combat.sql completed
✅ 04_schema_quests.sql completed
✅ 05_schema_ia.sql completed
✅ Database initialization successful!
```

### 5. Seed Initial Data (Items, Equipment, Consumables)

```bash
npm run db:seed
```

Output should show:
```
📋 Seeding weapons...
🛡️  Seeding armor...
🧪 Seeding consumables...
📦 Seeding ingredients...
✨ Seeding special items...
🎯 Seeding arrows...
✅ Item seeding complete!
🎉 Database seeding successful!
```

Or run both at once:
```bash
npm run db:setup
```

### 6. Start Development Server

```bash
npm run dev
```

Server should start on `http://localhost:3000`:
```
✅ Database connected: {now: ...}
🚀 Server running at http://localhost:3000
```

### 7. Test Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-11-08T23:30:00.000Z"
}
```

### 8. Test Character Creation (with Authentication)

First, register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "user_id": "uuid...",
    "username": "testplayer",
    "token": "jwt_token..."
  }
}
```

Then create a character using the token:
```bash
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Aragorn",
    "race": "Uomini",
    "heritage": "Sangue Antico",
    "class": "Guerriero"
  }'
```

Response:
```json
{
  "message": "Character created successfully",
  "character": {
    "character_id": "uuid...",
    "name": "Aragorn",
    "race": "Uomini",
    "heritage": "Sangue Antico",
    "class": "Guerriero",
    "level": 1,
    "hit_points": 12,
    "armor_class": 12,
    "stats": {
      "strength": 15,
      "dexterity": 11,
      ...
    }
  }
}
```

---

## Project Structure

```
server/
├── db/
│   ├── 01_schema_core.sql       # Characters, stats, inventory
│   ├── 02_schema_world.sql      # NPCs, map, party system
│   ├── 03_schema_combat.sql     # Combat encounters
│   ├── 04_schema_quests.sql     # Quests, missions, crafting
│   ├── 05_schema_ia.sql         # IA caching, dialogue, lore
│   ├── init.js                  # Database initializer
│   └── seed.js                  # (TODO) Sample data
├── api/
│   ├── auth.js                  # (TODO) Authentication routes
│   ├── characters.js            # (TODO) Character management
│   ├── game.js                  # (TODO) World/exploration
│   ├── dialogue.js              # (TODO) NPC conversations
│   ├── combat.js                # (TODO) Combat endpoints
│   └── quests.js                # (TODO) Quest system
├── services/
│   ├── auth.js                  # (TODO) Auth logic
│   ├── combat.js                # (TODO) Combat engine
│   ├── quest.js                 # (TODO) Quest generation
│   ├── ia.js                    # (TODO) Gemini integration
│   └── game_time.js             # (TODO) World clock
├── middleware/
│   ├── auth.js                  # (TODO) JWT verification
│   ├── validation.js            # (TODO) Input validation
│   └── error.js                 # (TODO) Error handling
├── models/
│   └── database.js              # Database connection pool
└── index.js                     # Express app entry point

docs/
├── ARCHITECTURE.md              # System design
├── API.md                       # API reference
├── DATABASE.md                  # (TODO) Schema documentation
├── CONTRIBUTING.md              # (TODO) Contribution guidelines
└── LORE.md                      # (TODO) World lore bible
```

---

## Next Steps (Phase 2)

1. **Authentication System**
   - User registration/login endpoints
   - JWT token generation and verification
   - Password hashing (bcrypt)

2. **Character Creation**
   - Character creation flow
   - Heritage/race/class selection
   - Ability score generation (4d6 drop lowest or point buy)
   - Starting equipment & gold

3. **Map & Exploration**
   - Seed map nodes (settlements, dungeons, wilderness)
   - Implement move endpoint
   - Implement travel cost calculation

4. **NPC System**
   - Create base NPC templates
   - Seed world NPCs
   - Implement NPC state machine

5. **IA Integration**
   - Gemini API wrapper
   - Prompt caching logic
   - Dialogue system

---

## Debugging

### Check Database Connection

```bash
psql -U ophion_user -d ophion_db -c "SELECT version();"
```

### View Database Schema

```bash
psql -U ophion_user -d ophion_db -c "\dt"
```

### Clear & Reinitialize Database

```bash
dropdb ophion_db
createdb ophion_db
npm run db:init
```

---

## Troubleshooting

**Error: "ECONNREFUSED"**
- PostgreSQL not running
- Check `DB_HOST`, `DB_PORT` in `.env`
- Run: `sudo systemctl start postgresql` (Linux) or check Services on Windows

**Error: "password authentication failed"**
- Wrong `DB_PASSWORD` in `.env`
- Verify user password: `psql -U ophion_user -h localhost`

**Error: "Database already exists"**
- Previous initialization left tables
- Run: `npm run db:reset` to drop and recreate

---

## IDE Setup (VS Code)

### Recommended Extensions

- **ES7+ Code Snippets** (dsznajder.es7-react-js-snippets)
- **Prettier** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **PostgreSQL** (ckolkman.vscode-postgres)
- **Thunder Client** (rangav.vscode-thunder-client) — For API testing

### Debug Configuration (.vscode/launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Server",
      "program": "${workspaceFolder}/server/index.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

---

*Last Updated: 2026-11-08*
