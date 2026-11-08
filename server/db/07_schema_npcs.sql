-- ============================================================================
-- NPC & Quest System Schema (Phase 3C Addition)
-- ============================================================================

-- NPC State & Affinity Tracking
CREATE TABLE IF NOT EXISTS npc_state (
  npc_id UUID PRIMARY KEY REFERENCES npcs(id) ON DELETE CASCADE,
  current_affinity INT DEFAULT 0, -- -100 to 100
  relationship_type VARCHAR(50) DEFAULT 'neutral', -- neutral, amico, amante, mercenario, ostile
  memory_snippets JSONB[] DEFAULT '{}', -- Array of important interactions
  last_interaction TIMESTAMP,
  knows_player_secrets JSONB DEFAULT '{}', -- Information learned about player
  current_mood VARCHAR(50) DEFAULT 'neutral', -- happy, angry, suspicious, cheerful, sad
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NPC Inventory (what they carry)
CREATE TABLE IF NOT EXISTS npc_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(npc_id, item_id)
);

-- Character-NPC Relationships (affinity tracking)
CREATE TABLE IF NOT EXISTS character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  current_affinity INT DEFAULT 0, -- -100 to 100
  relationship_type VARCHAR(50) DEFAULT 'neutral', -- neutral, amico, amante, mercenario, ostile
  last_talked TIMESTAMP,
  first_met TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, npc_id)
);

-- Dialogue History (conversation logs)
CREATE TABLE IF NOT EXISTS dialogue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  player_message TEXT NOT NULL,
  npc_response TEXT NOT NULL,
  affinity_delta INT DEFAULT 0, -- Change in affinity from this interaction
  emotion VARCHAR(50), -- emotion conveyed by NPC response
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quests (quest templates)
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  quest_giver_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
  difficulty INT DEFAULT 1, -- 1-10 scaling
  quest_type VARCHAR(50), -- kill, collect, deliver, protect, discover, explore
  requirements TEXT, -- JSON stringified conditions
  rewards_gold INT DEFAULT 0,
  rewards_experience INT DEFAULT 0,
  rewards_loot JSONB DEFAULT '{}', -- Items as rewards
  rewards_affinity INT DEFAULT 0, -- Affinity change on completion
  time_limit_hours INT, -- NULL = no time limit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character Quest Progress (per-character quest state)
CREATE TABLE IF NOT EXISTS character_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'accepted', -- accepted, in_progress, completed, failed, abandoned
  progress INT DEFAULT 0, -- 0-100 percentage
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  rewards_collected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, quest_id)
);

-- Companion Recruitment (recruiting NPCs to party)
CREATE TABLE IF NOT EXISTS companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'recruited', -- recruited, active, dismissed, dead
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recruitment_cost_gold INT,
  monthly_wage_gold INT,
  last_paid TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, npc_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_npc_state ON npc_state(npc_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships ON character_relationships(character_id);
CREATE INDEX IF NOT EXISTS idx_npc_relationships ON character_relationships(npc_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_history ON dialogue_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_npc ON dialogue_history(npc_id);
CREATE INDEX IF NOT EXISTS idx_character_quests ON character_quests(character_id);
CREATE INDEX IF NOT EXISTS idx_quest_status ON character_quests(status);
CREATE INDEX IF NOT EXISTS idx_quest_giver ON quests(quest_giver_id);
CREATE INDEX IF NOT EXISTS idx_companions ON companions(character_id);
CREATE INDEX IF NOT EXISTS idx_companions_npc ON companions(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_inventory ON npc_inventory(npc_id);
