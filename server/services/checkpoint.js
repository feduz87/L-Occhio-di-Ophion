/**
 * Checkpoint Service
 * 
 * Handles character save/load, state persistence, and cloud sync
 * 
 * Methods:
 * - createCheckpoint: Create manual checkpoint
 * - loadCheckpoint: Restore from checkpoint
 * - listCheckpoints: List available checkpoints
 * - deleteCheckpoint: Remove checkpoint
 * - autoCreateCheckpoint: Auto-save (quest/combat/level-up)
 * - exportCheckpoint: Upload to cloud
 * - importCheckpoint: Download from cloud
 * - rollback: Revert to previous checkpoint
 * - getCloudSyncStatus: Cloud backup status
 * - verifyCheckpointIntegrity: Validate data integrity
 * - cleanupOldCheckpoints: Maintenance
 * - getCheckpointStats: Size & metrics
 */

class CheckpointService {
  /**
   * Create manual checkpoint
   * @param {UUID} characterId
   * @param {string} description
   * @param {object} db
   * @returns {Promise<{checkpointId, createdAt, description}>}
   */
  static async createCheckpoint(characterId, description, db) {
    try {
      // Get character and current state
      const charResult = await db.query(
        'SELECT * FROM characters WHERE id = $1',
        [characterId]
      );
      if (!charResult.rows.length) {
        throw new Error(`Character not found: ${characterId}`);
      }

      const character = charResult.rows[0];
      const userId = character.user_id;

      // Get inventory
      const invResult = await db.query(
        'SELECT * FROM character_inventory WHERE character_id = $1',
        [characterId]
      );

      // Get in-combat state (if applicable)
      const combatResult = await db.query(
        `SELECT ce.* FROM combat_encounters ce 
         WHERE ce.character_id = $1 AND ce.status = 'active'`,
        [characterId]
      );
      const combatState = combatResult.rows[0] || null;

      // Get quests
      const questResult = await db.query(
        `SELECT cq.*, q.name, q.description 
         FROM character_quests cq
         JOIN quests q ON cq.quest_id = q.id
         WHERE cq.character_id = $1`,
        [characterId]
      );

      // Get NPC affinity
      const affinityResult = await db.query(
        'SELECT npc_id, affinity_score FROM npc_affinity WHERE character_id = $1',
        [characterId]
      );

      // Create checkpoint
      const result = await db.query(
        `SELECT create_checkpoint(
          $1::UUID,
          $2::UUID,
          $3::VARCHAR,
          $4::TEXT,
          $5::JSONB,
          $6::JSONB,
          $7::JSONB,
          $8::JSONB,
          $9::JSONB
        ) as checkpoint_id`,
        [
          userId,
          characterId,
          'manual',
          description,
          JSON.stringify(character),
          JSON.stringify(invResult.rows),
          combatState ? JSON.stringify(combatState) : null,
          JSON.stringify(Object.fromEntries(questResult.rows.map(q => [q.quest_id, q]))),
          JSON.stringify(Object.fromEntries(affinityResult.rows.map(a => [a.npc_id, a.affinity_score])))
        ]
      );

      const checkpointId = result.rows[0].checkpoint_id;

      return {
        checkpointId,
        characterId,
        type: 'manual',
        description,
        createdAt: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Failed to create checkpoint: ${err.message}`);
    }
  }

  /**
   * Load checkpoint and restore state
   * @param {UUID} checkpointId
   * @param {UUID} userId
   * @param {object} db
   * @returns {Promise<{character, inventory, combat, quests, affinity}>}
   */
  static async loadCheckpoint(checkpointId, userId, db) {
    try {
      // Load checkpoint data
      const result = await db.query(
        'SELECT load_checkpoint($1::UUID, $2::UUID) as data',
        [checkpointId, userId]
      );

      if (!result.rows.length) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }

      const row = result.rows[0].data[0];

      return {
        checkpointId,
        character: JSON.parse(row.character_json),
        inventory: JSON.parse(row.inventory_json),
        combat: row.combat_state_json ? JSON.parse(row.combat_state_json) : null,
        quests: JSON.parse(row.quests_json),
        affinity: JSON.parse(row.npc_affinity_json),
        createdAt: row.created_at
      };
    } catch (err) {
      throw new Error(`Failed to load checkpoint: ${err.message}`);
    }
  }

  /**
   * List checkpoints for character
   * @param {UUID} characterId
   * @param {number} limit
   * @param {number} offset
   * @param {object} db
   * @returns {Promise<Array>}
   */
  static async listCheckpoints(characterId, limit = 20, offset = 0, db) {
    try {
      const result = await db.query(
        `SELECT 
          c.id,
          c.checkpoint_type,
          c.description,
          c.created_at,
          c.last_accessed,
          cd.state_size_bytes,
          sb.sync_status,
          sb.cloud_provider
         FROM checkpoints c
         LEFT JOIN checkpoint_data cd ON c.id = cd.checkpoint_id
         LEFT JOIN save_backups sb ON c.id = sb.checkpoint_id
         WHERE c.character_id = $1
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [characterId, limit, offset]
      );

      return result.rows.map(row => ({
        id: row.id,
        type: row.checkpoint_type,
        description: row.description,
        createdAt: row.created_at,
        lastAccessed: row.last_accessed,
        sizeBytes: row.state_size_bytes,
        cloudSync: {
          status: row.sync_status || 'none',
          provider: row.cloud_provider || null
        }
      }));
    } catch (err) {
      throw new Error(`Failed to list checkpoints: ${err.message}`);
    }
  }

