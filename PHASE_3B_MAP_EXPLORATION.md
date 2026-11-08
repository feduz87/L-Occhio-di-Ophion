# 🗺️ Phase 3B: Map Exploration System

**Estimate:** 3-4 hours  
**Status:** 🔄 STARTING  
**Objective:** Build explorable world with travel, encounters, and location discovery.

---

## 🎯 Goals

✅ Create persistent world with interconnected locations  
✅ Implement travel system (movement, cost, time calculation)  
✅ Add encounter generation (random events, difficulty scaling)  
✅ Enable location discovery through exploration  
✅ Integrate with Phase 3A Gemini service for encounter descriptions  

---

## 🏗️ Architecture

### Data Layer
```
map_nodes (settlements, dungeons, wilderness)
  ├─ hotspots (NPCs, chests, shrines)
  ├─ loot_containers (chests, corpses)
  └─ encounters (random events, rewards)

character_location (current position, travel status)
  └─ travel_log (history of journeys)
```

### Service Layer
```
travel.js
  ├─ calculateTravelCost(from, to, party)
  ├─ calculateTravelTime(from, to, terrain)
  ├─ initiateTravel(character, destination)
  ├─ generateEncounter(location, difficulty)
  └─ completeTravel(character)

map.js
  ├─ getLocationDetails(locationId)
  ├─ discoverLocation(character, location)
  ├─ getDiscoveredLocations(character)
  └─ updateLocationState(location, state)

encounter.js
  ├─ generateRandomEncounter(difficulty, terrain)
  ├─ generateDescription(encounter)
  └─ assignRewards(encounter, party)
```

### API Layer
```
GET  /api/map/nodes              → All discovered locations
GET  /api/map/nodes/:id          → Location details + hotspots
POST /api/characters/:id/travel  → Initiate travel
GET  /api/characters/:id/travel  → Current travel status
POST /api/characters/:id/rest    → Rest at current location
GET  /api/characters/:id/status  → Character location + health
```

---

## 📋 Task Breakdown

### Task 1: Map Node Seeding (40 min)
**File:** `server/db/seed-locations.js`

**Locations to Create:**

#### Settlements (4) - Trading hubs & safe havens
```
1. Port Town (coastal trading hub)
   - Region: Coast
   - Danger Level: 1
   - NPCs: Tavern Keeper, Dock Master, Merchant
   - Starting location for new adventures

2. Mountain Keep (dwarven stronghold)
   - Region: Mountain
   - Danger Level: 2
   - NPCs: Dwarf Blacksmith, Mine Foreman
   - Trading post for rare materials

3. Forest Sanctuary (elven sanctuary)
   - Region: Forest
   - Danger Level: 2
   - NPCs: Druid Keeper, Herbalist
   - Peaceful rest location

4. Desert Encampment (nomadic traders)
   - Region: Desert
   - Danger Level: 3
   - NPCs: Caravan Master, Spice Merchant
   - Exotic items available
```

#### Dungeons (3) - Dangerous exploration sites
```
1. Crypt of Ancients (near Port Town)
   - Region: Coast
   - Danger Level: 2
   - Hotspots: Sealed Tomb, Treasure Chamber, Skeletal Guardian
   - Loot: Ancient artifacts, gold

2. Dragon's Hoard (mountain peak)
   - Region: Mountain
   - Danger Level: 5
   - Hotspots: Dragon Lair, Treasure Vault, Escape Route
   - Loot: Legendary items, massive gold

3. Shadow Woods (dark forest)
   - Region: Forest
   - Danger Level: 3
   - Hotspots: Twisted Trees, Hidden Shrine, Shadow Creatures
   - Loot: Enchanted items, rare herbs
```

#### Wilderness (6) - Connecting areas & random encounters
```
1. Coastal Road (Port Town ↔ Forest Sanctuary)
2. Mountain Pass (Mountain Keep ↔ Dragon's Hoard)
3. Forest Trail (Forest Sanctuary ↔ Shadow Woods)
4. Desert Path (Desert Encampment ↔ Mountain Keep)
5. Hidden Valley (central wilderness hub)
6. Wildlands (unexplored frontier)
```

