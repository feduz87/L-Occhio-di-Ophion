# L'Occhio di Ophion - Architecture Document

## Overview

**L'Occhio di Ophion** is a full-stack RPG engine designed as a Progressive Web App (PWA) with a sophisticated narrative IA engine, Entity-Component database architecture, and turn-based combat system.

**Codename:** Progetto "L'Occhio di Ophion"  
**Genre:** Strategic Turn-Based RPG + Party Management + IA Narrative  
**Platform:** PWA (mobile-first, one-handed play)  
**Tech Stack:**
- **Frontend:** Vue.js / React (Tailwind CSS)
- **Backend:** Node.js (Express.js)
- **Database:** PostgreSQL (Entity-Component pattern)
- **IA Engine:** Google Gemini API + semantic caching
- **Audio:** Web Audio API (diegetic, spatialized, dynamic layers)

---

## 1. System Architecture

### 1.1 Layered Architecture

```
┌─────────────────────────────────────────────────┐
│         CLIENT LAYER (PWA)                       │
│  Vue.js + Tailwind CSS + Service Workers       │
│  - Character creation                           │
│  - Map exploration (node-based)                 │
│  - Combat UI (two-position: melee/ranged)      │
│  - Dialogue & NPC interaction                   │
│  - Shop & crafting interfaces                   │
└──────────────────┬──────────────────────────────┘
                   │ REST/WebSocket
┌──────────────────▼──────────────────────────────┐
│       API LAYER (Express.js)                     │
│  - Authentication & session management          │
│  - Game state validation                        │
│  - Dice rolling (backend authority)             │
│  - IA prompt injection                          │
└──────────────────┬──────────────────────────────┘
                   │ SQL
┌──────────────────▼──────────────────────────────┐
│     DATABASE LAYER (PostgreSQL)                  │
│  - Entity-Component tables                      │
│  - Audit logging                                │
│  - Denormalized views for performance           │
└──────────────────────────────────────────────────┘
```

### 1.2 Entity-Component System

Instead of rigid character classes, the database uses **Entity-Component design** where:
- **Characters** are root entities
- **Components** (tables) attach modular attributes:
  - `character_stats` → Ability scores (STR, DEX, etc.)
  - `character_resources` → Gold, rations, fatigue
  - `character_status` → Health state, conditions
  - `inventory_slots` → Equipment & items

**Benefit:** Easy to extend with new mechanics without schema reshuffling.

---

## 2. Database Schema Overview

### Core Tables

**2.1 Characters & Progression**
- `users` — Player accounts
- `characters` — Character instances (multiple per user)
- `character_stats` — Ability scores (D&D 5e)
- `character_resources` — Gold, rations, encumbrance, willpower slots
- `character_status` — Health state, conditions, diseases
- `inventory_slots` — Equipment owned by character

**2.2 World & Navigation**
- `map_nodes` — Map locations (settlement, dungeon, wilderness)
- `hotspots` — Interactable objects within nodes (NPCs, chests, doors)
- `npcs` — Non-player characters (IA-driven)
- `npc_state` — Dynamic NPC state (affinity, mood, memories)
- `party_members` — Active companions traveling with player
- `npc_inventory` — NPC equipment (privacy rule: hidden UI)

**2.3 Items & Equipment**
- `items_base` — Item definitions (name, lore, rarity)
- `equipment_stats` — Weapons/armor stats (damage, AC, durability)
- `crafting_ingredients` — Raw materials with tier/affinity
- `consumables_stats` — Potions, food, alchemicals (effects, duration)
- `loot_containers` — Chests, corpses, etc.
- `container_contents` — Items inside containers

**2.4 Combat System**
- `encounters` — Active combat instances
- `encounter_combatants` — Participants (position: melee/ranged)
- `combat_log` — Round-by-round action history
- `combat_modifiers` — Buffs, debuffs, conditions (advantage, vulnerability)
- `tactical_commands` — Party orders during combat

**2.5 Quests & Activities**
- `quests_templates` — Procedurally-generated quest definitions
- `active_quests` — Character's active missions
- `delegated_missions` — Work contracted to NPCs
- `shop_inventory` — Merchant stock
- `crafting_commissions` — NPC contracts (forge, alchemy, etc.)
- `game_time` — World clock per character
- `event_triggers` — Promises to NPCs, time-based events

**2.6 IA & Narrative**
- `ia_prompts_cache` — Cached IA responses (reduce token costs)
- `ia_system_prompts` — System-level IA instructions
- `character_ia_context` — Game state fed to IA (location, party, secrets)
- `dialogue_log` — Player-NPC conversations (training data)
- `language_glossary` — Multi-language vocabulary (Quenya, Sindarin, etc.)
- `lore_entries` — World knowledge (history, pantheon, artifacts)
- `narrative_flags` — Story state markers