  /**
   * Delete checkpoint
   * @param {UUID} checkpointId
   * @param {UUID} userId
   * @param {object} db
   * @returns {Promise<{success}>}
   */
  static async deleteCheckpoint(checkpointId, userId, db) {
    try {
      // Verify ownership
      const result = await db.query(
        'SELECT id FROM checkpoints WHERE id = $1 AND user_id = $2',
        [checkpointId, userId]
      );

      if (!result.rows.length) {
        throw new Error(`Checkpoint not found or unauthorized: ${checkpointId}`);
      }

      // Delete (cascades to checkpoint_data and save_backups)
      await db.query(
        'DELETE FROM checkpoints WHERE id = $1',
        [checkpointId]
      );

      return { success: true };
    } catch (err) {
      throw new Error(`Failed to delete checkpoint: ${err.message}`);
    }
  }

  /**
   * Auto-create checkpoint (quest complete, combat victory, level up)
   * @param {UUID} characterId
   * @param {string} type - 'quest-complete', 'combat-victory', 'level-up'
   * @param {object} metadata
   * @param {object} db
   * @returns {Promise<{checkpointId}>}
   */
  static async autoCreateCheckpoint(characterId, type, metadata, db) {
    try {
      // Check if auto-save enabled for this type
      const configResult = await db.query(
        'SELECT * FROM auto_save_config WHERE character_id = $1',
        [characterId]
      );

      if (!configResult.rows.length) {
        // Create default config
        await db.query(
          `INSERT INTO auto_save_config (character_id) VALUES ($1)`,
          [characterId]
        );
      }

      const config = configResult.rows[0] || { save_on_quest_complete: true, save_on_combat_victory: true, save_on_level_up: true };

      // Check if this type should auto-save
      const shouldSave = 
        (type === 'post-quest' && config.save_on_quest_complete) ||
        (type === 'combat' && config.save_on_combat_victory) ||
        (type === 'level-up' && config.save_on_level_up);

      if (!shouldSave) {
        return null;
      }

      // Create checkpoint
      const description = `Auto-save: ${type === 'post-quest' ? 'Quest complete' : type === 'combat' ? 'Combat victory' : 'Level up'}`;
      const checkpoint = await CheckpointService.createCheckpoint(
        characterId,
        description,
        db
      );

      // Clean up old checkpoints
      await CheckpointService.cleanupOldCheckpoints(characterId, db);

      return checkpoint;
    } catch (err) {
      console.error(`Auto-checkpoint failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Export checkpoint to cloud
   * @param {UUID} checkpointId
   * @param {string} provider - 'gcs', 'aws', 'azure'
   * @param {object} cloudService
   * @param {object} db
   * @returns {Promise<{cloudId, url, syncStatus}>}
   */
  static async exportCheckpoint(checkpointId, provider, cloudService, db) {
    try {
      // Load checkpoint data
      const dataResult = await db.query(
        `SELECT cd.* FROM checkpoint_data cd
         WHERE cd.checkpoint_id = $1`,
        [checkpointId]
      );

      if (!dataResult.rows.length) {
        throw new Error(`Checkpoint data not found: ${checkpointId}`);
      }

      const data = dataResult.rows[0];
      const stateJSON = {
        character: JSON.parse(data.character_json),
        inventory: JSON.parse(data.inventory_json),
        combat: data.combat_state_json ? JSON.parse(data.combat_state_json) : null,
        quests: JSON.parse(data.quests_json),
        affinity: JSON.parse(data.npc_affinity_json),
        checksum: data.checksum
      };

      // Upload to cloud
      const cloudId = await cloudService.uploadCheckpoint(
        checkpointId,
        stateJSON,
        provider
      );

      // Record backup
      const backupResult = await db.query(
        `INSERT INTO save_backups (
          checkpoint_id, cloud_provider, cloud_id, 
          backup_size_bytes, sync_status, last_sync_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id`,
        [
          checkpointId,
          provider,
          cloudId,
          JSON.stringify(stateJSON).length,
          'synced'
        ]
      );

      return {
        cloudId,
        provider,
        syncStatus: 'synced',
        backupSize: JSON.stringify(stateJSON).length
      };
    } catch (err) {
      throw new Error(`Failed to export checkpoint: ${err.message}`);
    }
  }

  /**
   * Import checkpoint from cloud
   * @param {string} cloudId
   * @param {UUID} userId
   * @param {object} cloudService
   * @param {object} db
   * @returns {Promise<{checkpointId, imported, characterId}>}
   */
  static async importCheckpoint(cloudId, userId, cloudService, db) {
    try {
      // Download from cloud
      const stateJSON = await cloudService.downloadCheckpoint(cloudId);

      if (!stateJSON || !stateJSON.character) {
        throw new Error('Invalid checkpoint data from cloud');
      }

      // Verify checksum
      const calculatedChecksum = await CheckpointService._calculateChecksum(stateJSON);
      if (calculatedChecksum !== stateJSON.checksum) {
        throw new Error('Checkpoint checksum mismatch - data may be corrupted');
      }

      const characterId = stateJSON.character.id;

      // Create local checkpoint from cloud data
      const result = await db.query(
        `SELECT create_checkpoint(
          $1::UUID,
          $2::UUID,
          'manual',
          $3::TEXT,
          $4::JSONB,
          $5::JSONB,
          $6::JSONB,
          $7::JSONB,
          $8::JSONB
        ) as checkpoint_id`,
        [
          userId,
          characterId,
          `Imported from ${cloudId}`,
          JSON.stringify(stateJSON.character),
          JSON.stringify(stateJSON.inventory || []),
          stateJSON.combat ? JSON.stringify(stateJSON.combat) : null,
          JSON.stringify(stateJSON.quests || {}),
          JSON.stringify(stateJSON.affinity || {})
        ]
      );

      const checkpointId = result.rows[0].checkpoint_id;

      return {
        checkpointId,
        characterId,
        imported: true,
        source: cloudId
      };
    } catch (err) {
      throw new Error(`Failed to import checkpoint: ${err.message}`);
    }
  }

  /**
   * Rollback to previous checkpoint
   * @param {UUID} characterId
   * @param {UUID} targetCheckpointId
   * @param {string} reason - 'user-initiated', 'conflict-resolution', 'timeout-recovery'
   * @param {object} db
   * @returns {Promise<{success, rolledBack}>}
   */
  static async rollback(characterId, targetCheckpointId, reason, db) {
    try {
      // Get current checkpoint
      const currentResult = await db.query(
        `SELECT id, created_at FROM checkpoints 
         WHERE character_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [characterId]
      );

      if (!currentResult.rows.length) {
        throw new Error('No current checkpoint found');
      }

      const currentCheckpointId = currentResult.rows[0].id;

      // Record rollback
      await db.query(
        `INSERT INTO checkpoint_rollbacks (
          character_id, from_checkpoint_id, to_checkpoint_id, reason
        ) VALUES ($1, $2, $3, $4)`,
        [characterId, currentCheckpointId, targetCheckpointId, reason]
      );

      return {
        success: true,
        rolledBack: {
          from: currentCheckpointId,
          to: targetCheckpointId
        }
      };
    } catch (err) {
      throw new Error(`Failed to rollback: ${err.message}`);
    }
  }

  /**
   * Get cloud sync status
   * @param {UUID} characterId
   * @param {object} db
   * @returns {Promise<{totalCheckpoints, backedUp, synced, failed}>}
   */
  static async getCloudSyncStatus(characterId, db) {
    try {
      const result = await db.query(
        `SELECT * FROM cloud_sync_status WHERE character_id = $1`,
        [characterId]
      );

      if (!result.rows.length) {
        return {
          totalCheckpoints: 0,
          backedUp: 0,
          synced: 0,
          failed: 0,
          totalBackupSize: 0
        };
      }

      const row = result.rows[0];
      return {
        characterId: row.character_id,
        totalCheckpoints: row.total_checkpoints || 0,
        backedUp: row.backed_up_checkpoints || 0,
        synced: row.fully_synced || 0,
        failed: row.failed_syncs || 0,
        totalBackupSize: row.total_backup_size_bytes || 0,
        latestCheckpoint: row.latest_checkpoint
      };
    } catch (err) {
      throw new Error(`Failed to get cloud sync status: ${err.message}`);
    }
  }

  /**
   * Verify checkpoint integrity
   * @param {UUID} checkpointId
   * @param {object} db
   * @returns {Promise<{isValid, expectedChecksum, calculatedChecksum}>}
   */
  static async verifyCheckpointIntegrity(checkpointId, db) {
    try {
      const result = await db.query(
        `SELECT * FROM verify_checkpoint_integrity($1::UUID)`,
        [checkpointId]
      );

      if (!result.rows.length) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }

      return {
        isValid: result.rows[0].is_valid,
        expectedChecksum: result.rows[0].expected_checksum,
        calculatedChecksum: result.rows[0].calculated_checksum
      };
    } catch (err) {
      throw new Error(`Failed to verify checkpoint: ${err.message}`);
    }
  }

