-- ============================================================================
-- World: Map Nodes, NPCs, Party, Relations
-- ============================================================================

CREATE TABLE IF NOT EXISTS map_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  background_art_path VARCHAR(500),
  region VARCHAR(100), -- Geographic region
  node_type VARCHAR(50), -- settlement, dungeon, wilderness, ruin, tavern, forge
  weather_current VARCHAR(50) DEFAULT 'clear',
  danger_level INT DEFAULT 1, -- 1-10
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotspots within nodes (NPCs, chests, doors, etc.)
CREATE TABLE IF NOT EXISTS hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  hotspot_key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  hotspot_type VARCHAR(50), -- npc, chest, door, shrine, forging_station
  description TEXT,
  position_x INT,
  position_y INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(node_id, hotspot_key)
);

-- NPCs as game entities (IA-driven)
CREATE TABLE IF NOT EXISTS npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotspot_id UUID NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  race VARCHAR(50),
  role VARCHAR(100), -- merchant, warrior, alchemist, quest_giver, companion
  personality JSONB DEFAULT '{}', -- {temperament: "gruff", intelligence: 12, ...}
  dialogue_seed TEXT, -- Initial conversation topic
  initial_affinity INT DEFAULT 0, -- -100 to 100
  is_recruitable BOOLEAN DEFAULT FALSE,
  recruitment_cost INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NPC State & Memory (IA context)
CREATE TABLE IF NOT EXISTS npc_state (
  npc_id UUID PRIMARY KEY REFERENCES npcs(id) ON DELETE CASCADE,
  current_affinity INT DEFAULT 0,
  relationship_type VARCHAR(50), -- neutral, amico, amante, mercenario, ostile
  memory_snippets JSONB[], -- Array of important player interactions
  last_interaction TIMESTAMP,
  knows_player_secrets JSONB DEFAULT '{}',
  current_mood VARCHAR(50) DEFAULT 'neutral',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Party Members (characters + recruited NPCs)
CREATE TABLE IF NOT EXISTS party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
  position_in_party INT DEFAULT 0, -- 0 = leader, 1-3 = companions
  member_type VARCHAR(50), -- player_character, recruited_npc, summoned
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  contract_expires_at TIMESTAMP, -- For mercenaries (NULL = permanent)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory for NPCs (privacy rule: not directly viewable)
CREATE TABLE IF NOT EXISTS npc_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(npc_id, item_id)
);

-- Loot containers (chests, corpses, bodies)
CREATE TABLE IF NOT EXISTS loot_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  container_key VARCHAR(255) NOT NULL,
  container_type VARCHAR(50), -- chest, corpse, cache, altar
  opened BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(node_id, container_key)
);

-- Items in loot containers
CREATE TABLE IF NOT EXISTS container_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID NOT NULL REFERENCES loot_containers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hotspots_node ON hotspots(node_id);
CREATE INDEX idx_npcs_hotspot ON npcs(hotspot_id);
CREATE INDEX idx_party_character ON party_members(character_id);
CREATE INDEX idx_npc_inventory ON npc_inventory(npc_id);
CREATE INDEX idx_containers_node ON loot_containers(node_id);