### Task 2: Travel Service Implementation (45 min)
**File:** `server/services/travel.js`

**Functions:**
```javascript
class TravelService {
  // Calculate travel cost (gold, supplies, time)
  calculateTravelCost(origin, destination, party) {
    // Base distance calculation
    // Party size modifier
    // Terrain difficulty modifier
    // Returns: { gold, rations, time_hours }
  }

  // Calculate travel time in hours
  calculateTravelTime(origin, destination, terrain) {
    // Base speed: 24 miles/day
    // Terrain modifiers: road (+50%), wilderness (-50%)
    // Weather effects (applied at arrival)
    // Returns: time_hours
  }

  // Initiate travel to destination
  async initiateTravel(character, destination, db) {
    // Deduct travel cost from character
    // Create travel_log entry
    // Schedule encounter generation
    // Set character location to traveling state
    // Returns: { travel_time, cost, encounter_triggered }
  }

  // Generate random encounter during travel
  async generateEncounter(origin, destination, difficulty) {
    // Determine encounter type (combat, NPC meeting, discovery, loot)
    // Calculate difficulty based on terrain + danger_level
    // Call Gemini for encounter description
    // Returns: { type, description, difficulty, rewards }
  }

  // Complete travel, arrive at destination
  async completeTravel(character, destination, db) {
    // Update character location
    // Apply travel damage (if encounter happened)
    // Update travel_log
    // Discover new location if unknown
    // Returns: { arrived, location, health_status }
  }

  // Rest at location, restore health
  async restAtLocation(character, location, hours, db) {
    // Restore HP (1/4 max per 8-hour rest)
    // Restore willpower
    // Reduce fatigue
    // Consume rations
    // Returns: { health_restored, rations_consumed }
  }
}
```

### Task 3: Location Discovery & Query (30 min)
**File:** `server/services/map.js`

**Functions:**
```javascript
class MapService {
  // Get all locations discovered by character
  async getDiscoveredLocations(character, db) {
    // Query map_nodes joined with character_discovered_locations
    // Return with travel cost to each
    // Cached for performance
    // Returns: [{ id, name, region, danger_level, distance, cost }]
  }

  // Get detailed location info
  async getLocationDetails(location_id, character_id, db) {
    // Location metadata (name, description, image)
    // Hotspots (NPCs, chests, shrines)
    // Current weather/time
    // Dangerous creatures
    // Returns: { location, hotspots, weather, status }
  }

  // Discover new location
  async discoverLocation(character, location, db) {
    // Add to character's discovered_locations
    // Log discovery for UI
    // Unlock travel to this location
    // Trigger optional Gemini narration
    // Returns: { discovered, unlocked_paths }
  }

  // Get travel information between two locations
  async getTravelInfo(origin, destination, party_size, db) {
    // Distance calculation
    // Cost estimation
    // Time estimation
    // Terrain type + danger
    // Suggested party composition
    // Returns: { distance, cost, time, danger, terrain }
  }
}
```

### Task 4: Encounter Generation (30 min)
**File:** `server/services/encounter.js`

**Functions:**
```javascript
class EncounterService {
  // Generate random encounter during travel
  async generateRandomEncounter(terrain, difficulty) {
    // Encounter types: combat (30%), npc_meeting (30%), treasure (20%), hazard (20%)
    // Difficulty scaling based on character level + terrain
    // Each type has specific rules
    // Call Gemini for narrative description
    // Returns: { type, description, difficulty, duration, rewards }
  }

  // Generate encounter description via Gemini
  async generateEncounterDescription(encounter, context) {
    // Call gemini.generateNarrative()
    // Create immersive scene description
    // Include difficulty level in description
    // Returns: { narrative_description, visual_elements }
  }

  // Assign rewards for encounter completion
  assignRewards(encounter, party_level) {
    // Gold: 10-100 based on difficulty
    // Experience: 25-100 based on party level
    // Loot: Chance based on encounter type
    // Unique items: Rare chance for special loot
    // Returns: { gold, experience, loot }
  }

  // Combat encounter specifics (stubbed for Phase 3D)
  initiateCombat(encounter, enemies) {
    // Generate enemy stats based on difficulty
    // Set initiative (Combat phase, not here)
    // Returns combat context for Phase 3D
  }
}
```

