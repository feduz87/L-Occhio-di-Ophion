/**
 * Auto-Save Hooks
 * 
 * Hooks that trigger automatic checkpoints on:
 * - Quest completion
 * - Combat victory
 * - Level up
 */

import CheckpointService from './checkpoint.js';

/**
 * Hook: Quest Complete
 * Triggered after quest is marked complete
 */
export async function onQuestComplete(characterId, questData, db, logger) {
  try {
    const checkpoint = await CheckpointService.autoCreateCheckpoint(
      characterId,
      'post-quest',
      {
        questId: questData.id,
        questName: questData.name,
        reward: questData.reward
      },
      db
    );

    if (checkpoint) {
      logger.info(`Auto-checkpoint created after quest: ${questData.name}`);
    }
  } catch (err) {
    logger.error(`Auto-checkpoint failed on quest complete: ${err.message}`);
    // Don't throw - auto-save failure shouldn't break gameplay
  }
}

/**
 * Hook: Combat Victory
 * Triggered when character defeats all enemies
 */
export async function onCombatVictory(characterId, combatData, db, logger) {
  try {
    const checkpoint = await CheckpointService.autoCreateCheckpoint(
      characterId,
      'combat',
      {
        encounterId: combatData.encounterId,
        enemyCount: combatData.enemyCount,
        lootValue: combatData.lootValue
      },
      db
    );

    if (checkpoint) {
      logger.info(`Auto-checkpoint created after combat victory`);
    }
  } catch (err) {
    logger.error(`Auto-checkpoint failed on combat victory: ${err.message}`);
  }
}

/**
 * Hook: Level Up
 * Triggered when character gains a level
 */
export async function onLevelUp(characterId, levelData, db, logger) {
  try {
    const checkpoint = await CheckpointService.autoCreateCheckpoint(
      characterId,
      'level-up',
      {
        newLevel: levelData.newLevel,
        oldLevel: levelData.oldLevel,
        statIncreases: levelData.statIncreases
      },
      db
    );

    if (checkpoint) {
      logger.info(`Auto-checkpoint created on level up: ${levelData.oldLevel} → ${levelData.newLevel}`);
    }
  } catch (err) {
    logger.error(`Auto-checkpoint failed on level up: ${err.message}`);
  }
}

/**
 * Scheduler: Checkpoint Cleanup
 * Runs periodically to clean up old checkpoints
 * Should be called every hour or so
 */
export async function cleanupScheduler(db, logger) {
  try {
    // Get all characters with checkpoints
    const result = await db.query(
      `SELECT DISTINCT character_id FROM checkpoints
       WHERE created_at > NOW() - INTERVAL '30 days'
       ORDER BY character_id`
    );

    let totalDeleted = 0;
    for (const row of result.rows) {
      const cleanup = await CheckpointService.cleanupOldCheckpoints(
        row.character_id,
        db
      );
      totalDeleted += cleanup.deleted;
    }

    if (totalDeleted > 0) {
      logger.info(`Checkpoint cleanup: deleted ${totalDeleted} old checkpoints`);
    }
  } catch (err) {
    logger.error(`Checkpoint cleanup scheduler failed: ${err.message}`);
  }
}

/**
 * Scheduler: Cloud Sync Status
 * Runs to retry failed cloud syncs
 * Should be called every 5 minutes
 */
export async function cloudSyncScheduler(db, logger, cloudService) {
  if (!cloudService) {
    return; // Cloud service not configured
  }

  try {
    // Get failed backups
    const result = await db.query(
      `SELECT sb.* FROM save_backups sb
       WHERE sb.sync_status = 'failed'
       AND sb.updated_at < NOW() - INTERVAL '5 minutes'
       LIMIT 10`
    );

    let retryCount = 0;
    for (const backup of result.rows) {
      try {
        // Retry sync
        const checkpoint = await db.query(
          'SELECT cd.* FROM checkpoint_data cd WHERE cd.checkpoint_id = $1',
          [backup.checkpoint_id]
        );

        if (checkpoint.rows.length) {
          await cloudService.uploadCheckpoint(
            backup.checkpoint_id,
            JSON.parse(checkpoint.rows[0].character_json),
            backup.cloud_provider
          );

          // Mark as synced
          await db.query(
            `UPDATE save_backups 
             SET sync_status = 'synced', last_sync_at = NOW(), sync_error = NULL
             WHERE id = $1`,
            [backup.id]
          );

          retryCount++;
        }
      } catch (err) {
        // Record error but continue with next backup
        await db.query(
          `UPDATE save_backups 
           SET sync_status = 'failed', sync_error = $1, updated_at = NOW()
           WHERE id = $2`,
          [err.message, backup.id]
        );
      }
    }

    if (retryCount > 0) {
      logger.info(`Cloud sync retry: ${retryCount} backups synced`);
    }
  } catch (err) {
    logger.error(`Cloud sync scheduler failed: ${err.message}`);
  }
}

/**
 * Initialize Auto-Save System
 * Call this once on server startup to set up schedulers
 */
export function initializeAutoSave(db, logger, cloudService) {
  // Cleanup scheduler - runs every 60 minutes
  setInterval(async () => {
    await cleanupScheduler(db, logger);
  }, 60 * 60 * 1000);

  logger.info('Checkpoint cleanup scheduler started (every 60 minutes)');

  // Cloud sync scheduler - runs every 5 minutes
  if (cloudService) {
    setInterval(async () => {
      await cloudSyncScheduler(db, logger, cloudService);
    }, 5 * 60 * 1000);

    logger.info('Cloud sync scheduler started (every 5 minutes)');
  }
}

/**
 * Middleware: Auto-checkpoint on quest complete
 * Attach to quest completion endpoint
 */
export function autoCheckpointOnQuestMiddleware(db, logger) {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = function(data) {
      // Call original
      originalJson(data);

      // If quest was successfully completed, trigger auto-save
      if (data.success && data.data?.quest?.status === 'completed') {
        const characterId = req.user.id; // Adjust based on your auth
        onQuestComplete(
          characterId,
          data.data.quest,
          db,
          logger
        ).catch(err => logger.error('Auto-save failed:', err));
      }
    };

    next();
  };
}

/**
 * Middleware: Auto-checkpoint on combat victory
 * Attach to combat end endpoint
 */
export function autoCheckpointOnCombatMiddleware(db, logger) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      originalJson(data);

      // If combat ended with character victory
      if (data.success && data.data?.winner === 'character') {
        const characterId = req.user.id;
        onCombatVictory(
          characterId,
          data.data.encounter,
          db,
          logger
        ).catch(err => logger.error('Auto-save failed:', err));
      }
    };

    next();
  };
}
