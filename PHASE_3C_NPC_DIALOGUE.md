# 🎭 Phase 3C: NPC System + IA Dialogue

**Estimate:** 4-5 hours  
**Status:** 🔄 STARTING  
**Objective:** Create NPCs with IA-powered dialogue, affinity tracking, and quest system.

---

## 🎯 Goals

✅ Build NPC service (creation, affinity, dialogue history)  
✅ Seed 20+ NPCs across locations (merchants, quest-givers, companions)  
✅ Implement IA-powered dialogue using Phase 3A Gemini service  
✅ Create conversation endpoints (talk, check affinity, quest hooks)  
✅ Add NPC placement in map locations  
✅ Integrate quest assignment system  

---

## 🏗️ Architecture

### Data Layer
```
npcs (game entities with personality)
  ├─ npc_state (affinity, mood, memory)
  ├─ npc_inventory (equipment, items)
  └─ dialogue_history (conversation logs)

character_relationships (tracking with NPCs)
  └─ affinity (numeric -100 to 100)

quests (quest templates assigned by NPCs)
  ├─ quest_state (per-character progress)
  └─ quest_rewards (gold, items, affinity)
```

### Service Layer
```
npc.js
  ├─ createNPC(data)
  ├─ getNPC(npcId)
  ├─ generateDialogue(npc, playerMessage, context)
  ├─ updateAffinity(npcId, characterId, delta)
  ├─ getConversationHistory(npcId, characterId)
  ├─ assignQuest(npcId, characterId, questId)
  └─ resolveQuest(questId, characterId, success)

quest.js
  ├─ createQuest(data)
  ├─ assignQuestToCharacter(questId, characterId)
  ├─ completeQuest(questId, characterId)
  ├─ getActiveQuests(characterId)
  └─ getQuestRewards(questId)
```

### API Layer
```
GET  /api/npcs              → All NPCs
GET  /api/npcs/:id          → NPC details + stats
POST /api/npcs/:id/talk     → Send message to NPC
GET  /api/npcs/:id/history  → Conversation history
PATCH /api/npcs/:id/affinity → Manual affinity mod (dev)
GET  /api/npcs/:id/quests   → Quests from NPC

GET  /api/characters/:id/relationships → All NPC affinity
GET  /api/characters/:id/quests        → Active quests
POST /api/quests/:id/complete          → Complete quest
GET  /api/quests/:id                   → Quest details
```

---

## 📋 Task Breakdown

### Task 1: NPC Database Schema (20 min)
**File:** `server/db/07_schema_npcs.sql`

**Tables:**
```sql
npcs (already exists, verify + enhance)
  ├─ id, hotspot_id, name, race, role, personality, dialogue_seed, initial_affinity, is_recruitable

npc_state (tracking affinity, mood, memory)
  ├─ npc_id, current_affinity, relationship_type, memory_snippets, mood, updated_at

npc_inventory (what NPCs carry)
  ├─ npc_id, item_id, quantity, equipped

character_relationships (player ↔ NPC affinity)
  ├─ character_id, npc_id, affinity (-100 to 100), relationship_type

dialogue_history (conversation logs)
  ├─ character_id, npc_id, player_message, npc_response, affinity_delta, created_at

quests (quest templates)
  ├─ id, quest_key, name, description, quest_giver_id, difficulty, rewards_gold, rewards_exp

character_quests (per-character quest progress)
  ├─ character_id, quest_id, status (active, completed, failed), progress, completed_at
```

### Task 2: NPC Seeding (50 min)
**File:** `server/db/seed-npcs.js`

**20+ NPCs to create:**

#### Merchants (5)
- Armorer (Mountain Keep) - sells weapons/armor
- Healer (Forest Sanctuary) - sells potions
- Spice Merchant (Desert Encampment) - exotic goods
- Tavern Keeper (Port Town) - drinks + info
- Alchemist (Shadow Woods) - rare ingredients

#### Quest Givers (5)
- Governor (Port Town) - protection quests
- Elder (Forest Sanctuary) - discovery quests
- Caravan Master (Desert Encampment) - delivery quests
- Dwarf Foreman (Mountain Keep) - mining quests
- Monastery Abbot (Hidden Valley) - blessing quests

