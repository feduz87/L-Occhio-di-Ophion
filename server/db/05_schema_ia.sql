-- ============================================================================
-- IA & Narrative System: Prompts, Caching, Session Context
-- ============================================================================

CREATE TABLE IF NOT EXISTS ia_prompts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA-256 of prompt
  prompt_text TEXT NOT NULL,
  response_json JSONB NOT NULL, -- Cached IA response
  model_used VARCHAR(50) DEFAULT 'gemini-2.0-flash',
  tokens_input INT,
  tokens_output INT,
  cost_cents DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INT DEFAULT 1
);

-- IA System Prompts (injected to all conversations)
CREATE TABLE IF NOT EXISTS ia_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key VARCHAR(255) UNIQUE NOT NULL,
  version INT DEFAULT 1,
  context_type VARCHAR(50), -- character_intro, npc_dialogue, combat, quest_generation
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character narrative context (game state fed to IA)
CREATE TABLE IF NOT EXISTS character_ia_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE UNIQUE,
  current_narrative_state JSONB DEFAULT '{}', -- {location, party_status, recent_events, ...}
  dialogue_history JSONB[], -- Array of recent dialogue exchanges
  known_npcs JSONB DEFAULT '{}', -- {npc_id: {name, affinity, notes}, ...}
  discovered_secrets JSONB DEFAULT '{}', -- Lore pieces discovered
  last_ia_prompt_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dialogue exchanges (for training/analysis)
CREATE TABLE IF NOT EXISTS dialogue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  dialogue_round INT DEFAULT 0,
  player_input TEXT NOT NULL,
  ia_response_json JSONB NOT NULL, -- Full JSON response from IA
  affinity_change INT DEFAULT 0,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Language & Lore system
CREATE TABLE IF NOT EXISTS language_glossary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_key VARCHAR(50), -- "quenya", "sindarin", "khuzdul", "ovestron"
  word_id VARCHAR(255) UNIQUE NOT NULL,
  word_ancient VARCHAR(255),
  word_italian VARCHAR(255),
  pronunciation VARCHAR(255),
  part_of_speech VARCHAR(50), -- noun, verb, adjective
  etymology TEXT,
  usage_context VARCHAR(100), -- combat, greetings, magic
  tier INT DEFAULT 1, -- Unlock level for player
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lore discoveries (unlockable world knowledge)
CREATE TABLE IF NOT EXISTS lore_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lore_key VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  lore_category VARCHAR(50), -- history, pantheon, bloodlines, magic, artifacts
  discovery_method VARCHAR(50), -- reading, npc_dialogue, location_found, quest_reward
  required_check_type VARCHAR(50), -- arcana, history, perception, religion
  required_check_dc INT DEFAULT 10,
  character_discovery_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character discovered lore
CREATE TABLE IF NOT EXISTS character_lore_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  lore_entry_id UUID NOT NULL REFERENCES lore_entries(id) ON DELETE CASCADE,
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, lore_entry_id)
);

-- Narrative flags (world state)
CREATE TABLE IF NOT EXISTS narrative_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  flag_key VARCHAR(255) NOT NULL,
  flag_value JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, flag_key)
);

CREATE INDEX idx_prompt_cache_hash ON ia_prompts_cache(prompt_hash);
CREATE INDEX idx_dialogue_log_character ON dialogue_log(character_id);
CREATE INDEX idx_dialogue_log_npc ON dialogue_log(npc_id);
CREATE INDEX idx_language_glossary_language ON language_glossary(language_key);
CREATE INDEX idx_lore_discoveries_character ON character_lore_discoveries(character_id);
CREATE INDEX idx_narrative_flags_character ON narrative_flags(character_id);
