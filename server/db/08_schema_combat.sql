-- ============================================================================
-- Phase 3D: Combat System Database Schema
-- ============================================================================
-- Tables for combat encounters, enemies, abilities, loot, and actions
-- ============================================================================

-- ============================================================================
-- ENEMIES: Enemy definitions and base stats
-- ============================================================================

CREATE TABLE IF NOT EXISTS enemies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  race VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- human, orc, dragon, goblin, undead, beast, etc
  level INT NOT NULL DEFAULT 1,
  health INT NOT NULL DEFAULT 20,
  max_health INT NOT NULL DEFAULT 20,
  armor_class INT NOT NULL DEFAULT 12,
  base_damage INT NOT NULL DEFAULT 5,
  experience_reward INT NOT NULL DEFAULT 100,
  abilities JSONB DEFAULT '[]', -- Array of ability IDs
  loot_table JSONB DEFAULT '{}', -- {item_id: drop_chance}
  traits JSONB DEFAULT '{}', -- Special abilities or immunities
  difficulty VARCHAR DEFAULT 'medium', -- easy, medium, hard, extreme
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_level CHECK (level > 0),
  CONSTRAINT valid_health CHECK (health >= 0),
  CONSTRAINT valid_ac CHECK (armor_class >= 8 AND armor_class <= 20),
  CONSTRAINT valid_damage CHECK (base_damage > 0)
);

CREATE INDEX idx_enemies_type ON enemies(type);
CREATE INDEX idx_enemies_difficulty ON enemies(difficulty);
CREATE INDEX idx_enemies_level ON enemies(level);

-- ============================================================================
-- ABILITIES: Ability/Skill library
-- ============================================================================

CREATE TABLE IF NOT EXISTS abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR NOT NULL, -- attack, heal, buff, debuff, utility, status
  subtype VARCHAR, -- melee, ranged, aoe, support, etc
  base_damage INT DEFAULT 0,
  base_healing INT DEFAULT 0,
  mana_cost INT DEFAULT 0,
  cooldown INT DEFAULT 0, -- turns
  range VARCHAR DEFAULT 'melee', -- melee, ranged (10), aoe (5), all
  duration INT DEFAULT 0, -- turns (0 = instant)
  character_classes VARCHAR[] DEFAULT ARRAY[]::VARCHAR[], -- warrior, mage, rogue, paladin
  effect_json JSONB DEFAULT '{}', -- {armor: +5, dodge: 30%, poison: 5/turn}
  crit_multiplier FLOAT DEFAULT 1.0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_cooldown CHECK (cooldown >= 0),
  CONSTRAINT valid_mana CHECK (mana_cost >= 0)
);

CREATE INDEX idx_abilities_type ON abilities(type);
CREATE INDEX idx_abilities_name ON abilities(name);

-- ============================================================================
-- CHARACTER ABILITIES: Learned abilities per character
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  ability_id UUID NOT NULL REFERENCES abilities(id),
  level_learned INT DEFAULT 1,
  times_used INT DEFAULT 0,
  last_used_at TIMESTAMP,
  learned_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(character_id, ability_id),
  CONSTRAINT valid_level CHECK (level_learned > 0)
);

CREATE INDEX idx_char_abilities_character ON character_abilities(character_id);
CREATE INDEX idx_char_abilities_ability ON character_abilities(ability_id);

-- ============================================================================
-- COMBAT ENCOUNTERS: Combat sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  location_id UUID, -- Where combat happens
  enemy_ids UUID[] NOT NULL, -- Array of participating enemy instance IDs
  companion_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Recruited companions fighting
  status VARCHAR DEFAULT 'active', -- active, completed, fled, character_dead
  round INT DEFAULT 1,
  current_turn INT DEFAULT 0, -- Index in turn_order
  turn_order JSONB NOT NULL DEFAULT '[]', -- [{type: character|enemy, id: uuid, initiative: int}]
  character_stats_snapshot JSONB, -- Character stats at start (for rollback if needed)
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  winner_id UUID, -- character_id or enemy_id
  
  CONSTRAINT valid_round CHECK (round > 0)
);

CREATE INDEX idx_encounters_character ON combat_encounters(character_id);
CREATE INDEX idx_encounters_status ON combat_encounters(status);
CREATE INDEX idx_encounters_location ON combat_encounters(location_id);
CREATE INDEX idx_encounters_started ON combat_encounters(started_at);

