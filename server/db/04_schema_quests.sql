-- ============================================================================
-- Quest & Activity System: Procedurally generated missions
-- ============================================================================

CREATE TABLE IF NOT EXISTS quests_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description_template TEXT NOT NULL,
  quest_type VARCHAR(50), -- escort, retrieve, hunt, explore, gather, negotiate
  difficulty_tier INT DEFAULT 1, -- 1-5
  reward_xp_base INT,
  reward_gold_base INT,
  reward_items JSONB[], -- Array of possible reward items
  requirements_level INT DEFAULT 1,
  requires_skills TEXT[], -- array of skill names
  duration_hours_base INT DEFAULT 24, -- Expected completion time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active quests assigned to characters
CREATE TABLE IF NOT EXISTS active_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_template_id UUID NOT NULL REFERENCES quests_templates(id) ON DELETE CASCADE,
  given_by_npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, abandoned
  objective_text TEXT,
  progress_data JSONB DEFAULT '{}', -- {kills: 0, items_collected: 0, ...}
  deadline_timestamp TIMESTAMP,
  given_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dispatch missions (delegate work to NPC)
CREATE TABLE IF NOT EXISTS delegated_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  mission_type VARCHAR(50), -- hunt, gather, scout, negotiate
  description TEXT,
  payment_offered INT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, npc_died
  start_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_timestamp TIMESTAMP,
  success BOOLEAN,
  result_text TEXT, -- Narrative outcome
  npc_injuries JSONB DEFAULT '{}', -- {wound_type: "bleeding", severity: 3}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop inventory (merchant stocks)
CREATE TABLE IF NOT EXISTS shop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  quantity_available INT DEFAULT 999,
  price_override INT, -- NULL = use default price from items_base
  rarity_weight INT DEFAULT 1, -- Higher = more likely to restock
  last_restocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(npc_id, item_id)
);

-- Crafting commissions (contracts with smiths, alchemists, etc.)
CREATE TABLE IF NOT EXISTS crafting_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  crafter_npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  commission_type VARCHAR(50), -- forge, alchemy, weaving, enchanting
  requested_item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'negotiating', -- negotiating, accepted, in_progress, ready, completed
  materials_required JSONB NOT NULL, -- {item_id: quantity, ...}
  materials_provided JSONB DEFAULT '{}', -- {item_id: quantity, ...}
  cost_gold INT,
  completion_days INT DEFAULT 3,
  ready_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time system (game world clock)
CREATE TABLE IF NOT EXISTS game_time (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE UNIQUE,
  current_hour INT DEFAULT 8, -- 0-23
  current_day INT DEFAULT 1,
  current_month INT DEFAULT 1,
  current_year INT DEFAULT 1,
  time_scale FLOAT DEFAULT 1.0, -- Game hours per real second
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event triggers (promises to NPCs, world events)
CREATE TABLE IF NOT EXISTS event_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  event_key VARCHAR(255) NOT NULL,
  event_type VARCHAR(50), -- promise, reminder, random_encounter, weather, siege
  trigger_condition JSONB NOT NULL, -- {type: "time", when_hour: 20, when_day: 3}
  related_npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, triggered, resolved, failed
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_active_quests_character ON active_quests(character_id);
CREATE INDEX idx_active_quests_status ON active_quests(status);
CREATE INDEX idx_delegated_missions_character ON delegated_missions(character_id);
CREATE INDEX idx_delegated_missions_npc ON delegated_missions(npc_id);
CREATE INDEX idx_shop_inventory_npc ON shop_inventory(npc_id);
CREATE INDEX idx_crafting_commissions_character ON crafting_commissions(character_id);
CREATE INDEX idx_event_triggers_character ON event_triggers(character_id);
