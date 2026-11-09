/**
 * Encounter Service
 * 
 * Generates random encounters during travel:
 * - Combat encounters (30%)
 * - NPC meetings (30%)
 * - Treasure discoveries (20%)
 * - Hazards (20%)
 * 
 * Scales difficulty based on party level and terrain
 */

import { generateNarrative } from './gemini.js';

class EncounterService {
  /**
   * Encounter type distribution
   */
  static ENCOUNTER_TYPES = {
    combat: { weight: 30, description: 'Combat Encounter' },
    npc_meeting: { weight: 30, description: 'NPC Meeting' },
    treasure: { weight: 20, description: 'Treasure Discovery' },
    hazard: { weight: 20, description: 'Environmental Hazard' }
  };

  /**
   * Generate random encounter based on difficulty and terrain
   */
  static generateRandomEncounter(terrain, difficulty, character = {}) {
    // Weighted random selection
    const typeKey = this._selectRandomType();
    
    const encounter = {
      type: typeKey,
      difficulty: Math.min(10, Math.max(1, difficulty)),
      terrain: terrain,
      character_level: character.level || 1,
      timestamp: new Date()
    };

    // Add type-specific data
    switch (typeKey) {
      case 'combat':
        encounter.enemies = this._generateEnemies(difficulty, character.level || 1);
        encounter.duration_rounds = Math.ceil(Math.random() * 5) + 3; // 3-8 rounds
        break;
      
      case 'npc_meeting':
        encounter.npc_role = this._selectNPCRole();
        encounter.npc_attitude = this._selectAttitude();
        break;
      
      case 'treasure':
        encounter.treasure_type = this._selectTreasureType();
        encounter.rarity = this._selectRarity(difficulty);
        break;
      
      case 'hazard':
        encounter.hazard_type = this._selectHazardType(terrain);
        encounter.damage_potential = difficulty * 5; // 5-50 damage
        break;
    }

    return encounter;
  }

  /**
   * Select random encounter type using weighted distribution
   */
  static _selectRandomType() {
    const totalWeight = Object.values(this.ENCOUNTER_TYPES)
      .reduce((sum, type) => sum + type.weight, 0);
    
    let rand = Math.random() * totalWeight;
    
    for (const [type, config] of Object.entries(this.ENCOUNTER_TYPES)) {
      rand -= config.weight;
      if (rand <= 0) return type;
    }
    
    return 'combat'; // Fallback
  }

  /**
   * Generate combat enemy stats
   */
  static _generateEnemies(difficulty, partyLevel) {
    const enemyCount = Math.ceil(Math.random() * 3) + 1; // 1-4 enemies
    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const hp = difficulty * 10 + Math.random() * 10;
      const ac = 10 + Math.floor(difficulty / 2);
      
      enemies.push({
        id: `enemy_${i}`,
        name: this._generateEnemyName(difficulty),
        type: this._selectEnemyType(difficulty),
        hp: Math.ceil(hp),
        max_hp: Math.ceil(hp),
        ac: ac,
        attack_bonus: Math.floor(difficulty / 2),
        damage_dice: `${Math.max(1, Math.floor(difficulty / 2))}d6+${Math.floor(difficulty / 3)}`
      });
    }

