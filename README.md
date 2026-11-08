# L'Occhio di Ophion - RPG Engine PWA

Omni-Engine Strategic Turn-Based RPG with IA-Driven Narrative

## Project Structure

```
.
├── server/              # Node.js/Express backend
│   ├── index.js         # App entry point
│   ├── db/              # Database schemas & migrations
│   ├── api/             # API routes
│   ├── services/        # Business logic (combat, quests, IA)
│   ├── models/          # Data models
│   └── middleware/      # Auth, validation, error handling
├── client/              # Vue.js/React frontend (PWA)
│   ├── src/
│   ├── public/
│   └── vite.config.js
├── docs/                # Architecture & API documentation
├── .env.example         # Environment variables template
└── README.md
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   cp .env.example .env
   npm run db:init
   npm run db:seed
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:3000`

## Architecture

- **Frontend:** Vue.js / React (PWA with Service Workers)
- **Backend:** Node.js/Express
- **Database:** PostgreSQL with Entity-Component pattern
- **IA Engine:** Semantic caching + Google Gemini prompts
- **Audio:** Web Audio API (spatial, diegetic, dynamic layers)

## Development Guide

See `docs/ARCHITECTURE.md` for detailed system design.
See `docs/API.md` for endpoint reference.
See `docs/DATABASE.md` for schema documentation.

## License

MIT
