# 🎯 Strategic Development Roadmap

**Obiettivo:** Creare un percorso ottimale che massimizzi valore, qualità, e momentum di sviluppo.

**Principi:**
1. **Consolidare prima di espandere** - Fix tecnico debt in Phase 2
2. **Moduli indipendenti** - IA integration come blocco riutilizzabile
3. **Valore progressivo** - Ogni fase consegna features giocabili
4. **Evitare bottleneck** - Non lasciare dipendenze critiche per ultimo

---

## 🔄 Sequenza Ottimale (12-15 ore totali)

### Phase 2.5: Refine & Harden (2-3 ore) ✅ **START HERE**

**Obiettivo:** Consolidare fondamenta prima di espandere.

**Task:**
1. ✅ Integration tests
   - Full API flow: register → create char → get char
   - Error cases (invalid auth, duplicate names, bad data)
   - Status codes validation
   - Tempo: 45 min
   
2. ✅ Password hashing (SHA-256 → bcrypt)
   - Replace `crypto.createHash('sha256')` with bcrypt
   - Update login verification
   - Tempo: 30 min
   
3. ✅ Rate limiting
   - Implement express-rate-limit on `/auth` endpoints
   - 5 attempts per 15 minutes
   - Tempo: 20 min
   
4. ✅ Error handling improvements
   - Consistent error format (code, message, details)
   - Validation error specificity
   - Tempo: 20 min

**Deliverable:** Production-ready auth + character endpoints  
**Why:** Evita technical debt, security hardening, test coverage

**Commands:**
```bash
npm test                    # Unit tests
npm run integration-tests   # New: API integration tests
npm run lint               # Code quality
```

---

### Phase 3A: IA Integration Module (2-3 ore) ⚡ **CRITICAL PATH**

**Obiettivo:** Separare IA in modulo standalone, riutilizzabile da NPC/Combat/Narrative.

**Why Questo Step:**
- ✅ Indipendente (non dipende da map/npc)
- ✅ Riutilizzabile (usato da NPC dialoghi, combat descriptions, etc)
- ✅ Fatto ORA evita refactoring dopo
- ✅ Configurable (API key, model, prompt caching)

**Task:**
1. ✅ Gemini API wrapper service
   - `server/services/gemini.js`
   - `initializeGemini()` - Setup client + error handling
   - `generateText(prompt, context)` - Basic text generation
   - Tempo: 40 min
   
2. ✅ Prompt caching infrastructure
   - System prompt per game context (immersive RPG)
   - Token counting + cache headers
   - Fallback se API down
   - Tempo: 30 min
   
3. ✅ Configuration & secrets
   - `.env` entry: `GEMINI_API_KEY`
   - Model selection (gemini-2.0-pro-exp-12-05 or equivalent)
   - Rate limiting + quota handling
   - Tempo: 20 min
   
4. ✅ Testing harness
   - Mock Gemini responses for tests
   - Fallback text generation (non-IA)
   - Tempo: 20 min

**Deliverable:** IA service pronto per NPC dialoghi + game narrative  
**File:** `server/services/gemini.js` (~150 lines)  
**Tests:** Unit tests + integration mock

**Example:**
```javascript
// Usage in Phase 3B (NPC system)
const { generateDialogue } = require('./services/gemini');
const dialogue = await generateDialogue(npc, context);
```

---

### Phase 3B: Map Exploration System (3-4 ore)

**Obiettivo:** Creare mondo esplorabile, contesto per gameplay.

**Why Questo Step:**
- ✅ Mondo diventa reale (locations, travel, encounters)
- ✅ Non dipende da IA (base layer)
- ✅ Abilita NPC placement in Phase 3C
- ✅ Adds immersion senza dependenze complex

**Architecture:**

```
Map Nodes (settlements, dungeons, wilderness)
  ↓
Travel System (movement, time, resources)
  ↓
Encounters (random events, difficulty)
  ↓
Rest/Recovery (heal HP, restore willpower)
```

**Task:**

1. ✅ Map node seeding (server/db/seed-map.js)
   ```
   Settlements (4):
     - Port Town (coast) - trading hub
     - Mountain Keep (mountain) - dwarves
     - Forest Sanctuary (forest) - elves
     - Desert Encampment (desert) - traders
   
   Dungeons (3):
     - Crypt of Ancients (near port) - level 1-3
     - Dragon's Hoard (mountain) - level 4-6
     - Shadow Woods (forest) - level 2-4
   
   Wilderness (6):
     - Roads connecting nodes
     - Safe travel (day) vs dangerous (night)
   ```
   - Tempo: 40 min
   
