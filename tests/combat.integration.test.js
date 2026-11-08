/**
 * Combat Integration Tests
 * 
 * Full end-to-end combat flow testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import CombatService from '../services/combat.js';
import EnemyService from '../services/enemy.js';
import CharacterService from '../services/character.js';

describe('Combat System Integration', () => {
  let db;
  const dbPath = ':memory:';

  beforeEach(() => {
    db = new Database(dbPath);

    // Create tables from schema
    const schemaPath = path.resolve(process.cwd(), 'server/db/08_schema_combat.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split and execute schema (simple approach for test)
    db.exec(schema);

    // Insert test data
    db.exec(`
      INSERT INTO characters (id, user_id, name, class, level, health, max_health, mana, experience, gold) 
      VALUES ('char-1', 'user-1', 'Warrior', 'warrior', 5, 100, 100, 50, 1000, 500);

      INSERT INTO enemies (id, name, type, race, level, health, max_health, armor_class, base_damage, experience_reward) 
      VALUES 
        ('enemy-1', 'Goblin Scout', 'goblin', 'goblinoid', 3, 20, 20, 11, 5, 100),
        ('enemy-2', 'Orc Warrior', 'orc', 'humanoid', 4, 35, 35, 12, 8, 150),
        ('enemy-3', 'Spider', 'spider', 'beast', 2, 15, 15, 10, 4, 50);

      INSERT INTO abilities (id, name, type, base_damage, base_healing, mana_cost, cooldown, range_type, description)
      VALUES 
        ('ability-slash', 'Slash', 'attack', 8, 0, 0, 0, 'melee', 'Basic attack'),
        ('ability-heal', 'First Aid', 'heal', 0, 15, 10, 2, 'all', 'Heal yourself'),
        ('ability-fireball', 'Fireball', 'attack', 12, 0, 20, 3, 'ranged', 'Ranged fire attack');

      INSERT INTO character_abilities (character_id, ability_id, level_learned)
      VALUES 
        ('char-1', 'ability-slash', 1),
        ('char-1', 'ability-heal', 1);
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('Full Combat Flow', () => {
    it('should complete full combat encounter: init -> attack -> end', async () => {
      // Step 1: Initiate combat
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          const result = stmt.all(...(params || []));
          return { rows: result };
        }
      };

      const combat = await CombatService.initiateCombat(
        'char-1',
        ['enemy-1'],
        'location-1',
        dbWrapper
      );

      expect(combat).toBeDefined();
      expect(combat.turnOrder).toBeDefined();
      expect(combat.turnOrder.length).toBeGreaterThan(0);

      // Step 2: Verify turn order includes character and enemy
      const characterInTurn = combat.turnOrder.some(p => p.id === 'char-1');
      const enemyInTurn = combat.turnOrder.some(p => p.id === 'enemy-1');
      expect(characterInTurn).toBe(true);
      expect(enemyInTurn).toBe(true);

      // Step 3: Execute attack
      const result = await CombatService.executeAttack(
        combat.encounterId,
        'char-1',
        'enemy-1',
        dbWrapper
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');

      if (result.success) {
        expect(result.damageDealt).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle multiple enemies in combat', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      const combat = await CombatService.initiateCombat(
        'char-1',
        ['enemy-1', 'enemy-2'],
        'location-1',
        dbWrapper
      );

      // Should have character + 2 enemies = 3 in turn order
      expect(combat.turnOrder.length).toBe(3);

      // All should have unique positions
      const ids = combat.turnOrder.map(p => p.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('should handle AI decisions for enemies', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      const enemy = await EnemyService.getEnemy('enemy-2', dbWrapper);
      const targets = [
        { id: 'char-1', currentHealth: 50, maxHealth: 100 },
        { id: 'companion-1', currentHealth: 5, maxHealth: 30 }
      ];

      const selectedTarget = await EnemyService.selectTarget(enemy, targets);

      // Should select lowest health
      expect(selectedTarget).toBe('companion-1');
    });

    it('should calculate correct damage with armor class', async () => {
      const attacker = { base_damage: 15, armor_class: 12 };
      const defenderLow = { armor_class: 10 };
      const defenderHigh = { armor_class: 18 };

      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      // Simulate multiple damage rolls
      const damagesLow = [];
      const damagesHigh = [];

      for (let i = 0; i < 20; i++) {
        const dmgLow = await EnemyService.calculateDamage(attacker, defenderLow, false);
        const dmgHigh = await EnemyService.calculateDamage(attacker, defenderHigh, false);
        damagesLow.push(dmgLow);
        damagesHigh.push(dmgHigh);
      }

      // Average damage should be higher for low AC
      const avgLow = damagesLow.reduce((a, b) => a + b) / damagesLow.length;
      const avgHigh = damagesHigh.reduce((a, b) => a + b) / damagesHigh.length;

      expect(avgLow).toBeGreaterThan(avgHigh);
    });
  });

  describe('Combat Mechanics', () => {
    it('should track combat history', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Insert combat encounter
      const encounterId = 'encounter-test-1';
      db.exec(`
        INSERT INTO combat_encounters (id, character_id, location_id, status, round, current_turn, created_at)
        VALUES ('${encounterId}', 'char-1', 'location-1', 'active', 1, 0, datetime('now'));

        INSERT INTO combat_actions (encounter_id, actor_id, action_type, target_id, round, turn_number, result_json, created_at)
        VALUES 
          ('${encounterId}', 'char-1', 'attack', 'enemy-1', 1, 0, '{"damage": 10, "hit": true}', datetime('now')),
          ('${encounterId}', 'enemy-1', 'attack', 'char-1', 1, 1, '{"damage": 5, "hit": true}', datetime('now'));
      `);

      const history = await CombatService.getActionHistory(encounterId, dbWrapper);

      expect(history).toBeDefined();
      expect(history.length).toBe(2);
      expect(history[0].action_type).toBe('attack');
    });

    it('should calculate initiative correctly', () => {
      const enemy = { armor_class: 14, base_damage: 8 };

      const initiatives = [];
      for (let i = 0; i < 50; i++) {
        const init = EnemyService.rollInitiative(enemy);
        initiatives.push(init);
      }

      // All should be within range (1-20 + modifier)
      const allValid = initiatives.every(i => i >= 1 && i <= 22);
      expect(allValid).toBe(true);

      // Should have variance
      const unique = new Set(initiatives).size;
      expect(unique).toBeGreaterThan(1);
    });

    it('should handle critical hits', async () => {
      const attacker = { base_damage: 10, armor_class: 12 };
      const defender = { armor_class: 18 };

      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      let critCount = 0;
      let normalDamageTotal = 0;
      let critDamageTotal = 0;

      for (let i = 0; i < 100; i++) {
        const attack = await EnemyService.calculateAttack(attacker, defender);
        
        if (attack.isCrit) {
          critCount++;
          const critDamage = await EnemyService.calculateDamage(attacker, defender, true);
          critDamageTotal += critDamage;
        } else {
          const normalDamage = await EnemyService.calculateDamage(attacker, defender, false);
          normalDamageTotal += normalDamage;
        }
      }

      // Should get some crits (roughly 5% = 5 out of 100)
      expect(critCount).toBeGreaterThan(0);

      // Average crit damage should be roughly double
      if (critCount > 0 && normalDamageTotal > 0) {
        const avgCrit = critDamageTotal / critCount;
        const avgNormal = normalDamageTotal / (100 - critCount);
        expect(avgCrit).toBeGreaterThanOrEqual(avgNormal * 1.5);
      }
    });

    it('should apply minimum damage of 1', async () => {
      const attacker = { base_damage: 1, armor_class: 5 };
      const defenderMax = { armor_class: 20 };

      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      // Even with max armor, should deal at least 1 damage
      const damage = await EnemyService.calculateDamage(attacker, defenderMax, false);

      expect(damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Loot System', () => {
    it('should generate loot on enemy defeat', async () => {
      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      const enemy = {
        experience_reward: 100,
        level: 3,
        loot_table: {
          gold: { min: 10, max: 30 },
          items: []
        }
      };

      const loot = await EnemyService.rollLoot(enemy, 5, dbWrapper);

      expect(loot).toBeDefined();
      expect(loot).toHaveProperty('gold');
      expect(loot).toHaveProperty('experience');
      expect(loot.gold).toBeGreaterThanOrEqual(10);
      expect(loot.gold).toBeLessThanOrEqual(30);
      expect(loot.experience).toBeGreaterThan(0);
    });

    it('should scale loot with character level', async () => {
      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      const enemy = {
        experience_reward: 100,
        level: 5,
        loot_table: {
          gold: { min: 10, max: 30 },
          items: []
        }
      };

      // Low level character
      const lootLow = await EnemyService.rollLoot(enemy, 1, dbWrapper);

      // High level character
      const lootHigh = await EnemyService.rollLoot(enemy, 15, dbWrapper);

      // Experience should be higher for low level
      expect(lootLow.experience).toBeGreaterThan(lootHigh.experience);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid enemy', async () => {
      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      try {
        await EnemyService.getEnemy('invalid-enemy-id', dbWrapper);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found');
      }
    });

    it('should throw error for invalid combat encounter', async () => {
      const dbWrapper = {
        query: async (sql, params) => ({
          rows: db.prepare(sql).all(...(params || []))
        })
      };

      try {
        await CombatService.getCombatState('invalid-encounter', dbWrapper);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found');
      }
    });
  });
});
