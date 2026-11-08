# L'Occhio di Ophion - Quick Reference Card

## 🎮 Project Essentials

**Name:** L'Occhio di Ophion (Omni-Engine RPG PWA)  
**Type:** Strategic Turn-Based RPG with IA-Driven Narrative  
**Location:** `f:\Google Drive\Progetti\L-Occhio-di-Ophion`  
**Status:** Phase 1 ✅ Complete | Phase 2 🚀 Ready

---

## 📊 Database Schema at a Glance

| Module | Tables | Purpose |
|--------|--------|---------|
| **Core** | users, characters, stats, resources, inventory | Character progression & equipment |
| **World** | map_nodes, hotspots, npcs, party_members | Exploration & NPC interactions |
| **Combat** | encounters, combatants, combat_log, modifiers | Turn-based combat system |
| **Quests** | quests_templates, active_quests, delegated_missions | Mission system & activities |
| **IA** | ia_prompts_cache, dialogue_log, lore_entries | Narrative engine & knowledge |

**Total:** 50+ tables | ~19,000 lines of SQL

---

## 🔑 Key Design Patterns

### 1. Entity-Component Architecture
```
character (root)
  ├─ character_stats (STR, DEX, CON, etc.)
  ├─ character_resources (gold, rations, willpower)
  ├─ character_status (health state, conditions)
  └─ inventory_slots (equipment)
```

### 2. Backend Authority
- ✅ All dice rolls on server
- ✅ Game state never trusted to client
- ✅ IA prompts injected server-side

### 3. IA Response Protocol
```json
{
  "dialogo_npc": "Dialogue text",
  "azione_di_sistema": "apri_inventario_negozio|assegna_quest|...",
  "variazione_affinita_personale": 2,
  "stato_relazione_aggiornato": "amico|amante|mercenario|..."
}
```

### 4. Dual-Mode System
- **Realismo Narrativo:** 100% IA dialogue (~500 tokens)
- **D&D 5e Puro:** Local d20 + IA narration (~30 tokens, 70% savings)

---

## 🚀 Quick Start Commands

```bash
# Setup
npm install
cp .env.example .env
# Edit .env with your database credentials

# Database
npm run db:init       # Create schema
npm run db:seed       # Seed data (TODO)
npm run db:reset      # Nuke & recreate

# Development
npm run dev           # Start with hot reload
npm start             # Production start
npm run lint          # Code quality
npm test              # Run tests
```

---

## 📁 File Organization

```
server/
├── db/
│   ├── 01_schema_core.sql     ← Characters, equipment
│   ├── 02_schema_world.sql    ← Map, NPCs, party
│   ├── 03_schema_combat.sql   ← Combat mechanics
│   ├── 04_schema_quests.sql   ← Quests, crafting
│   ├── 05_schema_ia.sql       ← IA, dialogue, lore
│   └── init.js                ← Setup script
├── api/               (TODO - endpoints)
├── services/          (TODO - business logic)
├── middleware/        (TODO - auth, validation)
└── index.js           ← Express app

docs/
├── ARCHITECTURE.md    ← Full system design (14KB)
├── API.md             ← 30+ endpoints (12KB)
└── DATABASE.md        (TODO)
```

---