    return enemies;
  }

  /**
   * Generate enemy name based on difficulty
   */
  static _generateEnemyName(difficulty) {
    const lowDifficulty = ['Goblin', 'Rat', 'Wolf', 'Orc Scout'];
    const midDifficulty = ['Orc Warrior', 'Dark Elf', 'Bandit Leader', 'Undead Knight'];
    const highDifficulty = ['Dragon', 'Lich', 'Demon', 'Ancient Dragon'];

    let pool;
    if (difficulty <= 2) pool = lowDifficulty;
    else if (difficulty <= 5) pool = midDifficulty;
    else pool = highDifficulty;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Select enemy type
   */
  static _selectEnemyType(difficulty) {
    const types = ['humanoid', 'beast', 'undead', 'magical', 'construct'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Select NPC role for meetings
   */
  static _selectNPCRole() {
    const roles = [
      'Wandering Merchant',
      'Lost Traveler',
      'Retired Adventurer',
      'Mysterious Stranger',
      'Fellow Adventurer',
      'Brigand',
      'Pilgrim',
      'Scholar'
    ];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  /**
   * Select NPC attitude toward party
   */
  static _selectAttitude() {
    const attitudes = ['friendly', 'neutral', 'suspicious', 'hostile'];
    const weights = [40, 35, 20, 5]; // Mostly friendly
    
    let rand = Math.random() * 100;
    let cumulative = 0;
    
    for (let i = 0; i < attitudes.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) return attitudes[i];
    }
    
    return 'neutral';
  }

  /**
   * Select treasure type
   */
  static _selectTreasureType() {
    const types = [
      'Gold and Gems',
      'Magical Item',
      'Ancient Artifact',
      'Rare Herbs',
      'Treasure Map',
      'Jewelry',
      'Weapons',
      'Spellbook'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Select item rarity based on difficulty
   */
  static _selectRarity(difficulty) {
    if (difficulty <= 1) return 'common';
    if (difficulty <= 2) return 'common';
    if (difficulty <= 3) return 'uncommon';
    if (difficulty <= 4) return 'uncommon';
    if (difficulty <= 6) return 'rare';
    if (difficulty <= 8) return 'very_rare';
    return 'legendary';
  }

  /**
   * Select hazard type based on terrain
   */
  static _selectHazardType(terrain) {
    const hazardsByTerrain = {
      Coast: ['Storm', 'Tidal Wave', 'Sea Monster', 'Shipwreck'],
      Mountain: ['Avalanche', 'Rockslide', 'Blizzard', 'Thin Air'],
      Forest: ['Wildfire', 'Flash Flood', 'Quicksand', 'Predator Attack'],
      Desert: ['Sandstorm', 'Heatstroke', 'Mirage', 'Quicksand'],
      Frontier: ['Unknown Creature', 'Ancient Trap', 'Magical Storm', 'Dimensional Rift']
    };

    const hazards = hazardsByTerrain[terrain] || hazardsByTerrain.Frontier;
    return hazards[Math.floor(Math.random() * hazards.length)];
  }

  /**
   * Generate immersive encounter description via Gemini
   * Falls back to template if API unavailable
   */
  static async generateEncounterDescription(encounter, context = {}) {
    const locationName = context.from || 'Unknown Location';
    const terrain = context.terrain || encounter.terrain || 'Wild Land';

    try {
      let prompt = '';

      switch (encounter.type) {
        case 'combat':
          prompt = `Generate a tense, immersive description of combat encounter in ${terrain} near ${locationName}.
          ${encounter.enemies.length} enemies attack: ${encounter.enemies.map(e => e.name).join(', ')}.
          Keep it to 3 sentences, focus on immediate danger and atmosphere.`;
          break;

        case 'npc_meeting':
          prompt = `Generate a brief, engaging description of meeting a ${encounter.npc_role} in ${terrain}.
          They seem ${encounter.npc_attitude} toward you. 2-3 sentences, immersive tone.`;
          break;

        case 'treasure':
          prompt = `Generate an exciting description of discovering ${encounter.treasure_type} (${encounter.rarity} rarity) in ${terrain}.
          2-3 sentences, focus on the moment of discovery and wonder.`;
          break;

        case 'hazard':
          prompt = `Generate a desperate description of encountering ${encounter.hazard_type} hazard in ${terrain}.
          The danger level is ${encounter.difficulty}/10. 2-3 sentences, immediate peril.`;
          break;
      }

      const description = await generateNarrative(prompt, {
        encounter_type: encounter.type,
        difficulty: encounter.difficulty,
        terrain: terrain,
        location: locationName
      });

      return description;
    } catch (err) {
      // Fallback to template description
      return this._getTemplateDescription(encounter, terrain, locationName);
    }
  }

  /**
   * Get template description if Gemini unavailable
   */
  static _getTemplateDescription(encounter, terrain, locationName) {
    const templates = {
      combat: [
        `The shadows move. Creatures emerge from the ${terrain}—combat is unavoidable!`,
        `A battle erupts! Enemies surge toward you with weapons drawn.`,
        `Combat! The ${terrain} becomes a battlefield.`
      ],
      npc_meeting: [
        `A figure emerges from the ${terrain}. They look at you with interest.`,
        `Someone approaches on the trail. What do you do?`,
        `An NPC appears! They seem to want to talk.`
      ],
      treasure: [
        `Something glints in the ${terrain}. You've found treasure!`,
        `An object of value lies before you. Perhaps fortune is yours!`,
        `Treasure discovered! Riches await.`
      ],
      hazard: [
        `Danger! A ${terrain} hazard threatens your party.`,
        `Environmental peril! You must act quickly to survive.`,
        `Hazard ahead! The ${terrain} becomes treacherous.`
      ]
    };

    const typeTemplates = templates[encounter.type] || templates.combat;
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
  }

  /**
   * Assign rewards for encounter completion
   */
  static assignRewards(encounter, partyLevel = 1) {
    let gold = 0;
    let experience = 0;
    const loot = [];

    switch (encounter.type) {
      case 'combat':
        // Combat rewards scale with difficulty
        gold = Math.ceil(encounter.difficulty * 15 + Math.random() * 20);
        experience = Math.ceil(encounter.difficulty * 50 + Math.random() * 50);
        
        // Small chance for loot drop
        if (Math.random() < 0.3 + (encounter.difficulty * 0.05)) {
          loot.push({
            type: 'Combat Drop',
            name: `${encounter.enemies[0]?.name || 'Defeated'} Loot`,
            rarity: encounter.difficulty > 5 ? 'rare' : 'uncommon'
          });
        }
        break;

      case 'npc_meeting':
        // NPC meetings can give rewards for negotiation
        if (encounter.npc_attitude === 'friendly') {
          gold = Math.ceil(Math.random() * 20 + 10);
          experience = 25;
        } else if (encounter.npc_attitude === 'suspicious') {
          gold = 0;
          experience = 10;
        }
        break;

      case 'treasure':
        // Treasure encounters give most value
        gold = Math.ceil(encounter.difficulty * 25 + Math.random() * 50);
        experience = Math.ceil(encounter.difficulty * 25);
        loot.push({
          type: encounter.treasure_type,
          rarity: encounter.rarity,
          value: gold
        });
        break;

      case 'hazard':
        // Hazards give minimal reward
        if (Math.random() < 0.5) {
          gold = Math.ceil(Math.random() * 10 + 5);
          experience = 15;
        }
        break;
    }

    return {
      gold: Math.max(0, gold),
      experience: Math.max(0, experience),
      loot: loot,
      success: true
    };
  }

  /**
   * Calculate damage taken from hazard encounter
   */
  static calculateHazardDamage(encounter, defenseRoll = 10) {
    const baseDamage = encounter.damage_potential || (encounter.difficulty * 5);
    
    // Higher defense roll reduces damage
    const reduction = Math.max(0, defenseRoll - 10) * 0.1;
    const finalDamage = Math.ceil(baseDamage * (1 - reduction));

    return {
      base_damage: baseDamage,
      defense_roll: defenseRoll,
      damage_taken: finalDamage,
      damage_reduced: baseDamage - finalDamage
    };
  }

  /**
   * Get encounter difficulty modifier
   * Used for scaling rewards and challenges
   */
  static getDifficultyModifier(characterLevel, encounterDifficulty) {
    const diff = encounterDifficulty - characterLevel;
    
    if (diff <= -5) return 0.2; // Way too easy
    if (diff <= -2) return 0.5; // Easy
    if (diff <= 2) return 1.0; // Balanced
    if (diff <= 5) return 1.5; // Hard
    return 2.0; // Way too hard
  }
}

export default EncounterService;