  /**
   * Clean up old checkpoints
   * @param {UUID} characterId
   * @param {object} db
   * @returns {Promise<{deleted, remaining}>}
   */
  static async cleanupOldCheckpoints(characterId, db) {
    try {
      // Get character config
      const configResult = await db.query(
        'SELECT max_checkpoints, auto_delete_older_than_days FROM auto_save_config WHERE character_id = $1',
        [characterId]
      );

      const config = configResult.rows[0];
      const maxCheckpoints = config?.max_checkpoints || 20;
      const daysOld = config?.auto_delete_older_than_days || 30;

      // Delete old checkpoints
      const deleteResult = await db.query(
        `DELETE FROM checkpoints
         WHERE character_id = $1
         AND id NOT IN (
           SELECT id FROM checkpoints
           WHERE character_id = $1
           ORDER BY created_at DESC
           LIMIT $2
         )
         OR (created_at < NOW() - INTERVAL '1 day' * $3)`,
        [characterId, maxCheckpoints, daysOld]
      );

      // Get remaining count
      const countResult = await db.query(
        'SELECT COUNT(*) as count FROM checkpoints WHERE character_id = $1',
        [characterId]
      );

      return {
        deleted: deleteResult.rowCount,
        remaining: parseInt(countResult.rows[0].count)
      };
    } catch (err) {
      throw new Error(`Failed to cleanup checkpoints: ${err.message}`);
    }
  }

