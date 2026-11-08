-- ============================================================================
-- Travel System Tables (Phase 3B Addition)
-- ============================================================================

-- Character current location tracking
CREATE TABLE IF NOT EXISTS character_locations (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  current_node_id UUID NOT NULL REFERENCES map_nodes(id),
  arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discovered locations per character
CREATE TABLE IF NOT EXISTS character_discovered_locations (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, node_id)
);

-- Travel history (journeys between locations)
CREATE TABLE IF NOT EXISTS travel_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
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

-- Random encounters during travel
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_log_id UUID REFERENCES travel_log(id) ON DELETE CASCADE,
  encounter_type VARCHAR(50), -- combat, npc_meeting, treasure, hazard
  difficulty INT, -- 1-10
  description TEXT,
  rewards JSONB DEFAULT '{}', -- {gold, exp, loot}
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_locations ON character_locations(character_id);
CREATE INDEX IF NOT EXISTS idx_discovered_locations ON character_discovered_locations(character_id);
CREATE INDEX IF NOT EXISTS idx_travel_log_character ON travel_log(character_id);
CREATE INDEX IF NOT EXISTS idx_travel_log_destination ON travel_log(destination_node_id);
CREATE INDEX IF NOT EXISTS idx_encounters_travel ON encounters(travel_log_id);
