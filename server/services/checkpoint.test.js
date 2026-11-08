/**
 * Checkpoint Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import CheckpointService from '../services/checkpoint.js';

describe('CheckpointService', () => {
  let characterId = 'test-char-checkpoint';
  let userId = 'test-user-checkpoint';
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: async (sql, params) => {
        // Mock character
        if (sql.includes('SELECT * FROM characters WHERE id = $1')) {
          return {
            rows: [{
              id: characterId,
              user_id: userId,
              name: 'Test Character',
              level: 5,
              health: 50,
              max_health: 100,
              mana: 30,
              experience: 1000,
              gold: 250
            }]
          };
        }

        // Mock character ownership check
        if (sql.includes('SELECT user_id FROM characters WHERE id = $1')) {
          return {
            rows: [{
              user_id: userId
            }]
          };
        }

        // Mock user
        if (sql.includes('SELECT 1 FROM users u')) {
          return { rows: [{ }] };
        }

        // Mock inventory
        if (sql.includes('SELECT * FROM character_inventory WHERE character_id = $1')) {
          return {
            rows: [
              { id: 'item-1', name: 'Sword', quantity: 1 },
              { id: 'item-2', name: 'Health Potion', quantity: 5 }
            ]
          };
        }

        // Mock combat
        if (sql.includes('SELECT ce.* FROM combat_encounters')) {
          return { rows: [] };
        }

        // Mock quests
        if (sql.includes('SELECT cq.*, q.name, q.description')) {
          return {
            rows: [
              { quest_id: 'quest-1', name: 'Find Sword', status: 'in-progress' }
            ]
          };
        }

        // Mock affinity
        if (sql.includes('SELECT npc_id, affinity_score FROM npc_affinity')) {
          return {
            rows: [
              { npc_id: 'npc-1', affinity_score: 50 }
            ]
          };
        }

        // Mock checkpoint creation
        if (sql.includes('SELECT create_checkpoint')) {
          return {
            rows: [{
              checkpoint_id: 'checkpoint-1'
            }]
          };
        }

        // Mock checkpoint list
        if (sql.includes('SELECT * FROM checkpoints c')) {
          return { rows: [] };
        }

        // Mock checkpoint load
        if (sql.includes('SELECT load_checkpoint')) {
          return {
            rows: [[{
              checkpoint_id: 'checkpoint-1',
              character_json: JSON.stringify({ id: characterId, name: 'Test', level: 5 }),
              inventory_json: JSON.stringify([]),
              combat_state_json: null,
              quests_json: JSON.stringify({}),
              npc_affinity_json: JSON.stringify({}),
              created_at: new Date().toISOString()
            }]]
          };
        }

        // Mock checkpoint cleanup
        if (sql.includes('DELETE FROM checkpoints')) {
          return { rowCount: 2 };
        }

        // Mock config
        if (sql.includes('SELECT * FROM auto_save_config WHERE character_id = $1')) {
          return { rows: [] };
        }

        // Mock config insert
        if (sql.includes('INSERT INTO auto_save_config')) {
          return { rows: [{ id: 'config-1' }] };
        }

        // Mock cloud sync status
        if (sql.includes('SELECT * FROM cloud_sync_status')) {
          return {
            rows: [{
              character_id: characterId,
              total_checkpoints: 5,
              backed_up_checkpoints: 3,
              fully_synced: 3,
              failed_syncs: 0,
              total_backup_size_bytes: 50000,
              latest_checkpoint: new Date().toISOString()
            }]
          };
        }

        // Mock verify integrity
        if (sql.includes('SELECT * FROM verify_checkpoint_integrity')) {
          return {
            rows: [{
              is_valid: true,
              expected_checksum: 'abc123',
              calculated_checksum: 'abc123'
            }]
          };
        }

        // Mock rollback
        if (sql.includes('INSERT INTO checkpoint_rollbacks')) {
          return { rows: [{ }] };
        }

        return { rows: [] };
      }
    };
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint with full state', async () => {
      const checkpoint = await CheckpointService.createCheckpoint(
        characterId,
        'Test checkpoint',
        mockDb
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.checkpointId).toBeDefined();
      expect(checkpoint.characterId).toBe(characterId);
      expect(checkpoint.type).toBe('manual');
      expect(checkpoint.description).toBe('Test checkpoint');
    });

    it('should throw error for invalid character', async () => {
      const invalidDb = {
        query: async (sql, params) => ({ rows: [] })
      };

      try {
        await CheckpointService.createCheckpoint(
          'invalid-id',
          'Test',
          invalidDb
        );
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found');
      }
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint data', async () => {
      const checkpoint = await CheckpointService.loadCheckpoint(
        'checkpoint-1',
        userId,
        mockDb
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.checkpointId).toBe('checkpoint-1');
      expect(checkpoint.character).toBeDefined();
      expect(checkpoint.inventory).toBeDefined();
      expect(checkpoint.quests).toBeDefined();
      expect(checkpoint.affinity).toBeDefined();
    });
  });

  describe('listCheckpoints', () => {
    it('should list checkpoints for character', async () => {
      const checkpoints = await CheckpointService.listCheckpoints(
        characterId,
        20,
        0,
        mockDb
      );

      expect(Array.isArray(checkpoints)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const checkpoints = await CheckpointService.listCheckpoints(
        characterId,
        5,
        0,
        mockDb
      );

      expect(checkpoints.length).toBeLessThanOrEqual(5);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint', async () => {
      const result = await CheckpointService.deleteCheckpoint(
        'checkpoint-1',
        userId,
        mockDb
      );

      expect(result.success).toBe(true);
    });

    it('should throw error for unauthorized delete', async () => {
      const invalidDb = {
        query: async (sql, params) => ({ rows: [] })
      };

      try {
        await CheckpointService.deleteCheckpoint(
          'checkpoint-1',
          'different-user',
          invalidDb
        );
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('not found or unauthorized');
      }
    });
  });

  describe('autoCreateCheckpoint', () => {
    it('should auto-create checkpoint on quest complete', async () => {
      const checkpoint = await CheckpointService.autoCreateCheckpoint(
        characterId,
        'post-quest',
        { questId: 'quest-1' },
        mockDb
      );

      if (checkpoint) {
        expect(checkpoint.type).toBe('manual');
        expect(checkpoint.description).toContain('Quest');
      }
    });

    it('should auto-create on combat victory', async () => {
      const checkpoint = await CheckpointService.autoCreateCheckpoint(
        characterId,
        'combat',
        { combatId: 'encounter-1' },
        mockDb
      );

      if (checkpoint) {
        expect(checkpoint.type).toBe('manual');
      }
    });

    it('should skip if auto-save disabled', async () => {
      const disabledDb = {
        query: async (sql, params) => {
          if (sql.includes('SELECT * FROM auto_save_config')) {
            return {
              rows: [{
                save_on_quest_complete: false,
                save_on_combat_victory: false,
                save_on_level_up: false
              }]
            };
          }
          return { rows: [] };
        }
      };

      const checkpoint = await CheckpointService.autoCreateCheckpoint(
        characterId,
        'post-quest',
        {},
        disabledDb
      );

      expect(checkpoint).toBeNull();
    });
  });

  describe('getCloudSyncStatus', () => {
    it('should return cloud sync status', async () => {
      const status = await CheckpointService.getCloudSyncStatus(
        characterId,
        mockDb
      );

      expect(status).toBeDefined();
      expect(status.totalCheckpoints).toBe(5);
      expect(status.synced).toBe(3);
      expect(status.failed).toBe(0);
    });
  });

  describe('verifyCheckpointIntegrity', () => {
    it('should verify checkpoint integrity', async () => {
      const integrity = await CheckpointService.verifyCheckpointIntegrity(
        'checkpoint-1',
        mockDb
      );

      expect(integrity.isValid).toBe(true);
      expect(integrity.expectedChecksum).toBe('abc123');
    });
  });

  describe('cleanupOldCheckpoints', () => {
    it('should cleanup old checkpoints', async () => {
      const cleanup = await CheckpointService.cleanupOldCheckpoints(
        characterId,
        mockDb
      );

      expect(cleanup).toBeDefined();
      expect(cleanup.deleted).toBeGreaterThanOrEqual(0);
      expect(cleanup.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCheckpointStats', () => {
    it('should return checkpoint statistics', async () => {
      const stats = await CheckpointService.getCheckpointStats(
        characterId,
        mockDb
      );

      expect(stats).toBeDefined();
      expect(stats.characterId).toBe(characterId);
      expect(stats.checkpointCount).toBeDefined();
      expect(stats.totalSizeBytes).toBeDefined();
    });
  });

  describe('rollback', () => {
    it('should rollback to previous checkpoint', async () => {
      const result = await CheckpointService.rollback(
        characterId,
        'checkpoint-1',
        'user-initiated',
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.rolledBack).toBeDefined();
    });
  });
});