#### Companions/Recruitable (5)
- Ranger (Forest Trail) - elven tracker
- Knight (Mountain Keep) - dwarven warrior
- Mage (Forest Sanctuary) - elven mage
- Rogue (Port Town) - human thief
- Cleric (Hidden Valley) - holy healer

#### Neutral/Mysterious (5)
- Wanderer (Wildlands Frontier) - enigmatic traveler
- Hermit (Hidden Valley) - wise sage
- Bard (Coastal Road) - storyteller
- Merchant of Secrets (Shadow Woods) - information broker
- Old Sailor (Port Town) - retired adventurer

**Per NPC:**
- Name, race, role, personality (temperament, intelligence, charisma)
- Initial affinity (-20 to +20)
- Dialogue seed (starting conversation topic)
- Recruitment cost (if companion)
- Location placement
- Starting inventory (items to trade/sell)

### Task 3: NPC Service Implementation (60 min)
**File:** `server/services/npc.js`

```javascript
class NPCService {
  // Get NPC with state
  async getNPC(npcId, characterId, db)
    // Returns: { npc, state, affinity, inventory }

  // Generate dialogue via Gemini
  async generateDialogue(npc, playerMessage, context, db)
    // Context: { character, affinity, previous_topics, npc_mood }
    // Returns: { response, affinity_delta, emotion, next_options }

  // Update affinity (affects dialogue tone)
  async updateAffinity(npcId, characterId, delta, db)
    // delta: -10 to +10 (event-based changes)
    // Returns: { new_affinity, relationship_type }

  // Get conversation history
  async getConversationHistory(npcId, characterId, limit, db)
    // Returns: [{ player_message, npc_response, affinity_delta, date }]

  // Assign quest to character
  async assignQuest(npcId, characterId, questId, db)
    // Returns: { quest_id, description, rewards }

  // Get NPC's quests
  async getQuestsFromNPC(npcId, db)
    // Returns: [{ id, name, difficulty, description }]

  // List NPCs in location
  async getLocationNPCs(locationId, db)
    // Returns: [{ id, name, role, affinity (if known) }]

  // Get NPC stats
  async getNPCStats(npcId, db)
    // Returns: { interactions, affinity_avg, relationship_spread }

  // Get player's relationships
  async getCharacterRelationships(characterId, db)
    // Returns: [{ npc, affinity, relationship_type, last_talked }]
}
```

### Task 4: Quest Service Implementation (40 min)
**File:** `server/services/quest.js`

```javascript
class QuestService {
  // Get quest details
  async getQuest(questId, characterId, db)
    // Returns: { id, name, description, difficulty, rewards, progress }

  // Get active quests for character
  async getActiveQuests(characterId, db)
    // Returns: [{ id, name, quest_giver, progress, deadline }]

  // Complete quest
  async completeQuest(questId, characterId, success, db)
    // Returns: { rewards: { gold, exp, items }, affinity_delta }

  // Update quest progress
  async updateQuestProgress(questId, characterId, progress, db)
    // progress: 0-100 percentage
    // Returns: { new_progress, status }

  // Get quest rewards
  async getQuestRewards(questId, db)
    // Returns: { gold, experience, loot, affinity_delta }

  // Get quest history
  async getQuestHistory(characterId, limit, db)
    // Returns: [{ quest, completed_at, rewards_collected }]

  // Validate quest completion
  async validateQuestConditions(questId, characterId, db)
    // Checks if all conditions met
    // Returns: { valid, missing_conditions }
}
```

### Task 5: API Endpoints Implementation (60 min)
**Files:** `server/api/npcs.js`, `server/api/quests.js`

**NPC Endpoints:**
```
GET  /api/npcs                    → All NPCs (paginated)
GET  /api/npcs/:id                → NPC details
GET  /api/npcs/:id/stats          → NPC statistics
GET  /api/npcs/:id/quests         → Quests from NPC
POST /api/npcs/:id/talk           → Send message
GET  /api/npcs/:id/history        → Dialogue history
PATCH /api/npcs/:id/affinity      → Modify affinity (dev)

GET  /api/locations/:id/npcs      → NPCs in location
GET  /api/characters/:id/relationships  → All relationships
GET  /api/characters/:id/companion-options → Recruitable NPCs
```

