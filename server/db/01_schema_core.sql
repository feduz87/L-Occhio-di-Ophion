-- ============================================================================
-- L'Occhio di Ophion - PostgreSQL Schema (Entity-Component Pattern)
-- Core: Users, Characters, Stats, Resources
-- ============================================================================

-- Core entities
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  heritage TEXT NOT NULL,
  race VARCHAR(50) NOT NULL,
  class VARCHAR(50) NOT NULL,
  level INT DEFAULT 1,
  experience_points INT DEFAULT 0,
  masteries_points INT DEFAULT 0,
  current_node_id UUID, -- References to map node
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Character Stats Component
CREATE TABLE IF NOT EXISTS character_stats (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  strength INT DEFAULT 10,
  dexterity INT DEFAULT 10,
  constitution INT DEFAULT 10,
  intelligence INT DEFAULT 10,
  wisdom INT DEFAULT 10,
  charisma INT DEFAULT 10,
  hit_points INT DEFAULT 10,
  hit_points_max INT DEFAULT 10,
  armor_class INT DEFAULT 10,
  initiative_bonus INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character Resources Component
CREATE TABLE IF NOT EXISTS character_resources (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  gold INT DEFAULT 0,
  rations INT DEFAULT 5,
  encumbrance INT DEFAULT 0,
  encumbrance_max INT DEFAULT 100,
  fatigue_level INT DEFAULT 0,
  willpower_slots INT DEFAULT 3,
  willpower_slots_max INT DEFAULT 3,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Character Health & Status Component
CREATE TABLE IF NOT EXISTS character_status (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  health_state VARCHAR(50) DEFAULT 'illeso',
  condition_flags TEXT[],
  diseases TEXT[],
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items Base Component
CREATE TABLE IF NOT EXISTS items_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description_base TEXT NOT NULL,
  lore_secret TEXT,
  item_type VARCHAR(50) NOT NULL,
  rarity VARCHAR(50) DEFAULT 'common',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Stats Component
CREATE TABLE IF NOT EXISTS equipment_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  damage_die VARCHAR(10),
  damage_modifier INT DEFAULT 0,
  armor_bonus INT DEFAULT 0,
  armor_type VARCHAR(50),
  gem_slots INT DEFAULT 0,
  durability_max INT DEFAULT 100,
  durability_current INT DEFAULT 100,
  weight INT DEFAULT 1,
  requires_strength INT DEFAULT 0
);

-- Crafting Ingredients Component
CREATE TABLE IF NOT EXISTS crafting_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  ingredient_type VARCHAR(50),
  tier INT DEFAULT 1,
  crafting_affinity VARCHAR(50),
  stat_boost JSONB DEFAULT '{}'
);

-- Consumables Stats Component
CREATE TABLE IF NOT EXISTS consumables_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  consumable_type VARCHAR(50),
  effect JSONB NOT NULL,
  buff_duration_turns INT DEFAULT 0,
  required_station VARCHAR(100),
  spoilage_days INT DEFAULT 30
);

-- Inventory Component
CREATE TABLE IF NOT EXISTS inventory_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items_base(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  condition_percent INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, item_id)
);

CREATE INDEX idx_inventory_character ON inventory_slots(character_id);
CREATE INDEX idx_inventory_item ON inventory_slots(item_id);
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_items_type ON items_base(item_type);
