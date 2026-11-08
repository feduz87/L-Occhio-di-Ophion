/**
 * Combat Service
 * 
 * Manages:
 * - Combat encounters and turn order
 * - Action execution and validation
 * - Damage calculation and effects
 * - Reward distribution
 * - Combat state management
 */

import { v4 as uuidv4 } from 'uuid';
import EnemyService from './enemy.js';

class CombatService {
  /**
   * Initiate combat between character and enemies
   */
  static async initiateCombat(characterId, enemyIds, locationId, db) {
    // Get character
    const charResult = await db.query(
      'SELECT * FROM characters WHERE id = $1',
      [characterId]
    );

    if (charResult.rows.length === 0) {
      throw new Error('Character not found');
    }

    const character = charResult.rows[0];

    // Get enemies
    const enemyDetails = [];
    for (const enemyId of enemyIds) {
      const enemy = await EnemyService.getEnemy(enemyId, db);
      enemyDetails.push(enemy);
    }

    // Calculate initiative for all participants
    const characterInit = Math.floor(Math.random() * 20) + 1 + Math.floor(character.dexterity / 2 - 5);
    
    const turnOrder = [
      {
        type: 'character',
        id: characterId,
        name: character.name,
        initiative: characterInit,
        maxHealth: character.health,
        currentHealth: character.health
      }
    ];

    // Add enemies to turn order
    for (const enemy of enemyDetails) {
      const enemyInit = Math.floor(Math.random() * 20) + 1 + Math.floor((enemy.armor_class - 10) / 2);
      turnOrder.push({
        type: 'enemy',
        id: enemy.id,
        name: enemy.name,
        initiative: enemyInit,
        maxHealth: enemy.max_health,
        currentHealth: enemy.max_health
      });
    }

    // Sort by initiative (descending)
    turnOrder.sort((a, b) => b.initiative - a.initiative);

    // Create combat encounter
    const encounterId = uuidv4();

    const result = await db.query(
      `INSERT INTO combat_encounters 
       (id, character_id, location_id, enemy_ids, status, turn_order, character_stats_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        encounterId,
        characterId,
        locationId,
        enemyIds,
        'active',
        JSON.stringify(turnOrder),
        JSON.stringify({
          health: character.health,
          mana: character.mana || 0,
          level: character.level
        })
      ]
    );

    // Initialize character combat stats if not exists
    await db.query(
      `INSERT INTO character_combat_stats (character_id)
       VALUES ($1)
       ON CONFLICT (character_id) DO NOTHING`,
      [characterId]
    );

    // Update combat stats
    await db.query(
      `UPDATE character_combat_stats 
       SET total_encounters = total_encounters + 1,
           first_combat_at = COALESCE(first_combat_at, NOW()),
           last_combat_at = NOW()
       WHERE character_id = $1`,
      [characterId]
    );

    return {
      encounterId,
      encounter: result.rows[0],
      turnOrder: turnOrder,
      currentTurn: 0
    };
  }

  /**
   * Get current combat state
   */
  static async getCombatState(encounterId, db) {
    const result = await db.query(
      'SELECT * FROM combat_encounters WHERE id = $1',
      [encounterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Combat encounter not found');
    }

    const encounter = result.rows[0];

    // Parse turn order
    const turnOrder = JSON.parse(encounter.turn_order);

    return {
      encounterId,
      status: encounter.status,
      round: encounter.round,
      currentTurn: encounter.current_turn,
      participants: turnOrder,
      currentParticipant: turnOrder[encounter.current_turn],
      startedAt: encounter.started_at
    };
  }

  /**
   * Execute attack action
   */
  static async executeAttack(encounterId, attackerId, targetId, db) {
    const combatState = await this.getCombatState(encounterId, db);

    // Validate it's attacker's turn
    if (combatState.currentParticipant.id !== attackerId) {
      throw new Error('Not your turn');
    }

    const attacker = combatState.participants.find(p => p.id === attackerId);
    const target = combatState.participants.find(p => p.id === targetId);

    if (!attacker || !target) {
      throw new Error('Attacker or target not found');
    }

    // Calculate attack
    const attack = await EnemyService.calculateAttack(
      { base_damage: 10, armor_class: 12 }, // Simplified for now
      target
    );

    let damage = 0;
    if (attack.isHit) {
      damage = await EnemyService.calculateDamage(
        { base_damage: 10 },
        target,
        attack.isCrit
      );
    }

    // Apply damage to target
    const newHealth = Math.max(0, target.currentHealth - damage);

    // Record action
    await db.query(
      `INSERT INTO combat_actions 
       (encounter_id, round, turn_order_index, actor_type, actor_id, 
        action_type, target_type, target_id, roll_d20, roll_modifier, 
        roll_total, target_ac, result, damage_dealt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        encounterId,
        combatState.round,
        combatState.currentTurn,
        attacker.type || 'character',
        attackerId,
        'attack',
        target.type || 'character',
        targetId,
        attack.d20,
        attack.modifier,
        attack.total,
        attack.targetAC,
        attack.isHit ? (attack.isCrit ? 'crit' : 'hit') : 'miss',
        damage
      ]
    );

    return {
      success: attack.isHit,
      isCrit: attack.isCrit,
      damageDealt: damage,
      targetRemainingHealth: newHealth,
      targetDefeated: newHealth === 0
    };
  }

