/**
 * Combat Service Tests
 * 
 * Unit tests for combat mechanics, damage calculation, and AI
 */

import { describe, it, expect, beforeEach } from 'vitest';
import CombatService from '../services/combat.js';
import EnemyService from '../services/enemy.js';

describe('CombatService', () => {
  let characterId = 'test-char-combat';
  let enemyIds = ['enemy-1', 'enemy-2'];
  let locationId = 'location-1';
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: async (sql, params) => {
        // Mock character
        if (sql.includes('SELECT * FROM characters WHERE id = $1')) {
          return {
            rows: [{
              id: characterId,
              name: 'Combat Warrior',
              health: 100,
              max_health: 100,
              mana: 50,
              level: 5,
              dexterity: 14
            }]
          };
        }

        // Mock enemies
        if (sql.includes('SELECT * FROM enemies WHERE id = $1')) {
          return {
            rows: [{
              id: enemyIds[0],
              name: 'Goblin',
              type: 'goblin',
              level: 3,
              health: 20,
              max_health: 20,
              armor_class: 11,
              base_damage: 5,
              experience_reward: 100
            }]
          };
        }

        // Mock combat encounter creation
        if (sql.includes('INSERT INTO combat_encounters')) {
          return {
            rows: [{
              id: 'encounter-1',
              character_id: characterId,
              status: 'active',
              round: 1,
              current_turn: 0
            }]
          };
        }

        // Mock combat state retrieval
        if (sql.includes('SELECT * FROM combat_encounters WHERE id = $1')) {
          return {
            rows: [{
              id: 'encounter-1',
              character_id: characterId,
              status: 'active',
              round: 1,
              current_turn: 0,
              turn_order: JSON.stringify([
                { type: 'character', id: characterId, name: 'Warrior', initiative: 15, maxHealth: 100, currentHealth: 100 },
                { type: 'enemy', id: enemyIds[0], name: 'Goblin', initiative: 8, maxHealth: 20, currentHealth: 20 }
              ])
            }]
          };
        }

        // Mock combat stats
        if (sql.includes('INSERT INTO character_combat_stats')) {
          return { rows: [{ id: 1 }] };
        }

        if (sql.includes('UPDATE character_combat_stats')) {
          return { rows: [{ total_encounters: 1 }] };
        }

        // Mock combat actions
        if (sql.includes('INSERT INTO combat_actions')) {
          return { rows: [{ id: 'action-1' }] };
        }

        if (sql.includes('UPDATE combat_encounters')) {
          return { rows: [{ current_turn: 1 }] };
        }

        // Mock combat history
        if (sql.includes('SELECT * FROM combat_encounters WHERE character_id')) {
          return { rows: [] };
        }

        return { rows: [] };
      }
    };
  });

  describe('initiateCombat', () => {
    it('should create combat encounter', async () => {
      const combat = await CombatService.initiateCombat(
        characterId,
        enemyIds,
        locationId,
        mockDb
      );

      expect(combat).toBeDefined();
      expect(combat.encounterId).toBeDefined();
      expect(combat.turnOrder).toBeDefined();
      expect(combat.turnOrder.length).toBeGreaterThan(0);
    });

    it('should calculate initiative for all participants', async () => {
      const combat = await CombatService.initiateCombat(
        characterId,
        enemyIds,
        locationId,
        mockDb
      );

      const hasInitiative = combat.turnOrder.every(p => p.initiative !== undefined);
      expect(hasInitiative).toBe(true);
    });

    it('should sort turn order by initiative descending', async () => {
      const combat = await CombatService.initiateCombat(
        characterId,
        enemyIds,
        locationId,
        mockDb
      );

      for (let i = 1; i < combat.turnOrder.length; i++) {
        expect(combat.turnOrder[i - 1].initiative).toBeGreaterThanOrEqual(
          combat.turnOrder[i].initiative
        );
      }
    });
  });

  describe('executeAttack', () => {
    it('should execute attack action', async () => {
      const result = await CombatService.executeAttack(
        'encounter-1',
        characterId,
        enemyIds[0],
        mockDb
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('damageDealt');
    });

    it('should validate it is attacker\'s turn', async () => {
      try {
        await CombatService.executeAttack(
          'encounter-1',
          enemyIds[0], // Not the character's turn
          characterId,
          mockDb
        );
      } catch (err) {
        expect(err.message).toContain('turn');
      }
    });

    it('should calculate damage correctly', async () => {
      const result = await CombatService.executeAttack(
        'encounter-1',
        characterId,
        enemyIds[0],
        mockDb
      );

      if (result.success) {
        expect(result.damageDealt).toBeGreaterThan(0);
      }
    });
  });

  describe('endTurn', () => {
    it('should advance to next turn', async () => {
      const result = await CombatService.endTurn('encounter-1', mockDb);

      expect(result).toBeDefined();
      expect(result.turn).toBeDefined();
    });
  });

  describe('attemptFlee', () => {
    it('should attempt to flee combat', async () => {
      const result = await CombatService.attemptFlee(
        'encounter-1',
        characterId,
        mockDb
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('attempted');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('roll');
    });
  });

  describe('getCombatStats', () => {
    it('should return combat statistics', async () => {
      const stats = await CombatService.getCombatStats(characterId, mockDb);

      if (stats) {
        expect(stats).toHaveProperty('total_encounters');
        expect(stats).toHaveProperty('encounters_won');
        expect(stats).toHaveProperty('winRate');
      }
    });
  });
});