2. ✅ Map node database schema (already designed in Phase 1)
   - Migrate schema if needed
   - Seed nodes
   - Tempo: 20 min
   
3. ✅ Travel endpoint
   - `POST /api/characters/:id/travel` (destination node, duration)
   - Calculate cost (gold, rations, time)
   - Rest mechanics (recover HP/willpower)
   - Tempo: 45 min
   
4. ✅ Location discovery
   - `GET /api/map/nodes` (all discovered locations)
   - `GET /api/map/nodes/:id` (location details)
   - Discover new nodes through travel/encounter
   - Tempo: 30 min
   
5. ✅ Encounter trigger system
   - Random events on travel (ambush, meeting NPC, discovery)
   - Difficulty scaling by level
   - Loot/reward assignment
   - Tempo: 30 min

**Deliverable:** Explorable world, travel system, encounter hooks  
**Files Created:** `seed-map.js`, `server/services/travel.js`, `server/api/map.js`  
**DB Changes:** Populate map-related tables (already in schema)

**Example Endpoints:**
```
GET /api/map/nodes              → All discovered locations
POST /api/characters/:id/travel → Travel to location (cost calc, encounter check)
GET /api/characters/:id/status  → Current location, travel progress
```

---

### Phase 3C: NPC System + IA Dialoghi (4-5 ore) 🎭

**Obiettivo:** Creare NPCs con dialoghi naturali (powered by Gemini).

**Why Questo Step:**
- ✅ Roleplay diventa possibile (parla con NPCs)
- ✅ IA service già ready (Phase 3A)
- ✅ Map placement ready (Phase 3B)
- ✅ Abilita quest hooks, narrative

**Architecture:**

```
NPC Templates (warrior, merchant, sage)
  ↓
Affinity Tracking (relationship + dialogue history)
  ↓
IA-Powered Dialogue (Gemini generates responses)
  ↓
Conversation Persistence (save dialogue chains)
```

**Task:**

1. ✅ NPC seeding (server/db/seed-npc.js)
   ```
   Merchants (8):
     - Armorer (items vendor)
     - Healer (potions, services)
     - Sage (information broker)
   
   Quest Givers (6):
     - Governor (protection quests)
     - Elder (discovery quests)
     - Adventurer (monster hunts)
   
   Companions (4):
     - Potential party members
     - Unique personalities
   ```
   - Tempo: 40 min

2. ✅ NPC database schema + service layer
   - `server/services/npc.js`
   - NPC creation, retrieval, affinity updates
   - Dialogue history tracking
   - Tempo: 45 min

3. ✅ IA dialogue generation
   - `generateDialogue(npc, context, playerMessage)`
   - Gemini generates response in-character
   - Affinity affects tone/content
   - Token-efficient with caching
   - Tempo: 45 min

4. ✅ Conversation endpoints
   - `POST /api/npcs/:id/talk` (send message to NPC)
   - `GET /api/npcs/:id/history` (dialogue history)
   - `PATCH /api/npcs/:id/affinity` (manual affinity mod)
   - Tempo: 30 min

5. ✅ NPC placement on map
   - Assign NPCs to locations
   - Different NPC sets per settlement
   - Quest hooks (talk to NPC → get quest)
   - Tempo: 20 min

**Deliverable:** Living world with NPCs, natural conversations, quest potential  
**Files Created:** `seed-npc.js`, `server/services/npc.js`, `server/api/npcs.js`  
**DB Changes:** Populate npc tables (already in schema)

**Example:**
```bash
# Get NPC in location
GET /api/map/nodes/port-town/npcs

# Talk to NPC
POST /api/npcs/merchant-001/talk
Body: { "message": "Do you have healing potions?" }
Response: { "npc": "merchant", "affinity": 0.5, "response": "Aye, finest potions in the realm! 15 gold each." }

# Check dialogue history
GET /api/npcs/merchant-001/history
```

---

### Phase 3D: Combat Engine (6+ hours) ⏳ **PHASE 4 if needed**

**Defer If Time Short** - Exploration + NPC + Dialogue = playable game.  
**Combat can come after** - Not critical for Phase 3 completion.

**Would Implement:**
1. Encounter initialization (enemy spawn, difficulty)
2. Initiative system (d20 + DEX modifier)
3. Turn-based action resolution (attack, spell, defend)
4. Hit/miss calculation (d20 vs AC)
5. Damage calculation (dice + modifiers)
6. Condition tracking (stunned, poisoned, etc)
7. End combat (victory/retreat/death)

**Can be Phase 3.5 or Phase 4** depending on time/complexity.

---