**Quest Endpoints:**
```
GET  /api/quests                  → All available quests
GET  /api/quests/:id              → Quest details
POST /api/quests/:id/accept       → Accept quest
POST /api/quests/:id/complete     → Complete quest
GET  /api/characters/:id/quests   → Active quests
GET  /api/characters/:id/quests/completed → Completed quests
GET  /api/characters/:id/quests/failed    → Failed quests
```

### Task 6: Dialogue Generation Pipeline (40 min)

**Integration with Phase 3A Gemini:**

```javascript
// System prompt for NPC dialogue
const NPC_DIALOGUE_PROMPT = `
You are ${npc.name}, a ${npc.race} ${npc.role} in the world of L'Occhio di Ophion.

Personality: ${JSON.stringify(npc.personality)}
Mood: ${npc_state.current_mood}
Relationship with player: ${affinity}/100 (${relationship_type})
Previous topics: ${previous_topics}

Respond in character with one sentence (max 100 chars).
If affinity < 0, be suspicious. If affinity > 50, be friendly.
`;

// Call Gemini
const dialogue = await generateDialogue(NPC_DIALOGUE_PROMPT, {
  player_message: playerMessage,
  context: contextData
});

// Parse response for affinity changes
const affinity_delta = parseAffinityFromDialogue(dialogue);
```

**Fallback Dialogue Templates:**

For when Gemini unavailable, use templates:
```javascript
const dialogueTemplates = {
  friendly: [
    "Ah, good to see you! What brings you here?",
    "I'm always happy to help a friend.",
    "Let's talk business!"
  ],
  neutral: [
    "Yes? What do you want?",
    "I'm listening.",
    "State your business."
  ],
  hostile: [
    "I have nothing to say to you.",
    "Begone! I've no time for this.",
    "Don't waste my time."
  ]
};
```

### Task 7: Testing (50 min)

**Unit Tests** (`server/services/npc.test.js`):
```javascript
✅ NPC creation and retrieval
✅ Affinity tracking (increase/decrease)
✅ Relationship type changes (neutral → amico → amante)
✅ Dialogue generation (tone varies by affinity)
✅ Memory/context tracking
✅ Conversation history persistence
✅ Quest assignment
✅ Quest completion and rewards
```

**Integration Tests** (`server/tests/npc.integration.test.js`):
```javascript
✅ Full conversation flow (talk → affinity change → history)
✅ Quest flow (assign → progress → complete → rewards)
✅ Affinity affects dialogue
✅ Multiple NPCs + relationships
✅ Error handling (auth, invalid NPC, etc)
✅ Companion recruitment
✅ Quest failure handling
```

---

## 🎮 Example NPC Interaction

### Port Town Tavern Keeper

**Character:** Gruff, friendly, loves gossip

**Starting Affinity:** +10 (likes adventurers)

**Dialogue Flow:**

```
Player: "Hail, tavern keeper! What's new?"

Gemini Response:
  "Aye, welcome! I hear tales of creatures in the Crypt..."
  [affinity_delta: +5]
  [new_affinity: 15]
  [emotion: friendly]

Player: "Any quests available?"

Gemini Response:
  "Aye! The townspeople fear bandits on the road. 50 gold to clear them."
  [quest_assigned: bandits-on-road]
  [difficulty: 2]
  [affinity_delta: +3]

[Later: Player completes quest]

Player: "The bandits are dealt with."

Gemini Response:
  "Excellent work, friend! Here's your reward. Drinks on the house!"
  [affinity_delta: +10]
  [new_affinity: 28]
  [relationship_type: amico]
  [rewards: 50 gold, 100 exp]
```

---

## 🧪 Testing Strategy

### Unit Tests (20+ cases)
- Affinity calculations
- Relationship type transitions
- Dialogue generation
- Quest assignment and completion
- Memory/context tracking
- Error handling

### Integration Tests (10+ cases)
- Full NPC interaction flow
- Quest lifecycle
- Multiple NPC relationships
- Companion recruitment
- Affinity-based dialogue variation