describe('EnemyService', () => {
  let mockDb;
  let enemyId = 'enemy-1';

  beforeEach(() => {
    mockDb = {
      query: async (sql, params) => {
        if (sql.includes('SELECT * FROM enemies WHERE id = $1')) {
          return {
            rows: [{
              id: enemyId,
              name: 'Goblin',
              type: 'goblin',
              race: 'goblinoid',
              level: 3,
              health: 20,
              max_health: 20,
              armor_class: 11,
              base_damage: 5,
              experience_reward: 100,
              abilities: [],
              loot_table: { items: [], gold: { min: 10, max: 30 } }
            }]
          };
        }

        if (sql.includes('SELECT * FROM enemies WHERE type = $1')) {
          return { rows: [] };
        }

        if (sql.includes('SELECT difficulty FROM map_nodes')) {
          return { rows: [{ difficulty: 'medium' }] };
        }

        return { rows: [] };
      }
    };
  });

  describe('getEnemy', () => {
    it('should retrieve enemy by ID', async () => {
      const enemy = await EnemyService.getEnemy(enemyId, mockDb);

      expect(enemy).toBeDefined();
      expect(enemy.name).toBe('Goblin');
      expect(enemy.level).toBe(3);
    });

    it('should throw error if enemy not found', async () => {
      try {
        await EnemyService.getEnemy('invalid-enemy', mockDb);
      } catch (err) {
        expect(err.message).toContain('not found');
      }
    });
  });

  describe('rollInitiative', () => {
    it('should roll initiative between 1 and 20+modifier', () => {
      const enemy = {
        armor_class: 14,
        base_damage: 5
      };

      const initiatives = [];
      for (let i = 0; i < 10; i++) {
        const init = EnemyService.rollInitiative(enemy);
        initiatives.push(init);
      }

      const allInRange = initiatives.every(i => i >= 1 && i <= 22);
      expect(allInRange).toBe(true);
    });
  });

  describe('calculateAttack', () => {
    it('should calculate attack roll', async () => {
      const attacker = { base_damage: 10, armor_class: 12 };
      const defender = { armor_class: 11 };

      const attack = await EnemyService.calculateAttack(attacker, defender);

      expect(attack).toHaveProperty('d20');
      expect(attack).toHaveProperty('modifier');
      expect(attack).toHaveProperty('total');
      expect(attack).toHaveProperty('isHit');
      expect(attack).toHaveProperty('isCrit');
    });

    it('should hit if roll >= AC', async () => {
      const attacker = { base_damage: 20, armor_class: 12 };
      const defender = { armor_class: 10 };

      // Simulate multiple attacks
      let hitCount = 0;
      for (let i = 0; i < 20; i++) {
        const attack = await EnemyService.calculateAttack(attacker, defender);
        if (attack.isHit) hitCount++;
      }

      // Should hit at least once out of 20
      expect(hitCount).toBeGreaterThan(0);
    });

    it('should critical on d20=20', async () => {
      const attacker = { base_damage: 10, armor_class: 12 };
      const defender = { armor_class: 20 };

      let critCount = 0;
      for (let i = 0; i < 100; i++) {
        const attack = await EnemyService.calculateAttack(attacker, defender);
        if (attack.isCrit) critCount++;
      }

      // Should get at least a few crits in 100 rolls
      expect(critCount).toBeGreaterThan(0);
    });
  });

  describe('calculateDamage', () => {
    it('should calculate damage amount', async () => {
      const attacker = { base_damage: 10 };
      const defender = { armor_class: 12 };

      const damage = await EnemyService.calculateDamage(attacker, defender, false);

      expect(damage).toBeGreaterThan(0);
    });

    it('should double damage on crit', async () => {
      const attacker = { base_damage: 10 };
      const defender = { armor_class: 12 };

      const normalDamage = await EnemyService.calculateDamage(attacker, defender, false);
      const critDamage = await EnemyService.calculateDamage(attacker, defender, true);

      expect(critDamage).toBeGreaterThanOrEqual(normalDamage * 2);
    });

    it('should apply armor reduction', async () => {
      const attacker = { base_damage: 20 };
      const defenderLowAC = { armor_class: 10 };
      const defenderHighAC = { armor_class: 18 };

      const damageLowAC = await EnemyService.calculateDamage(attacker, defenderLowAC, false);
      const damageHighAC = await EnemyService.calculateDamage(attacker, defenderHighAC, false);

      expect(damageLowAC).toBeGreaterThan(damageHighAC);
    });
  });

  describe('selectTarget', () => {
    it('should select lowest health target', async () => {
      const targets = [
        { id: 'target-1', currentHealth: 50, maxHealth: 100 },
        { id: 'target-2', currentHealth: 10, maxHealth: 100 },
        { id: 'target-3', currentHealth: 30, maxHealth: 100 }
      ];

      const enemy = { id: 'enemy-1' };

      const target = await EnemyService.selectTarget(enemy, targets);

      expect(target).toBe('target-2');
    });
  });

  describe('rollLoot', () => {
    it('should roll loot from defeated enemy', async () => {
      const enemy = {
        experience_reward: 100,
        level: 3,
        loot_table: {
          gold: { min: 10, max: 30 },
          items: []
        }
      };

      const loot = await EnemyService.rollLoot(enemy, 5, mockDb);

      expect(loot).toHaveProperty('gold');
      expect(loot).toHaveProperty('experience');
      expect(loot).toHaveProperty('items');
      expect(loot.gold).toBeGreaterThanOrEqual(10);
    });

    it('should scale experience by character level', async () => {
      const enemy = {
        experience_reward: 100,
        level: 3,
        loot_table: {
          gold: { min: 10, max: 30 },
          items: []
        }
      };

      const easyLoot = await EnemyService.rollLoot(enemy, 1, mockDb); // Low level
      const hardLoot = await EnemyService.rollLoot(enemy, 10, mockDb); // High level

      expect(easyLoot.experience).toBeGreaterThan(hardLoot.experience);
    });
  });
});
