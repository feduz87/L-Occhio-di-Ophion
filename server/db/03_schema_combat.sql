-- ============================================================================
-- Combat System: Encounters, Combatants, Action Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  encounter_type VARCHAR(50), -- ambush, duel, group_combat, trap
  status VARCHAR(50) DEFAULT 'active', -- active, won, lost, fled
  round_number INT DEFAULT 0,
  current_turn_combatant_id UUID,
  initiative_order TEXT[], -- Array of combatant IDs in initiative order
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Combatants (player party + enemies/NPCs in combat)
CREATE TABLE IF NOT EXISTS encounter_combatants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  side VARCHAR(50), -- player, enemy
  position VARCHAR(50), -- melee (avanguardia) or ranged (retroguardia)
  hp_current INT NOT NULL,
  initiative_roll INT DEFAULT 0,
  turn_order INT,
  status VARCHAR(50) DEFAULT 'alive', -- alive, unconscious, dead, fled
  action_taken_this_turn BOOLEAN DEFAULT FALSE,
  bonus_action_taken BOOLEAN DEFAULT FALSE,
  reaction_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Combat log (detailed action history)
CREATE TABLE IF NOT EXISTS combat_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  turn_order INT NOT NULL,
  actor_combatant_id UUID NOT NULL REFERENCES encounter_combatants(id) ON DELETE CASCADE,
  action_type VARCHAR(50), -- attack, cast_spell, dodge, use_item, command_ally
  target_combatant_id UUID REFERENCES encounter_combatants(id) ON DELETE SET NULL,
  d20_roll INT,
  vs_target_ac INT,
  hit BOOLEAN,
  damage_roll VARCHAR(20), -- "2d6+3" format
  damage_total INT,
  damage_type VARCHAR(50), -- slashing, piercing, bludgeoning, fire, cold, etc.
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tactical commands (group orders during combat)
CREATE TABLE IF NOT EXISTS tactical_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  turn_number INT,
  commander_id UUID NOT NULL REFERENCES encounter_combatants(id),
  target_id UUID NOT NULL REFERENCES encounter_combatants(id),
  command_type VARCHAR(50), -- defend, focus_fire, use_ability, heal
  description TEXT,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Combat modifiers (buffs, debuffs, conditions)
CREATE TABLE IF NOT EXISTS combat_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_combatant_id UUID NOT NULL REFERENCES encounter_combatants(id) ON DELETE CASCADE,
  modifier_type VARCHAR(50), -- advantage, disadvantage, blessed, cursed, poisoned
  source VARCHAR(100), -- spell_name, item_name, creature_ability
  duration_turns INT, -- -1 for infinite
  bonus_ac INT DEFAULT 0,
  bonus_damage INT DEFAULT 0,
  resistance VARCHAR(50), -- fire, cold, necrotic, etc.
  vulnerability VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_encounters_character ON encounters(character_id);
CREATE INDEX idx_encounter_combatants_encounter ON encounter_combatants(encounter_id);
CREATE INDEX idx_combat_log_encounter ON combat_log(encounter_id);
CREATE INDEX idx_combat_modifiers_combatant ON combat_modifiers(encounter_combatant_id);