## 📊 Value Delivery Timeline

```
Phase 2 (DONE)
  ✅ Character creation
  ✅ Auth system
  └─→ Player has hero

Phase 2.5 (2-3h) 
  ✅ Integration tests
  ✅ Password hashing
  ✅ Rate limiting
  └─→ Production-ready backend

Phase 3A (2-3h)
  ✅ Gemini IA module
  └─→ IA service available for everything

Phase 3B (3-4h)
  ✅ Map exploration
  ✅ Travel system
  ✅ Encounters
  └─→ Player can explore world

Phase 3C (4-5h)
  ✅ NPC system
  ✅ IA dialogues
  ✅ Affinity tracking
  └─→ Player can interact with world

TOTAL: ~12-15 hours → PLAYABLE GAME with story-rich exploration
```

---

## 🎮 What Player Can Do After Each Phase

**After Phase 2:** Create hero (stats, equipment, personality)

**After Phase 2.5:** Trust auth system, no security concerns

**After Phase 3A:** (Backend only - not visible to player)

**After Phase 3B:** Explore settlements + dungeons, travel between locations, encounter random events

**After Phase 3C:** Talk to merchants/quest-givers, build relationships, receive quests, hear natural dialogue

**After Phase 3D:** Fight monsters, roll initiative, take damage, win/lose combat

---

## 🔑 Key Strategic Decisions

### 1. Why Phase 2.5 Before Phase 3?
- **Problem:** Phase 2 has technical debt (basic auth, no tests)
- **Solution:** Quick hardening pass
- **Benefit:** Solid foundation, no rework later

### 2. Why Phase 3A (IA) Before Phase 3B (Map)?
- **Problem:** NPC dialogue needs IA, but IA takes 2-3h setup
- **Solution:** Decouple early
- **Benefit:** Map is ready for NPCs immediately after Phase 3B

### 3. Why Phase 3B (Map) Before Phase 3C (NPC)?
- **Problem:** NPCs need locations
- **Solution:** Build map first
- **Benefit:** Meaningful NPC placement, world coherence

### 4. Why defer Combat?
- **Problem:** Combat is 6+ hours, complex state management
- **Solution:** Not critical for playable game
- **Benefit:** Player can explore + roleplay first, combat is bonus

---

## ✅ Success Criteria per Phase

**Phase 2.5 Complete When:**
- [ ] Integration tests passing (full auth + character flow)
- [ ] Bcrypt hashing implemented + tested
- [ ] Rate limiting active (verified with rapid requests)
- [ ] Error handling consistent across all endpoints

**Phase 3A Complete When:**
- [ ] Gemini service initialized successfully
- [ ] Sample prompt → response working
- [ ] Fallback handling tested (no API key, rate limit)
- [ ] Can call from any service

**Phase 3B Complete When:**
- [ ] Map nodes seeded (10+ locations)
- [ ] Travel endpoint working (calculate costs, update char location)
- [ ] Encounter system triggers
- [ ] Player can traverse full map

**Phase 3C Complete When:**
- [ ] NPCs seeded (20+ total)
- [ ] IA dialogue generating (natural, in-character)
- [ ] Affinity system tracking
- [ ] Quest hooks functional (talk to NPC → get objective)

---

## 🚀 Command Summary

**Phase 2.5:**
```bash
npm test                          # Unit tests
npm run integration-tests         # New: Integration tests
npm install bcrypt               # Password hashing
npm run seed                      # Refresh DB
```

**Phase 3A:**
```bash
npm install @google/generative-ai # Gemini SDK
echo GEMINI_API_KEY=... >> .env   # Add API key
npm test                          # Test gemini service
```

**Phase 3B:**
```bash
npm run db:seed:map               # Seed map nodes
npm run db:seed:encounters        # Seed encounter tables
curl -X POST .../characters/1/travel ...  # Test travel endpoint
```

**Phase 3C:**
```bash
npm run db:seed:npcs              # Seed NPCs
curl -X POST .../npcs/1/talk ...  # Test dialogue endpoint
```

---

## 📌 Bottom Line

**Percorso Ottimale:**

1. **Harden Phase 2** (2-3h) → Production-ready auth
2. **Setup IA** (2-3h) → Reusable service
3. **Build Map** (3-4h) → Explorable world
4. **Create NPCs** (4-5h) → Living, talking characters

**Result:** Playable RPG with exploration + roleplay + natural dialogue in ~12-15 hours.

**Combat:** Bonus round if time permits, not critical for Phase 3 completion.

---

**Ready to execute? Start with Phase 2.5 refine. Let's go! 🎮**