---

## 3. Game Loop & Request Flow

### 3.1 Player Action → Validation → Response

```
1. Player Input (chat, button, map click)
   ↓
2. Client sends to backend (/api/actions/*)
   ↓
3. Backend validates:
   - Character state
   - Resource constraints (gold, rations, fatigue)
   - Location/hotspot validity
   - Combat initiative order
   ↓
4. Deterministic resolution:
   - Roll dice (d20) on backend
   - Apply modifiers (advantage, penalties)
   - Calculate outcome (hit/miss, damage)
   ↓
5. State update in database
   ↓
6. If dialogue needed, invoke IA with System Prompt
   ↓
7. Return JSON response to client
```

### 3.2 IA Narrative Engine Protocol

All IA responses are JSON-structured (invisible to player):

```json
{
  "dialogo_npc": "Text the NPC speaks",
  "pensiero_interno": "IA's internal reasoning (hidden)",
  "azione_di_sistema": "nessuna|apri_inventario_negozio|proponi_commissione|assegna_quest|...",
  "variazione_reputazione": 1,
  "variazione_affinita_personale": 2,
  "stato_relazione_aggiornato": "neutrale|amico|amante|mercenario|ostile"
}
```

**Caching Strategy:**
- Hash player input + NPC ID + context
- Check `ia_prompts_cache` table
- On cache miss: call Gemini API, store result, reduce tokens by ~70%

---

## 4. Combat System (D&D 5e Modified)

### 4.1 Encounter Structure

**Phase 1: Initialization**
1. Determine combatants (player party + enemies)
2. Roll initiative (d20 + DEX modifier)
3. Assign positions: Avanguardia (melee) or Retroguardia (ranged)

**Phase 2: Rounds**
- Each round: Azione Principale + Azione Bonus + Movimento + Reazione
- Turn order stored in `initiative_order` array
- Actions logged to `combat_log`

**Phase 3: Resolution**
- Encounter ends when: one side wins, party flees, or NPC dies
- Loot generated → `loot_containers` created
- XP awarded to survivors

### 4.2 Action Economy

**Per-Turn Allowances:**
- 1 Action (attack, cast spell, use item)
- 1 Bonus Action (commander can order ally)
- Movement (unlimited in zones)
- 1 Reaction (dodge, parry, counter-attack)

**Advantage/Disadvantage:**
- Roll twice, keep higher/lower
- Applied via `combat_modifiers` table
- Source tracked (spell name, ability, condition)

### 4.3 Damage & Conditions

- Damage types: slashing, piercing, bludgeoning, fire, cold, poison, necrotic
- Resistances/vulnerabilities stored per combatant
- Equipment durability decreases on critical parries
- Exhaustion stacks on long travel without rations

---

## 5. Progression & Leveling

### 5.1 Experience System

```sql
SELECT 
  level,
  experience_points,
  masteries_points
FROM characters
WHERE id = $1;
```

- **Level:** Gained at XP thresholds (1-20)
- **Masteries Points:** Spent to unlock:
  - Skills from own class tree
  - Trait bonuses from other classes (cross-classing)
  - Magic specializations

### 5.2 Magic System (Willpower Slots)

Three schools use shared **Willpower slots**:
1. **Canto di Potere** — Illusions, invisibility
2. **Magia Runica** — Crafting, weapon enchantments
3. **Dominio e Luce Ancestrale** — Healing, terror commands

- Slots refresh after rest
- Textual commands in chat can invoke spells against IA (e.g., "Parola di Comando")

---

## 6. NPC & Relationship System

### 6.1 IA-Driven Behavior

NPCs have:
- **Personality traits** (stored as JSONB)
- **Affinity score** (-100 to 100)
- **Relationship state** (neutral, amico, amante, mercenario, ostile)
- **Memory snippets** (player actions recalled)

**Privacy Rule:** Player cannot open NPC inventory UI. Must negotiate via dialogue.

### 6.2 Party Management

```
player_character (leader)
  ├── npc_recruitable_1 (amico, romance active)
  ├── npc_recruitable_2 (mercenario, contract expires in 3 days)
  └── npc_summoned (temporary, expires at end of day)
```

- Max 3 active companions
- Mercenaries abandon if payment lapses
- Affinity decays if ignored (Decadimento Relazionale flag)

---

## 7. World Clock & Time

### 7.1 Game Time Tracking

```sql
SELECT 
  current_hour, current_day, current_month, current_year,
  time_scale
FROM game_time
WHERE character_id = $1;
```

- Player promises ("Tornerò domani") are timestamped
- NPCs react to delays
- Weather, quest deadlines, NPC locations depend on time
- Traveling costs hours (Costo di Viaggio)

### 7.2 Event Triggers

`event_triggers` table stores:
- Promises to NPCs
- Random encounters
- Seasonal events
- Meteo conditions

