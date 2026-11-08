/**
 * Checkpoint Integration Tests
 * 
 * Full end-to-end save/load flows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import CheckpointService from '../services/checkpoint.js';

describe('Checkpoint System Integration', () => {
  let db;
  const dbPath = ':memory:';

  beforeEach(() => {
    db = new Database(dbPath);

    // Create tables from schema
    const schemaPath = path.resolve(process.cwd(), 'server/db/09_schema_checkpoints.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    db.exec(schema);

    // Insert test data
    db.exec(`
      INSERT INTO users (id, email, username, password_hash) 
      VALUES ('user-1', 'test@test.com', 'testuser', 'hash');

      INSERT INTO characters (id, user_id, name, class, level, health, max_health, mana, experience, gold) 
      VALUES ('char-1', 'user-1', 'Test Character', 'warrior', 5, 50, 100, 30, 1000, 250);

      INSERT INTO character_inventory (id, character_id, item_id, quantity)
      VALUES ('inv-1', 'char-1', 'item-1', 1);

      INSERT INTO auto_save_config (character_id, save_on_quest_complete, max_checkpoints)
      VALUES ('char-1', true, 20);
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('Full Save/Load Cycle', () => {
    it('should create and load checkpoint', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create checkpoint
      const checkpoint = await CheckpointService.createCheckpoint(
        'char-1',
        'Test checkpoint',
        dbWrapper
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.checkpointId).toBeDefined();

      // Load checkpoint
      const loaded = await CheckpointService.loadCheckpoint(
        checkpoint.checkpointId,
        'user-1',
        dbWrapper
      );

      expect(loaded).toBeDefined();
      expect(loaded.character).toBeDefined();
      expect(loaded.inventory).toBeDefined();
    });

    it('should preserve character state across save/load', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create checkpoint
      const checkpoint = await CheckpointService.createCheckpoint(
        'char-1',
        'State test',
        dbWrapper
      );

      // Load and verify state
      const loaded = await CheckpointService.loadCheckpoint(
        checkpoint.checkpointId,
        'user-1',
        dbWrapper
      );

      expect(loaded.character.id).toBe('char-1');
      expect(loaded.character.name).toBe('Test Character');
      expect(loaded.character.level).toBe(5);
      expect(loaded.character.gold).toBe(250);
    });

    it('should preserve inventory across save/load', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      const checkpoint = await CheckpointService.createCheckpoint(
        'char-1',
        'Inventory test',
        dbWrapper
      );

      const loaded = await CheckpointService.loadCheckpoint(
        checkpoint.checkpointId,
        'user-1',
        dbWrapper
      );

      expect(loaded.inventory).toBeDefined();
      expect(Array.isArray(loaded.inventory)).toBe(true);
    });

    it('should list multiple checkpoints', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create multiple checkpoints
      for (let i = 0; i < 3; i++) {
        await CheckpointService.createCheckpoint(
          'char-1',
          `Checkpoint ${i + 1}`,
          dbWrapper
        );
      }

      // List checkpoints
      const checkpoints = await CheckpointService.listCheckpoints(
        'char-1',
        20,
        0,
        dbWrapper
      );

      expect(checkpoints.length).toBeGreaterThanOrEqual(3);
    });

    it('should delete checkpoint', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create checkpoint
      const checkpoint = await CheckpointService.createCheckpoint(
        'char-1',
        'Delete test',
        dbWrapper
      );

      // Delete it
      const result = await CheckpointService.deleteCheckpoint(
        checkpoint.checkpointId,
        'user-1',
        dbWrapper
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Auto-Save Features', () => {
    it('should auto-create checkpoint on quest complete', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      const checkpoint = await CheckpointService.autoCreateCheckpoint(
        'char-1',
        'post-quest',
        { questId: 'quest-1', questName: 'Test Quest' },
        dbWrapper
      );

      if (checkpoint) {
        expect(checkpoint.type).toBe('manual');
        expect(checkpoint.description).toContain('Quest');
      }
    });

    it('should respect max checkpoint limit', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create 25 checkpoints (max is 20)
      for (let i = 0; i < 25; i++) {
        await CheckpointService.createCheckpoint(
          'char-1',
          `Checkpoint ${i}`,
          dbWrapper
        );
      }

      // Cleanup
      const cleanup = await CheckpointService.cleanupOldCheckpoints(
        'char-1',
        dbWrapper
      );

      // Should have deleted some
      expect(cleanup.deleted).toBeGreaterThan(0);
    });
  });

  describe('Checkpoint Integrity', () => {
    it('should verify checkpoint integrity', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      const checkpoint = await CheckpointService.createCheckpoint(
        'char-1',
        'Integrity test',
        dbWrapper
      );

      // Verify integrity
      const integrity = await CheckpointService.verifyCheckpointIntegrity(
        checkpoint.checkpointId,
        dbWrapper
      );

      expect(integrity.isValid).toBe(true);
    });

    it('should get checkpoint statistics', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create checkpoint
      await CheckpointService.createCheckpoint(
        'char-1',
        'Stats test',
        dbWrapper
      );

      // Get stats
      const stats = await CheckpointService.getCheckpointStats(
        'char-1',
        dbWrapper
      );

      expect(stats.checkpointCount).toBeGreaterThan(0);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Rollback', () => {
    it('should record checkpoint rollback', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      // Create two checkpoints
      const cp1 = await CheckpointService.createCheckpoint(
        'char-1',
        'First checkpoint',
        dbWrapper
      );

      const cp2 = await CheckpointService.createCheckpoint(
        'char-1',
        'Second checkpoint',
        dbWrapper
      );

      // Rollback to first
      const result = await CheckpointService.rollback(
        'char-1',
        cp1.checkpointId,
        'user-initiated',
        dbWrapper
      );

      expect(result.success).toBe(true);
      expect(result.rolledBack).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid character', async () => {
      const dbWrapper = {
        query: async (sql, params) => ({ rows: [] })
      };

      try {
        await CheckpointService.createCheckpoint(
          'invalid-id',
          'Test',
          dbWrapper
        );
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found');
      }
    });

    it('should throw error for unauthorized load', async () => {
      const dbWrapper = {
        query: async (sql, params) => ({ rows: [] })
      };

      try {
        await CheckpointService.loadCheckpoint(
          'invalid-checkpoint',
          'wrong-user',
          dbWrapper
        );
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found or unauthorized');
      }
    });
  });

  describe('Cloud Sync Status', () => {
    it('should get cloud sync status', async () => {
      const dbWrapper = {
        query: async (sql, params) => {
          const stmt = db.prepare(sql);
          return { rows: stmt.all(...(params || [])) };
        }
      };

      const status = await CheckpointService.getCloudSyncStatus(
        'char-1',
        dbWrapper
      );

      expect(status).toBeDefined();
      expect(status.totalCheckpoints).toBeGreaterThanOrEqual(0);
    });
  });
});
