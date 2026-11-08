/**
 * Seed Abilities
 * 
 * Creates base ability library and assigns to character classes
 */

import { v4 as uuidv4 } from 'uuid';

export const seedAbilities = async (db) => {
  // Define all abilities
  const abilities = [
    // ========================================================================
    // WARRIOR ABILITIES
    // ========================================================================
    {
      name: 'Slash',
      description: 'A basic melee slash attack',
      type: 'attack',
      subtype: 'melee',
      base_damage: 10,
      mana_cost: 0,
      cooldown: 0,
      range: 'melee',
      character_classes: ['warrior'],
      effect_json: { accuracy: 0.85 },
      crit_multiplier: 1.5
    },
    {
      name: 'Shield Bash',
      description: 'Slam enemy with shield, dealing moderate damage and stunning',
      type: 'attack',
      subtype: 'melee',
      base_damage: 8,
      mana_cost: 5,
      cooldown: 2,
      range: 'melee',
      character_classes: ['warrior'],
      effect_json: { stun_duration: 1, stun_chance: 0.6 },
      crit_multiplier: 1.0
    },
    {
      name: 'Whirlwind Attack',
      description: 'Spin around dealing damage to all nearby enemies',
      type: 'attack',
      subtype: 'aoe',
      base_damage: 12,
      mana_cost: 15,
      cooldown: 3,
      range: 'aoe',
      duration: 0,
      character_classes: ['warrior'],
      effect_json: { radius: 5, accuracy: 0.75 },
      crit_multiplier: 1.3
    },
    {
      name: 'Fortify',
      description: 'Strengthen defenses, reducing incoming damage',
      type: 'buff',
      subtype: 'support',
      base_damage: 0,
      mana_cost: 10,
      cooldown: 2,
      range: 'melee',
      duration: 3,
      character_classes: ['warrior'],
      effect_json: { armor_bonus: 5, damage_reduction: 0.3 },
      crit_multiplier: 1.0
    },
    {
      name: 'Charge',
      description: 'Rush forward with sword extended, dealing heavy damage',
      type: 'attack',
      subtype: 'ranged',
      base_damage: 15,
      mana_cost: 12,
      cooldown: 3,
      range: 'ranged',
      character_classes: ['warrior'],
      effect_json: { knockback: 2, accuracy: 0.9 },
      crit_multiplier: 1.8
    },

    // ========================================================================
    // MAGE ABILITIES
    // ========================================================================
    {
      name: 'Fireball',
      description: 'Launch a ball of fire at enemies',
      type: 'attack',
      subtype: 'aoe',
      base_damage: 15,
      mana_cost: 20,
      cooldown: 2,
      range: 'aoe',
      character_classes: ['mage'],
      effect_json: { radius: 5, burn_damage: 3, burn_duration: 2 },
      crit_multiplier: 2.0
    },
    {
      name: 'Frost Bolt',
      description: 'Freeze an enemy with ice magic',
      type: 'attack',
      subtype: 'ranged',
      base_damage: 12,
      mana_cost: 12,
      cooldown: 1,
      range: 'ranged',
      character_classes: ['mage'],
      effect_json: { slow_duration: 2, slow_factor: 0.5, accuracy: 0.9 },
      crit_multiplier: 1.5
    },
    {
      name: 'Teleport',
      description: 'Instantly move to a new location, avoiding damage',
      type: 'utility',
      subtype: 'support',
      base_damage: 0,
      mana_cost: 25,
      cooldown: 3,
      range: 'all',
      character_classes: ['mage'],
      effect_json: { dodge_next_attack: true },
      crit_multiplier: 1.0
    },
    {
      name: 'Mana Shield',
      description: 'Convert mana into protective shield',
      type: 'buff',
      subtype: 'support',
      base_damage: 0,
      mana_cost: 15,
      cooldown: 2,
      range: 'melee',
      duration: 2,
      character_classes: ['mage'],
      effect_json: { shield_strength: 20, mana_drain_per_damage: 0.5 },
      crit_multiplier: 1.0
    },
    {
      name: 'Chain Lightning',
      description: 'Send lightning between multiple enemies',
      type: 'attack',
      subtype: 'aoe',
      base_damage: 18,
      mana_cost: 30,
      cooldown: 3,
      range: 'aoe',
      character_classes: ['mage'],
      effect_json: { targets_hit: 3, chain_range: 8, stun_chance: 0.4 },
      crit_multiplier: 1.7
    },

    // ========================================================================
    // ROGUE ABILITIES
    // ========================================================================
    {
      name: 'Backstab',
      description: 'A deadly melee attack from behind',
      type: 'attack',
      subtype: 'melee',
      base_damage: 18,
      mana_cost: 8,
      cooldown: 2,
      range: 'melee',
      character_classes: ['rogue'],
      effect_json: { backstab_bonus: 1.5, accuracy: 0.95 },
      crit_multiplier: 2.5
    },
    {
      name: 'Dodge',
      description: 'Skillfully evade the next attack',
      type: 'buff',
      subtype: 'support',
      base_damage: 0,
      mana_cost: 5,
      cooldown: 1,
      range: 'melee',
      duration: 1,
      character_classes: ['rogue'],
      effect_json: { dodge_chance: 0.8 },
      crit_multiplier: 1.0
    },
    {
      name: 'Poison Strike',
      description: 'Coat blade with poison dealing ongoing damage',
      type: 'attack',
      subtype: 'melee',
      base_damage: 10,
      mana_cost: 10,
      cooldown: 2,
      range: 'melee',
      character_classes: ['rogue'],
      effect_json: { poison_damage: 5, poison_duration: 3 },
      crit_multiplier: 1.4
    },
    {
      name: 'Shadow Clone',
      description: 'Create a shadow clone to confuse enemies',
      type: 'utility',
      subtype: 'support',
      base_damage: 0,
      mana_cost: 20,
      cooldown: 3,
      range: 'all',
      character_classes: ['rogue'],
      effect_json: { confusion_duration: 2, evasion_bonus: 0.3 },
      crit_multiplier: 1.0
    },
    {
      name: 'Assassination',
      description: 'Instantly kill weak enemies or deal massive damage',
      type: 'attack',
      subtype: 'melee',
      base_damage: 25,
      mana_cost: 30,
      cooldown: 4,
      range: 'melee',
      character_classes: ['rogue'],
      effect_json: { 
        instant_kill_threshold: 0.3,
        instant_kill_damage: 9999,
        accuracy: 0.7
      },
      crit_multiplier: 3.0
    },

    // ========================================================================
    // UNIVERSAL ABILITIES (all classes)
    // ========================================================================
    {
      name: 'First Aid',
      description: 'Basic healing ability',
      type: 'heal',
      subtype: 'support',
      base_damage: 0,
      base_healing: 20,
      mana_cost: 15,
      cooldown: 1,
      range: 'melee',
      character_classes: ['warrior', 'mage', 'rogue'],
      effect_json: { heal_self_only: false },
      crit_multiplier: 1.0
    },
    {
      name: 'Rest',
      description: 'Recover health and mana',
      type: 'buff',
      subtype: 'support',
      base_damage: 0,
      base_healing: 50,
      mana_cost: 0,
      cooldown: 3,
      range: 'melee',
      duration: 0,
      character_classes: ['warrior', 'mage', 'rogue'],
      effect_json: { channel_time: 2, interrupt_on_damage: true },
      crit_multiplier: 1.0
    }
  ];

  // Insert abilities
  const abilityIds = {};
  
  for (const ability of abilities) {
    const result = await db.query(
      `INSERT INTO abilities 
       (name, description, type, subtype, base_damage, base_healing, mana_cost, 
        cooldown, range, duration, character_classes, effect_json, crit_multiplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        ability.name,
        ability.description,
        ability.type,
        ability.subtype,
        ability.base_damage,
        ability.base_healing || 0,
        ability.mana_cost,
        ability.cooldown,
        ability.range,
        ability.duration || 0,
        ability.character_classes,
        JSON.stringify(ability.effect_json),
        ability.crit_multiplier
      ]
    );

    abilityIds[ability.name] = result.rows[0].id;
  }

  console.log(`✅ Created ${Object.keys(abilityIds).length} abilities`);

  return abilityIds;
};

/**
 * Assign starting abilities to characters by class
 */
export const assignStartingAbilities = async (characterId, characterClass, db) => {
  // Define starting abilities per class
  const startingAbilities = {
    warrior: ['Slash', 'Shield Bash', 'Fortify', 'First Aid'],
    mage: ['Frost Bolt', 'Fireball', 'Mana Shield', 'First Aid'],
    rogue: ['Backstab', 'Dodge', 'Poison Strike', 'First Aid']
  };

  const abilities = startingAbilities[characterClass.toLowerCase()] || [];

  for (const abilityName of abilities) {
    // Get ability ID
    const result = await db.query(
      'SELECT id FROM abilities WHERE name = $1',
      [abilityName]
    );

    if (result.rows.length > 0) {
      const abilityId = result.rows[0].id;

      // Assign to character
      await db.query(
        `INSERT INTO character_abilities (character_id, ability_id, level_learned)
         VALUES ($1, $2, 1)
         ON CONFLICT (character_id, ability_id) DO NOTHING`,
        [characterId, abilityId]
      );
    }
  }

  return true;
};

/**
 * Get all abilities for a class
 */
export const getAbilitiesByClass = async (characterClass, db) => {
  const result = await db.query(
    `SELECT * FROM abilities 
     WHERE $1 = ANY(character_classes)
     ORDER BY type, name`,
    [characterClass.toLowerCase()]
  );

  return result.rows;
};

/**
 * Learn new ability for character
 */
export const learnAbility = async (characterId, abilityId, level, db) => {
  const result = await db.query(
    `INSERT INTO character_abilities (character_id, ability_id, level_learned)
     VALUES ($1, $2, $3)
     ON CONFLICT (character_id, ability_id) DO UPDATE
     SET times_used = character_abilities.times_used + 1,
         last_used_at = NOW()
     RETURNING *`,
    [characterId, abilityId, level]
  );

  return result.rows[0];
};