  /**
   * Use ability action
   */
  static async useAbility(encounterId, actorId, abilityId, targetId, db) {
    const combatState = await this.getCombatState(encounterId, db);

    // Validate it's actor's turn
    if (combatState.currentParticipant.id !== actorId) {
      throw new Error('Not your turn');
    }

    // Get ability
    const abilityResult = await db.query(
      'SELECT * FROM abilities WHERE id = $1',
      [abilityId]
    );

    if (abilityResult.rows.length === 0) {
      throw new Error('Ability not found');
    }

    const ability = abilityResult.rows[0];

    // Check cooldown (simplified - just check if used recently)
    const actor = combatState.participants.find(p => p.id === actorId);
    const target = combatState.participants.find(p => p.id === targetId);

    if (!actor || !target) {
      throw new Error('Actor or target not found');
    }

    // Calculate ability effect
    let result = 'used';
    let damage = 0;
    let healing = 0;

    if (ability.type === 'attack') {
      // Attack ability
      const attack = await EnemyService.calculateAttack(
        { base_damage: ability.base_damage || 10 },
        target
      );

      if (attack.isHit) {
        damage = await EnemyService.calculateDamage(
          { base_damage: ability.base_damage || 10 },
          target,
          attack.isCrit
        );
        result = attack.isCrit ? 'crit' : 'hit';
      } else {
        result = 'miss';
      }
    } else if (ability.type === 'heal') {
      healing = ability.base_healing || 20;
      result = 'healed';
    }

    // Record action
    await db.query(
      `INSERT INTO combat_actions 
       (encounter_id, round, turn_order_index, actor_type, actor_id, 
        action_type, ability_id, target_type, target_id, result, 
        damage_dealt, healing_done)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        encounterId,
        combatState.round,
        combatState.currentTurn,
        actor.type || 'character',
        actorId,
        'ability',
        abilityId,
        target.type || 'character',
        targetId,
        result,
        damage,
        healing
      ]
    );

    return {
      abilityUsed: ability.name,
      result: result,
      damageDealt: damage,
      healingDone: healing,
      targetDefeated: target.currentHealth - damage <= 0
    };
  }

  /**
   * End current turn and advance to next participant
   */
  static async endTurn(encounterId, db) {
    const combatState = await this.getCombatState(encounterId, db);

    // Move to next turn
    const nextTurn = (combatState.currentTurn + 1) % combatState.participants.length;
    let nextRound = combatState.round;

    // If we cycled back to start, increment round
    if (nextTurn === 0) {
      nextRound++;
    }

    await db.query(
      `UPDATE combat_encounters 
       SET current_turn = $1, round = $2
       WHERE id = $3`,
      [nextTurn, nextRound, encounterId]
    );

    return {
      round: nextRound,
      turn: nextTurn,
      nextParticipant: combatState.participants[nextTurn]
    };
  }

  /**
   * Defend action (reduce next damage)
   */
  static async executeDefend(encounterId, defenderId, db) {
    const combatState = await this.getCombatState(encounterId, db);

    // Validate it's defender's turn
    if (combatState.currentParticipant.id !== defenderId) {
      throw new Error('Not your turn');
    }

    // Record defend action
    await db.query(
      `INSERT INTO combat_actions 
       (encounter_id, round, turn_order_index, actor_type, actor_id, 
        action_type, target_type, target_id, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        encounterId,
        combatState.round,
        combatState.currentTurn,
        'character',
        defenderId,
        'defend',
        'character',
        defenderId,
        'defended'
      ]
    );

    return {
      defendingUntilNextTurn: true,
      damageReduction: 0.5 // 50% damage reduction next hit
    };
  }

  /**
   * Attempt to flee combat
   */
  static async attemptFlee(encounterId, characterId, db) {
    const encounter = await db.query(
      'SELECT * FROM combat_encounters WHERE id = $1',
      [encounterId]
    );

    if (encounter.rows.length === 0) {
      throw new Error('Combat not found');
    }

    // Flee difficulty: d20 + DEX vs 10 + enemy count
    const fleeRoll = Math.floor(Math.random() * 20) + 1;
    const fleeDC = 10 + encounter.rows[0].enemy_ids.length;

    const success = fleeRoll >= fleeDC;

    if (success) {
      await db.query(
        `UPDATE combat_encounters 
         SET status = 'fled', completed_at = NOW()
         WHERE id = $1`,
        [encounterId]
      );
    }

    return {
      attempted: true,
      success: success,
      roll: fleeRoll,
      dc: fleeDC
    };
  }