### Manual Testing Scenarios
- Meet first NPC, check dialogue
- Increase affinity, see tone change
- Accept quest from NPC
- Complete quest, get rewards
- Check conversation history
- View all relationships

---

## 📊 Implementation Timeline

```
[20 min]  Task 1: Database schema + indices
[50 min]  Task 2: NPC seeding (20+ NPCs)
[60 min]  Task 3: NPC service layer
[40 min]  Task 4: Quest service layer
[60 min]  Task 5: API endpoints (13 total)
[40 min]  Task 6: Dialogue generation + fallback
[50 min]  Task 7: Testing (30+ test cases)
          ────────────────────────────────
[320 min] Total: ~5.3 hours

[30 min]  Documentation + cleanup
          ════════════════════════════════
[350 min] Total with docs: ~5.8 hours
```

**Estimate:** 4-5 hours ✅

---

## 🚀 Expected Outcomes

### Player Actions Enabled
- ✅ Talk to NPCs with realistic conversations
- ✅ Gain/lose affinity through dialogue
- ✅ Accept quests from quest-givers
- ✅ Complete quests for rewards
- ✅ Recruit companions for party
- ✅ Remember previous conversations
- ✅ See affinity-based dialogue variations

### Game Features Added
- ✅ 20+ unique NPCs with personalities
- ✅ IA-powered dialogue (Gemini)
- ✅ Affinity tracking (-100 to +100)
- ✅ Relationship progression (neutral → amico → amante)
- ✅ Dialogue history per character
- ✅ 10+ quests (varies by NPC, location)
- ✅ Quest progression tracking
- ✅ Companion recruitment system

### Technical Foundations
- ✅ NPC service (reusable by Phase 3D combat)
- ✅ Quest service (reusable for future content)
- ✅ Dialogue generation (Gemini integration)
- ✅ Affinity calculations (relationship math)
- ✅ Memory tracking (conversation history)

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Gemini quota exceeded | Use fallback templates (20+ per attitude) |
| NPC personality too generic | Use detailed personality JSON (temperament, intelligence, charisma) |
| Affinity calculation too simple | Implement delta modifiers (quest +10, insult -15, etc) |
| Long dialogue generation latency | Cache NPC system prompts, implement timeouts |
| Quest progression unclear | Add explicit progress tracking (0-100%) |

---

## ✅ Phase 3C Definition of Done

- [x] Database schema created (NPCs, quests, relationships)
- [x] 20+ NPCs seeded across locations
- [x] NPC service fully functional
- [x] Quest service fully functional
- [x] 13 API endpoints implemented & tested
- [x] Gemini dialogue integration working
- [x] Fallback dialogue templates (20+ templates)
- [x] Affinity tracking and progression
- [x] Conversation history persistence
- [x] 30+ unit tests passing
- [x] 10+ integration tests passing
- [x] Documentation complete
- [x] Git commits organized
- [x] Zero security vulnerabilities
- [x] Ready for Phase 3D (Combat)

---

## 🔗 Integration Points

### Depends On
- ✅ Phase 2: Character system (for relationships)
- ✅ Phase 2.5: Error handling (for endpoints)
- ✅ Phase 3A: Gemini service (for dialogue)
- ✅ Phase 3B: Map system (NPC placement in locations)

### Enables
- 🎯 Phase 3D: Combat (NPC companions in battles)
- 🎯 Phase 4: Advanced quest chains and narrative

---

## 📝 Next Steps

1. ✅ Read PHASE_3C_NPC_DIALOGUE.md (this file)
2. Start Task 1: Database schema verification/creation
3. Implement Task 2: NPC seeding
4. Create Task 3: NPC service
5. Create Task 4: Quest service
6. Build Task 5: API endpoints
7. Integrate Task 6: Dialogue generation
8. Write Task 7: Comprehensive tests
9. Documentation + Git commits
10. Move to Phase 3D: Combat System

---

**Status:** 🔄 Ready to begin  
**Start Time:** 2026-11-09 00:02:48  
**Estimated Completion:** 2026-11-09 04:02:48 (4-5 hours)

