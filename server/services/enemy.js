/**
 * Enemy Service
 * 
 * Manages:
 * - Enemy creation and spawning
 * - Enemy stats and abilities
 * - Enemy scaling by difficulty
 * - Loot table generation
 * - Enemy AI decision making
 */

import { v4 as uuidv4 } from 'uuid';

class EnemyService {
  /**
   * Get enemy definition by ID
   */
  static async getEnemy(enemyId, db) {
    const result = await db.query(
      'SELECT * FROM enemies WHERE id = $1',
      [enemyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Enemy not found');
    }

    return result.rows[0];
  }

  /**
   * Get all enemy types (templates)
   */
  static async getAllEnemies(limit = 50, offset = 0, db) {
    const result = await db.query(
      'SELECT * FROM enemies ORDER BY difficulty, level LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Get enemies by type
   */
  static async getEnemiesByType(type, db) {
    const result = await db.query(
      'SELECT * FROM enemies WHERE type = $1 ORDER BY level',
      [type]
    );

    return result.rows;
  }

  /**
   * Get enemies by difficulty
   */
  static async getEnemiesByDifficulty(difficulty, db) {
    const result = await db.query(
      'SELECT * FROM enemies WHERE difficulty = $1 ORDER BY level',
      [difficulty]
    );

    return result.rows;
  }

  /**
   * Spawn a single enemy at location
   * Scales by difficulty
   */
  static async spawnEnemy(locationId, difficulty = 'medium', db) {
    // Map difficulty to enemy pool
    const difficultyMap = {
      easy: ['goblin', 'skeletal_warrior', 'bandit'],
      medium: ['orc', 'troll', 'dark_knight'],
      hard: ['dragon', 'demon', 'lich'],
      extreme: ['arch_demon', 'ancient_dragon', 'abomination']
    };

    const enemyTypes = difficultyMap[difficulty] || difficultyMap.medium;
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    // Get random enemy of this type
    const enemyResult = await db.query(
      'SELECT * FROM enemies WHERE type = $1 ORDER BY RANDOM() LIMIT 1',
      [randomType]
    );

    if (enemyResult.rows.length === 0) {
      throw new Error('No enemies available for spawning');
    }

    const enemy = enemyResult.rows[0];

    // Create enemy instance
    const instanceId = uuidv4();

    return {
      id: instanceId,
      ...enemy,
      currentHealth: enemy.max_health,
      location: locationId,
      spawnedAt: new Date()
    };
  }

  /**
   * Spawn group of enemies
   */
  static async spawnEnemyGroup(locationId, groupSize, difficulty = 'medium', db) {
    const group = [];

    for (let i = 0; i < groupSize; i++) {
      const enemy = await this.spawnEnemy(locationId, difficulty, db);
      group.push(enemy);
    }

    return group;
  }

  /**
   * Roll initiative for enemy
   */
  static async rollInitiative(enemy) {
    // DEX modifier from enemy stats (if available)
    const dexModifier = Math.floor((enemy.armor_class - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1;
    return roll + dexModifier;
  }

  /**
   * Calculate attack roll
   * Returns: {roll, modifier, total, isHit, isCrit}
   */
  static async calculateAttack(attacker, defender) {
    // d20 roll
    const d20 = Math.floor(Math.random() * 20) + 1;
    
    // Base attack modifier (based on level and damage)
    const attackModifier = Math.floor(attacker.base_damage / 5);
    
    const rollTotal = d20 + attackModifier;
    const isHit = rollTotal >= defender.armor_class;
    const isCrit = d20 === 20;

    return {
      d20,
      modifier: attackModifier,
      total: rollTotal,
      targetAC: defender.armor_class,
      isHit,
      isCrit
    };
  }

  /**
   * Calculate damage dealt
   */
  static async calculateDamage(attacker, defender, isCrit = false) {
    // Base damage from attacker
    let damage = attacker.base_damage;

    // Add randomness (d6)
    const variability = Math.floor(Math.random() * 6) + 1;
    damage += variability;

    // Armor reduction (10% per AC point over 10)
    const armorReduction = Math.max(0, (defender.armor_class - 10) * 0.05);
    damage = Math.floor(damage * (1 - armorReduction));

    // Critical hit doubles damage
    if (isCrit) {
      damage *= 2;
    }

    // Minimum 1 damage
    return Math.max(1, damage);
  }

  /**
   * Get enemy abilities
   */
  static async getEnemyAbilities(enemyId, db) {
    const enemy = await this.getEnemy(enemyId, db);

    if (!enemy.abilities || enemy.abilities.length === 0) {
      return [];
    }

    // Get ability definitions
    const result = await db.query(
      'SELECT * FROM abilities WHERE id = ANY($1)',
      [enemy.abilities]
    );

    return result.rows;
  }

  /**
   * Get loot table for enemy
   */
  static async getLootTable(enemy) {
    if (!enemy.loot_table || Object.keys(enemy.loot_table).length === 0) {
      return {
        gold: {
          min: Math.floor(enemy.experience_reward * 0.1),
          max: Math.floor(enemy.experience_reward * 0.3)
        },
        experience: enemy.experience_reward
      };
    }

    return enemy.loot_table;
  }

  /**
   * Roll loot for defeated enemy
   */
  static async rollLoot(enemy, characterLevel, db) {
    const loot = {
      gold: 0,
      experience: 0,
      items: []
    };

    // Gold: variable based on enemy
    const lootTable = await this.getLootTable(enemy);
    loot.gold = Math.floor(
      Math.random() * (lootTable.gold.max - lootTable.gold.min + 1) + lootTable.gold.min
    );

    // Experience: scales with character level
    const levelDelta = characterLevel - enemy.level;
    let xpReward = lootTable.experience;

    if (levelDelta < -5) {
      xpReward *= 1.5; // Bonus for hard fights
    } else if (levelDelta > 5) {
      xpReward *= 0.5; // Penalty for easy fights
    }

    loot.experience = Math.floor(xpReward);

    // Items: random from loot table
    if (lootTable.items && Array.isArray(lootTable.items)) {
      for (const itemDrop of lootTable.items) {
        const roll = Math.random();
        if (roll < itemDrop.dropChance) {
          loot.items.push({
            itemId: itemDrop.itemId,
            quantity: itemDrop.quantity || 1
          });
        }
      }
    }

    return loot;
  }

  /**
   * Select best target for enemy AI
   */
  static async selectTarget(enemy, availableTargets) {
    // Strategy: attack weakest/most dangerous target
    if (availableTargets.length === 0) {
      return null;
    }

    // Prefer low-health targets (prioritize finishing off)
    const hpPercentages = availableTargets.map(t => ({
      id: t.id,
      hpPercent: t.currentHealth / t.maxHealth
    }));

    hpPercentages.sort((a, b) => a.hpPercent - b.hpPercent);

    return hpPercentages[0].id;
  }

  /**
   * Decide best action for enemy AI
   */
  static async decideBestAction(enemy, targets, abilities, combatState) {
    // Simple AI strategy:
    // 1. If HP < 30% and has heal ability, heal
    // 2. If has AoE and multiple targets, use AoE
    // 3. Otherwise attack strongest target

    const hpPercent = (enemy.currentHealth / enemy.maxHealth) * 100;

    // Strategy 1: Low health + heal available
    if (hpPercent < 30 && abilities.length > 0) {
      const healAbility = abilities.find(a => a.type === 'heal');
      if (healAbility) {
        return {
          type: 'ability',
          abilityId: healAbility.id,
          targetId: enemy.id
        };
      }
    }

    // Strategy 2: Multiple targets + AoE ability
    if (targets.length >= 2 && abilities.length > 0) {
      const aoeAbility = abilities.find(a => a.range === 'aoe');
      if (aoeAbility) {
        return {
          type: 'ability',
          abilityId: aoeAbility.id,
          targetId: targets[0].id
        };
      }
    }

    // Strategy 3: Default attack
    const target = await this.selectTarget(enemy, targets);
    return {
      type: 'attack',
      targetId: target
    };
  }

  /**
   * Get NPC stats for combat
   */
  static async getEnemyStats(enemyId, db) {
    const enemy = await this.getEnemy(enemyId, db);
    const abilities = await this.getEnemyAbilities(enemyId, db);

    return {
      enemy,
      abilities,
      stats: {
        attackPower: enemy.base_damage,
        armor: enemy.armor_class,
        health: enemy.max_health,
        abilitiesCount: abilities.length,
        xpReward: enemy.experience_reward
      }
    };
  }

  /**
   * Search enemies by name
   */
  static async searchEnemies(query, db) {
    const result = await db.query(
      `SELECT * FROM enemies 
       WHERE name ILIKE $1 OR type ILIKE $1 OR race ILIKE $1
       ORDER BY name
       LIMIT 20`,
      [`%${query}%`]
    );

    return result.rows;
  }

  /**
   * Get enemies for location based on difficulty
   */
  static async getEnemiesForLocation(locationId, characterLevel, db) {
    // Determine location difficulty from map node
    const locResult = await db.query(
      'SELECT difficulty FROM map_nodes WHERE id = $1',
      [locationId]
    );

    if (locResult.rows.length === 0) {
      // Default to medium
      return await this.getEnemiesByDifficulty('medium', db);
    }

    const locationDifficulty = locResult.rows[0].difficulty;

    // Get enemies matching location difficulty
    const enemies = await this.getEnemiesByDifficulty(locationDifficulty, db);

    // Scale by character level (prefer enemies within 3 levels)
    return enemies.filter(
      e => Math.abs(e.level - characterLevel) <= 5
    );
  }
}

export default EnemyService;