  /**
   * Get checkpoint statistics
   * @param {UUID} characterId
   * @param {object} db
   * @returns {Promise<{totalSize, averageSize, checkpointCount}>}
   */
  static async getCheckpointStats(characterId, db) {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as checkpoint_count,
          SUM(cd.state_size_bytes) as total_size,
          AVG(cd.state_size_bytes) as average_size,
          MAX(c.created_at) as latest,
          MIN(c.created_at) as oldest
         FROM checkpoints c
         LEFT JOIN checkpoint_data cd ON c.id = cd.checkpoint_id
         WHERE c.character_id = $1`,
        [characterId]
      );

      const row = result.rows[0];
      return {
        characterId,
        checkpointCount: parseInt(row.checkpoint_count) || 0,
        totalSizeBytes: parseInt(row.total_size) || 0,
        averageSizeBytes: parseInt(row.average_size) || 0,
        latestCheckpoint: row.latest,
        oldestCheckpoint: row.oldest
      };
    } catch (err) {
      throw new Error(`Failed to get checkpoint stats: ${err.message}`);
    }
  }

  /**
   * Calculate SHA-256 checksum (helper)
   */
  static async _calculateChecksum(stateJSON) {
    const crypto = await import('crypto');
    const data = JSON.stringify({
      character: stateJSON.character,
      inventory: stateJSON.inventory,
      combat: stateJSON.combat,
      quests: stateJSON.quests,
      affinity: stateJSON.affinity
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export default CheckpointService;