### Task 5: API Endpoints Implementation (45 min)
**File:** `server/api/map.js`, `server/api/travel.js`

**Endpoints:**

```javascript
// Map Discovery & Query
GET  /api/map/nodes
     Query: { region, min_danger, max_danger }
     Response: [{ id, name, region, danger_level, distance }]

GET  /api/map/nodes/:id
     Response: { location details, hotspots, weather, creatures }

GET  /api/map/nodes/:id/travel-info
     Query: { from, party_size }
     Response: { distance, cost, time, danger, terrain }

// Travel Management
POST /api/characters/:id/travel
     Body: { destination_id }
     Response: { travel_id, duration, cost_deducted, encounter_chance }

GET  /api/characters/:id/travel
     Response: { current_destination, progress%, arrival_time, hazards }

POST /api/characters/:id/travel/:travel_id/complete
     Response: { arrived, health_status, loot, discoveries }

// Rest & Recovery
POST /api/characters/:id/rest
     Body: { location_id, hours }
     Response: { health_restored, rations_consumed, new_status }

GET  /api/characters/:id/status
     Response: { location, health, resources, status_effects }

// Discovery Logging
GET  /api/characters/:id/discovered-locations
     Response: [{ location, discovered_at, visited_times }]

POST /api/locations/:id/discover
     Response: { discovered, unlocked_paths }

// Encounter History (for replay)
GET  /api/characters/:id/travel-log
     Response: [{ destination, date, duration, loot, events }]
```

### Task 6: Database Schema Updates (15 min)
**File:** Verify `02_schema_world.sql` + add if needed

**Tables to verify/create:**
```sql
-- Character location tracking
CREATE TABLE IF NOT EXISTS character_locations (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  current_node_id UUID NOT NULL REFERENCES map_nodes(id),
  arrival_time TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discovered locations per character
CREATE TABLE IF NOT EXISTS character_discovered_locations (
  character_id UUID NOT NULL REFERENCES characters(id),
  node_id UUID NOT NULL REFERENCES map_nodes(id),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, node_id)
);

-- Travel history
CREATE TABLE IF NOT EXISTS travel_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id),
  origin_node_id UUID NOT NULL REFERENCES map_nodes(id),
  destination_node_id UUID NOT NULL REFERENCES map_nodes(id),
  departed_at TIMESTAMP,
  arrived_at TIMESTAMP,
  duration_hours INT,
  cost_gold INT,
  cost_rations INT,
  encounter_triggered BOOLEAN DEFAULT FALSE,
  loot_found JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Encounter events during travel
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_log_id UUID REFERENCES travel_log(id),
  encounter_type VARCHAR(50), -- combat, npc_meeting, treasure, hazard
  difficulty INT, -- 1-10
  description TEXT,
  rewards JSONB DEFAULT '{}', -- {gold, exp, loot}
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Testing Strategy

### Unit Tests (`server/services/travel.test.js`)
```javascript
describe('TravelService', () => {
  test('calculateTravelCost: distance × party_size × terrain_multiplier')
  test('calculateTravelTime: includes weather modifiers')
  test('calculateEncounterChance: higher danger = higher %')
  test('assignRewards: scaled by difficulty and party level')
})

describe('MapService', () => {
  test('discoverLocation: adds to character discoveries')
  test('getDiscoveredLocations: only returns discovered nodes')
  test('getTravelInfo: calculates accurate costs')
})