## 🔗 API Quick Ref

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
```

### Characters
```
GET    /api/characters
POST   /api/characters
GET    /api/characters/:id
PATCH  /api/characters/:id
```

### World
```
GET    /api/map/nodes
GET    /api/map/nodes/:node_id
POST   /api/map/move/:node_id
```

### Dialogue
```
POST   /api/dialogue/send
POST   /api/dialogue/special_action
```

### Combat
```
POST   /api/combat/start
POST   /api/combat/action
GET    /api/combat/:encounter_id
POST   /api/combat/:encounter_id/end
```

### Inventory
```
GET    /api/inventory
POST   /api/inventory/use
POST   /api/shop/buy
POST   /api/crafting/propose
```

### Quests
```
GET    /api/quests/active
POST   /api/quests/:quest_id/complete
POST   /api/quests/delegate
```

---

## 🛠️ Technology Stack

| Layer | Tech | Notes |
|-------|------|-------|
| **Frontend** | Vue.js / React | (Phase 4) |
| **Backend** | Node.js (Express.js) | ~200 lines |
| **Database** | PostgreSQL | Entity-Component |
| **IA** | Google Gemini 2.0 | Cached prompts |
| **Auth** | JWT + bcrypt | (Phase 2) |
| **Audio** | Web Audio API | (Phase 4) |
| **Logging** | Pino | Structured logs |
| **Testing** | Vitest | (Phase 2) |

---

## 📋 Game Rules Summary

### Ability Scores (D&D 5e)
- STR, DEX, CON, INT, WIS, CHA (10 = average)
- Modifiers applied to checks

### Combat
- Initiative (d20 + DEX mod)
- Position: Melee (Avanguardia) or Ranged (Retroguardia)
- Actions: Action + Bonus Action + Movement + Reaction
- Damage: Roll + modifiers (tracked per hit type)

### Progression
- XP → Level (1-20)
- Masteries Points → Unlock skills from own class or cross-class traits
- Resources: Gold, Rations, Willpower Slots (magic)

### Magic (Willpower)
Three schools share slots:
1. **Canto di Potere** — Illusions, invisibility
2. **Magia Runica** — Crafting, enchantments
3. **Dominio e Luce Ancestrale** — Healing, commands

### NPC Relations
- Affinity: -100 to +100
- States: neutral → amico → amante | mercenario | ostile
- Decay: Affinity drops if ignored (Decadimento Relazionale)
- Max companions: 3 (player + 2 recruited)

---

## 🗂️ Database Tables (Quick Lookup)

**Characters:**
- `users` (id, username, email, password_hash)
- `characters` (id, user_id, name, race, class, level, xp, masteries_points)
- `character_stats` (STR, DEX, CON, INT, WIS, CHA, hp, ac)
- `character_resources` (gold, rations, fatigue, willpower_slots)
- `character_status` (health_state, conditions, diseases)

**World:**
- `map_nodes` (node_key, name, description, region, danger_level)
- `hotspots` (node_id, hotspot_type: npc|chest|door)
- `npcs` (hotspot_id, name, personality, initial_affinity)
- `npc_state` (npc_id, current_affinity, relationship, memories)
- `party_members` (character_id, npc_id, role)

**Items:**
- `items_base` (item_key, name, description, lore_secret, rarity)
- `equipment_stats` (damage, ac_bonus, durability)
- `crafting_ingredients` (tier, affinity, stat_boost)
- `consumables_stats` (effect, buff_duration, required_station)
- `inventory_slots` (character_id, item_id, quantity, equipped)

**Combat:**
- `encounters` (id, character_id, status, round_number)
- `encounter_combatants` (encounter_id, hp, position, initiative)
- `combat_log` (encounter_id, actor, target, d20, hit, damage)
- `combat_modifiers` (advantage, disadvantage, resistance)

**Quests:**
- `quests_templates` (quest_key, title, description, difficulty, rewards)
- `active_quests` (character_id, quest_template_id, status, deadline)
- `delegated_missions` (character_id, npc_id, status, success)
- `shop_inventory` (npc_id, item_id, quantity, price)
- `crafting_commissions` (character_id, crafter_npc_id, item, materials)

**IA & Narrative:**
- `ia_prompts_cache` (prompt_hash, response_json, tokens, cost)
- `character_ia_context` (character_id, narrative_state, dialogue_history)
- `dialogue_log` (character_id, npc_id, player_input, ia_response)
- `language_glossary` (language_key, word_id, translation)
- `lore_entries` (lore_key, title, required_check)

---

## 🎯 Next Steps (Phase 2)

1. **Authentication System** (1-2 days)
   - User registration/login
   - JWT token generation
   - Password hashing

2. **Character Creation** (1-2 days)
   - Heritage/race/class selection
   - Ability score generation
   - Starting equipment

3. **Map & Exploration** (2-3 days)
   - Seed map nodes
   - Travel endpoints
   - Cost calculation

4. **NPC System** (2-3 days)
   - NPC templates
   - Affinity tracking
   - Basic dialogue

5. **Combat Engine** (3-4 days)
   - Initiative
   - Positions
   - Dice rolls & damage

---

## 📞 Common Operations

### Check Database
```bash
psql -U ophion_user -d ophion_db -c "SELECT COUNT(*) FROM characters;"
```

### View Schema
```bash
psql -U ophion_user -d ophion_db -c "\dt"
```

### Reset Everything
```bash
npm run db:reset
npm run db:init
```

### Test API
```bash
curl http://localhost:3000/api/health
```

---

## 💡 Design Principles

✅ **Modularity** — Entity-Component avoids tight coupling  
✅ **Security** — Backend authority, no client cheating  
✅ **Performance** — IA response caching, service workers  
✅ **Scalability** — Stateless API layer, denormalized views  
✅ **Narrative** — Structured dialogue, affinity tracking  
✅ **Extensibility** — Easy to add new mechanics without migrations  

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| **README.md** | Project overview |
| **PHASE_1_SUMMARY.md** | Deliverables & metrics |
| **GETTING_STARTED.md** | Setup instructions |
| **ARCHITECTURE.md** | System design deep-dive |
| **API.md** | 30+ endpoint specs |

---

**Last Updated:** 2026-11-08  
**Phase Status:** 1 ✅ | 2 🚀 | 3 🔜 | 4 🔜  
**Ready for:** Phase 2 Implementation