Checked at regular intervals (every in-game hour).

---

## 8. Dual-Mode IA/Dice System

### 8.1 Realismo Narrativo (IA-Centric)

- Social checks (Persuasion, Deception) resolved **100% by IA**
- Based on player's exact wording
- Combat/traps still use d20
- **Token cost:** HIGH (~500 tokens per dialogue)

### 8.2 D&D 5e Puro (Eco-Token)

- Social checks computed locally: d20 + Charisma modifier vs. DC
- Result passed to IA ("success" or "failure")
- IA narrates outcome
- **Token cost:** LOW (~30 tokens per dialogue, 70% reduction)

**Toggle:** `DUAL_MODE_IA_ENABLED` env var

---

## 9. Developer Console & Cheats

### 9.1 Available Commands

```
godmode                              — Immunity
additem [item_id] [quantity]         — Generate items
addexp [amount]                      — Add XP
setlevel [level]                     — Force level-up
modify_affinity [npc_id] [value]     — Force NPC affinity
trigger_event [event_id]             — Spawn events
```

### 9.2 Difficulty Modulation

Sliders in settings:
- XP multiplier (0.5x to 2x)
- Loot multiplier
- Affinity decay rate
- Economic severity (shop prices)
- IA vs. Dice ratio

---

## 10. API Endpoints (Planned)

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Start session
- `GET /api/auth/me` — Current user
- `POST /api/auth/logout` — End session

### Characters
- `GET /api/characters` — List characters
- `POST /api/characters` — Create new character
- `GET /api/characters/:id` — Character details
- `PATCH /api/characters/:id` — Update character

### Game State
- `GET /api/game/config` — Game settings
- `GET /api/game/node/:node_id` — Map node details
- `POST /api/game/move/:node_id` — Travel to node
- `POST /api/game/interact/:hotspot_id` — Interact with object

### Dialogue & IA
- `POST /api/dialogue/send` — Send message to NPC
- `GET /api/dialogue/history` — Conversation log

### Combat
- `POST /api/combat/start` — Initiate encounter
- `POST /api/combat/action` — Execute combat action
- `GET /api/combat/state` — Current encounter state

### Inventory & Crafting
- `GET /api/inventory` — Player items
- `POST /api/inventory/use` — Use consumable
- `POST /api/shop/buy` — Purchase from merchant
- `POST /api/crafting/propose` — Request commission

### Quests
- `GET /api/quests/active` — Active missions
- `POST /api/quests/complete` — Mark quest done
- `POST /api/quests/delegate` — Hire NPC to complete task

---

## 11. Security & Validation

### 11.1 Backend Authority

- **All dice rolls on backend** (prevent client cheating)
- **JWT authentication** for session management
- **Input validation** on every endpoint
- **Database constraints** (foreign keys, unique indexes)
- **Role-based access** (player owns only their characters)

### 11.2 IA Injection Prevention

- System prompts never visible to client
- API key stored server-side
- Prompt caching validates hash before serving

---

## 12. Performance Optimizations

### 12.1 Caching

- **IA response cache:** `ia_prompts_cache` (SHA-256 hash key)
- **Service Worker:** Aggressive caching for UI assets (offline play)
- **Database views:** Denormalized for common queries

### 12.2 Indexing Strategy

```sql
CREATE INDEX idx_inventory_character ON inventory_slots(character_id);
CREATE INDEX idx_active_quests_character ON active_quests(character_id);
CREATE INDEX idx_dialogue_log_npc ON dialogue_log(npc_id);
-- etc.
```

### 12.3 Scaling

- **Horizontal:** Stateless API layer
- **Vertical:** PostgreSQL JSONB for flexible schema
- **Batch processing:** Delegated missions run async off-screen

---

## 13. Development Roadmap

### Phase 1: Foundation (Current)
- [x] Database schema (Entity-Component)
- [x] Backend boilerplate (Express.js)
- [ ] Character creation flow
- [ ] Authentication system

### Phase 2: Core Gameplay
- [ ] Map exploration & nodes
- [ ] NPC dialogue system
- [ ] Turn-based combat engine
- [ ] Inventory & equipment

### Phase 3: IA & Narrative
- [ ] Gemini API integration
- [ ] Dialogue caching
- [ ] Quest generation
- [ ] Procedural events

### Phase 4: Polish
- [ ] Frontend UI (Vue.js)
- [ ] Audio engine
- [ ] Performance tuning
- [ ] Lore implementation

---

## 14. References

- **Design Document:** [Master Document - uploaded]
- **Game Rules:** D&D 5e System Reference
- **Web Technology:** Express.js, PostgreSQL, Vue.js
- **IA:** Google Gemini 2.0 Flash

---

*Last Updated: 2026-11-08*  
*Maintainer: Ophion Development Team*