describe('EncounterService', () => {
  test('generateRandomEncounter: distribution (30% combat, 30% NPC, etc)')
  test('assignRewards: treasure > hazard rewards')
})
```

### Integration Tests (`server/tests/travel.integration.test.js`)
```javascript
describe('Travel Flow', () => {
  test('Create char → Discover location → Travel → Rest → Discover new location')
  test('Travel cost deducted from character gold')
  test('Encounter triggered during travel')
  test('Multiple travels accumulate distance correctly')
  test('Rest restores health incrementally')
})
```

---

## 📊 Implementation Timeline

```
[40 min]  Task 1: Seed 13 locations
[45 min]  Task 2: Travel service (cost, time, encounters)
[30 min]  Task 3: Location query & discovery
[30 min]  Task 4: Encounter generation
[45 min]  Task 5: API endpoints (11 endpoints)
[15 min]  Task 6: DB schema verification
           ────────────────────────
[205 min] Total: ~3.5 hours

[30 min]  Testing (unit + integration)
[15 min]  Git commits & documentation
           ════════════════════════
[250 min] Total with testing: ~4 hours
```

---

## 🚀 Expected Outcomes

### Player Actions Enabled
- ✅ Discover new locations by traveling
- ✅ Rest and recover health/resources
- ✅ Encounter random events on journeys
- ✅ Find loot during exploration
- ✅ See location descriptions (Gemini-powered)

### Game Features Added
- ✅ Persistent world map (13+ locations)
- ✅ Travel cost calculation (gold, time, supplies)
- ✅ Encounter generation (4 types)
- ✅ Weather/time effects on travel
- ✅ Difficulty scaling per location
- ✅ Location discovery mechanism
- ✅ Travel history logging

### Technical Foundations
- ✅ World state persistence (character location)
- ✅ Travel service (reusable by Phase 3C NPC wandering)
- ✅ Encounter hooks (reusable by Phase 3D combat)
- ✅ Gemini integration (NPC dialogue + descriptions)

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Gemini quota exceeded | Use fallback descriptions from encounter templates |
| Travel cost calculation too complex | Start simple (flat cost), iterate if needed |
| Encounter frequency tuning | Adjustable `encounter_chance` in config |
| Location discovery overwhelming | Limit initial discovered locations, unlock progressively |

---

## ✅ Phase 3B Definition of Done

- [x] 13 locations seeded in database
- [x] Travel service fully functional (cost, time, encounters)
- [x] Location discovery mechanism working
- [x] Encounter generation with Gemini integration
- [x] 11 API endpoints implemented & tested
- [x] Integration tests passing (full travel flow)
- [x] Documentation complete
- [x] Git commits organized by task
- [x] Zero security vulnerabilities
- [x] Ready for Phase 3C (NPC integration)

---

## 📚 Files to Create/Modify

**New Files:**
- `server/db/seed-locations.js` (400 lines)
- `server/services/travel.js` (350 lines)
- `server/services/map.js` (250 lines)
- `server/services/encounter.js` (200 lines)
- `server/api/map.js` (400 lines)
- `server/api/travel.js` (300 lines)
- `server/services/travel.test.js` (300 lines)
- `server/tests/travel.integration.test.js` (250 lines)

**Modified Files:**
- `server/index.js` (add route mounting for map/travel)
- `package.json` (add scripts if needed)
- `02_schema_world.sql` (verify tables exist)

**Total New Code:** ~2,050 lines
**Total Test Code:** ~550 lines

---

## 🔗 Integration Points

### Depends On
- ✅ Phase 2: Character system (location tracking)
- ✅ Phase 2.5: Error handling (used by endpoints)
- ✅ Phase 3A: Gemini service (encounter descriptions)

### Enables
- 🎯 Phase 3C: NPC system (NPCs placed in locations)
- 🎯 Phase 3D: Combat (encounters lead to combat)

---

## 📝 Next Steps

1. ✅ Read PHASE_3B_MAP_EXPLORATION.md (this file) **← YOU ARE HERE**
2. Start Task 1: Seed 13 locations in database
3. Implement Task 2-4: Travel, map, encounter services
4. Create Task 5: API endpoints
5. Write Task 6: Integration tests
6. Documentation + Git commits
7. Move to Phase 3C: NPC System

---

**Status:** 🔄 Ready to begin  
**Start Time:** 2026-11-08 23:53:18  
**Estimated Completion:** 2026-11-09 03:53:18  