  /**
   * End combat and distribute rewards
   */
  static async endCombat(encounterId, winnerId, db) {
    const encounter = await db.query(
      'SELECT * FROM combat_encounters WHERE id = $1',
      [encounterId]
    );

    if (encounter.rows.length === 0) {
      throw new Error('Combat encounter not found');
    }

    const combat = encounter.rows[0];

    // Determine winner and loser
    const isCharacterWinner = winnerId === combat.character_id;
    const status = isCharacterWinner ? 'completed' : 'character_dead';

    // Update encounter
    await db.query(
      `UPDATE combat_encounters 
       SET status = $1, winner_id = $2, completed_at = NOW()
       WHERE id = $3`,
      [status, winnerId, encounterId]
    );

    // If character won, distribute rewards
    if (isCharacterWinner) {
      const rewards = await this.calculateRewards(combat.character_id, combat.enemy_ids, db);
      await this.distributeRewards(combat.character_id, rewards, db);

      return {
        status: 'victory',
        rewards: rewards
      };
    } else {
      // Character lost
      return {
        status: 'defeat',
        penalties: {
          experience: -100,
          gold: -50
        }
      };
    }
  }

  /**
   * Calculate rewards from defeated enemies
   */
  static async calculateRewards(characterId, enemyIds, db) {
    // Get character level for scaling
    const charResult = await db.query(
      'SELECT level FROM characters WHERE id = $1',
      [characterId]
    );

    const character = charResult.rows[0];
    let totalGold = 0;
    let totalXP = 0;
    const items = [];

    // Calculate loot per enemy
    for (const enemyId of enemyIds) {
      const enemy = await EnemyService.getEnemy(enemyId, db);
      const loot = await EnemyService.rollLoot(enemy, character.level, db);

      totalGold += loot.gold;
      totalXP += loot.experience;
      items.push(...loot.items);
    }

    return {
      gold: totalGold,
      experience: totalXP,
      items: items
    };
  }

  /**
   * Distribute rewards to character
   */
  static async distributeRewards(characterId, rewards, db) {
    // Add gold
    if (rewards.gold > 0) {
      await db.query(
        'UPDATE characters SET gold = gold + $1 WHERE id = $2',
        [rewards.gold, characterId]
      );
    }

    // Add experience
    if (rewards.experience > 0) {
      await db.query(
        'UPDATE characters SET experience = experience + $1 WHERE id = $2',
        [rewards.experience, characterId]
      );
    }

    // Add items to inventory
    for (const item of rewards.items) {
      await db.query(
        `INSERT INTO character_inventory (character_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, item_id) DO UPDATE
         SET quantity = character_inventory.quantity + $3`,
        [characterId, item.itemId, item.quantity || 1]
      );
    }

    // Update combat stats
    await db.query(
      `UPDATE character_combat_stats 
       SET encounters_won = encounters_won + 1,
           total_experience_gained = total_experience_gained + $1,
           total_gold_earned = total_gold_earned + $2,
           last_combat_at = NOW()
       WHERE character_id = $3`,
      [rewards.experience, rewards.gold, characterId]
    );

    return true;
  }

  /**
   * Get combat history for character
   */
  static async getCombatHistory(characterId, limit = 20, db) {
    const result = await db.query(
      `SELECT * FROM combat_encounters 
       WHERE character_id = $1 AND status IN ('completed', 'character_dead', 'fled')
       ORDER BY completed_at DESC
       LIMIT $2`,
      [characterId, limit]
    );

    return result.rows;
  }

  /**
   * Get action history for combat
   */
  static async getActionHistory(encounterId, db) {
    const result = await db.query(
      `SELECT * FROM combat_actions 
       WHERE encounter_id = $1
       ORDER BY round, turn_order_index, created_at`,
      [encounterId]
    );

    return result.rows;
  }

  /**
   * Check if combat is active
   */
  static async isActive(encounterId, db) {
    const result = await db.query(
      'SELECT status FROM combat_encounters WHERE id = $1',
      [encounterId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].status === 'active';
  }

  /**
   * Get combat statistics for character
   */
  static async getCombatStats(characterId, db) {
    const result = await db.query(
      'SELECT * FROM character_combat_stats WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const stats = result.rows[0];
    const winRate = stats.total_encounters > 0 
      ? ((stats.encounters_won / stats.total_encounters) * 100).toFixed(1)
      : 0;

    return {
      ...stats,
      winRate: parseFloat(winRate)
    };
  }
}

export default CombatService;