-- ============================================================================
-- COMBAT ACTIONS: Action history during combat
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  round INT NOT NULL,
  turn_order_index INT NOT NULL, -- Position in turn order
  
  actor_type VARCHAR NOT NULL, -- character, enemy, companion
  actor_id UUID NOT NULL, -- actual character/enemy ID
  
  action_type VARCHAR NOT NULL, -- attack, ability, defend, item, flee
  ability_id UUID REFERENCES abilities(id),
  
  target_type VARCHAR, -- character, enemy, companion
  target_id UUID, -- Who the action targets
  
  roll_d20 INT, -- Raw d20 roll (1-20)
  roll_modifier INT, -- STR/DEX/INT modifier
  roll_total INT, -- d20 + modifier
  target_ac INT, -- What they needed to beat
  
  result VARCHAR, -- hit, miss, crit, dodge, immune, blocked
  damage_dealt INT DEFAULT 0,
  healing_done INT DEFAULT 0,
  
  effects_applied JSONB DEFAULT '[]', -- [{type: poison, amount: 5, duration: 3}]
  combat_state_after JSONB, -- Snapshot of all participant HPs after action
  
  action_duration_ms INT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_d20 CHECK (roll_d20 >= 1 AND roll_d20 <= 20)
);

CREATE INDEX idx_actions_encounter ON combat_actions(encounter_id);
CREATE INDEX idx_actions_round ON combat_actions(encounter_id, round);
CREATE INDEX idx_actions_actor ON combat_actions(actor_type, actor_id);
CREATE INDEX idx_actions_target ON combat_actions(target_type, target_id);
CREATE INDEX idx_actions_result ON combat_actions(result);

-- ============================================================================
-- COMBAT LOOT: Loot distribution from encounters
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_loot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  gold_amount INT DEFAULT 0,
  experience INT DEFAULT 0,
  
  items JSONB DEFAULT '[]', -- [{item_id: uuid, quantity: 1}]
  
  claimed_at TIMESTAMP,
  expired_at TIMESTAMP, -- Loot expires after 24 hours if not claimed
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_gold CHECK (gold_amount >= 0),
  CONSTRAINT valid_xp CHECK (experience >= 0)
);

CREATE INDEX idx_loot_encounter ON combat_loot(encounter_id);
CREATE INDEX idx_loot_character ON combat_loot(character_id);
CREATE INDEX idx_loot_claimed ON combat_loot(claimed_at);

-- ============================================================================
-- COMBAT STATS: Statistics per character
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_combat_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  
  -- Combat history
  total_encounters INT DEFAULT 0,
  encounters_won INT DEFAULT 0,
  encounters_lost INT DEFAULT 0,
  encounters_fled INT DEFAULT 0,
  
  -- Damage stats
  total_damage_dealt INT DEFAULT 0,
  total_damage_taken INT DEFAULT 0,
  total_healing_done INT DEFAULT 0,
  
  -- Action counts
  total_attacks INT DEFAULT 0,
  successful_attacks INT DEFAULT 0,
  attack_accuracy FLOAT DEFAULT 0.0,
  
  critical_hits INT DEFAULT 0,
  critical_hit_rate FLOAT DEFAULT 0.0,
  
  -- Ability usage
  total_abilities_cast INT DEFAULT 0,
  favorite_ability_id UUID REFERENCES abilities(id),
  
  -- Reward totals
  total_experience_gained INT DEFAULT 0,
  total_gold_earned INT DEFAULT 0,
  total_enemies_defeated INT DEFAULT 0,
  
  -- Timestamps
  first_combat_at TIMESTAMP,
  last_combat_at TIMESTAMP,
  last_combat_duration_seconds INT,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_combat_stats_character ON character_combat_stats(character_id);

-- ============================================================================
-- ENEMY INSTANCES: Runtime instances of enemies in combat
-- ============================================================================

CREATE TABLE IF NOT EXISTS enemy_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
  enemy_id UUID NOT NULL REFERENCES enemies(id),
  
  -- Combat state
  current_health INT NOT NULL,
  max_health INT NOT NULL,
  armor_class INT NOT NULL,
  
  -- Status effects (temporary)
  status_effects JSONB DEFAULT '{}', -- {poison: {damage: 5, rounds: 3}, blind: {rounds: 2}}
  
  -- Combat tracking
  actions_taken INT DEFAULT 0,
  damage_dealt INT DEFAULT 0,
  damage_taken INT DEFAULT 0,
  
  defeated_at TIMESTAMP,
  defeated_by_actor_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enemy_instances_encounter ON enemy_instances(encounter_id);
CREATE INDEX idx_enemy_instances_enemy ON enemy_instances(enemy_id);

-- ============================================================================
-- COMBAT ABILITIES CACHE: Pre-calculated ability matrices for combat
-- ============================================================================

CREATE TABLE IF NOT EXISTS combat_ability_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ability_id UUID NOT NULL REFERENCES abilities(id),
  character_level INT NOT NULL,
  
  -- Calculated values
  actual_damage INT,
  actual_healing INT,
  actual_cooldown INT,
  accuracy_bonus INT,
  
  calculated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(ability_id, character_level)
);

CREATE INDEX idx_ability_matrix_ability ON combat_ability_matrix(ability_id);
CREATE INDEX idx_ability_matrix_level ON combat_ability_matrix(character_level);

-- ============================================================================
-- VIEWs: Combat queries
-- ============================================================================

-- View: Active combats
CREATE OR REPLACE VIEW active_combats AS
SELECT 
  ce.id,
  ce.character_id,
  c.name as character_name,
  ce.round,
  ce.status,
  ARRAY_LENGTH(ce.enemy_ids, 1) as enemy_count,
  ce.started_at,
  NOW() - ce.started_at as duration
FROM combat_encounters ce
JOIN characters c ON c.id = ce.character_id
WHERE ce.status = 'active';

-- View: Combat history
CREATE OR REPLACE VIEW recent_combat_history AS
SELECT 
  ce.id,
  c.name as character_name,
  ce.round,
  ce.status,
  ce.winner_id,
  ce.started_at,
  ce.completed_at,
  EXTRACT(EPOCH FROM (ce.completed_at - ce.started_at)) as duration_seconds
FROM combat_encounters ce
JOIN characters c ON c.id = ce.character_id
WHERE ce.status IN ('completed', 'fled', 'character_dead')
ORDER BY ce.completed_at DESC
LIMIT 100;

-- View: Character combat performance
CREATE OR REPLACE VIEW character_combat_performance AS
SELECT 
  c.id,
  c.name,
  ccs.total_encounters,
  ccs.encounters_won,
  ROUND((ccs.encounters_won::FLOAT / NULLIF(ccs.total_encounters, 0)) * 100, 2) as win_rate,
  ccs.attack_accuracy,
  ccs.critical_hit_rate,
  ccs.total_damage_dealt,
  ccs.total_damage_taken,
  ccs.total_enemies_defeated,
  ccs.total_experience_gained,
  ccs.total_gold_earned
FROM characters c
LEFT JOIN character_combat_stats ccs ON c.id = ccs.character_id;

-- ============================================================================
-- FUNCTIONS: Combat utility functions
-- ============================================================================

-- Function to initialize combat stats for a character
CREATE OR REPLACE FUNCTION init_character_combat_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO character_combat_stats (character_id)
  VALUES (NEW.id)
  ON CONFLICT (character_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-create combat stats when character created
DROP TRIGGER IF EXISTS trigger_init_combat_stats ON characters;
CREATE TRIGGER trigger_init_combat_stats
AFTER INSERT ON characters
FOR EACH ROW
EXECUTE FUNCTION init_character_combat_stats();

-- Function to roll initiative
CREATE OR REPLACE FUNCTION roll_initiative(dex_modifier INT DEFAULT 0)
RETURNS INT AS $$
BEGIN
  RETURN FLOOR(random() * 20) + 1 + dex_modifier;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate damage with modifiers
CREATE OR REPLACE FUNCTION calculate_damage(
  base_damage INT,
  strength_mod INT,
  ability_mod INT,
  crit_hit BOOLEAN DEFAULT FALSE
)
RETURNS INT AS $$
DECLARE
  total_damage INT;
BEGIN
  total_damage := base_damage + strength_mod;
  IF crit_hit THEN
    total_damage := total_damage * 2; -- Double damage on crit
  END IF;
  total_damage := GREATEST(1, total_damage); -- Minimum 1 damage
  RETURN total_damage;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DONE: Phase 3D Combat Schema
-- ============================================================================
