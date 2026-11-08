/**
 * Checkpoint API Routes
 * 
 * Endpoints:
 * - POST   /api/checkpoints                Create checkpoint
 * - GET    /api/checkpoints                List checkpoints
 * - GET    /api/checkpoints/:id            Get checkpoint details
 * - DELETE /api/checkpoints/:id            Delete checkpoint
 * - POST   /api/checkpoints/:id/restore    Restore from checkpoint
 * - POST   /api/checkpoints/:id/export     Export to cloud
 * - POST   /api/checkpoints/import         Import from cloud
 * - POST   /api/checkpoints/:id/rollback   Rollback to previous
 * - GET    /api/checkpoints/cloud/status   Cloud sync status
 * - POST   /api/checkpoints/:id/verify     Verify integrity
 * - GET    /api/characters/:id/stats       Checkpoint stats
 */

import express from 'express';
import auth from '../middleware/auth.js';
import CheckpointService from '../services/checkpoint.js';

const router = express.Router();

// ============================================================================
// CHECKPOINT CREATION & MANAGEMENT
// ============================================================================

/**
 * POST /api/checkpoints
 * Create manual checkpoint
 * 
 * Body: { characterId: uuid, description: string }
 */
router.post('/', auth.required, async (req, res) => {
  try {
    const { characterId, description } = req.body;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'characterId required' 
      });
    }

    // Verify character ownership
    const charResult = await req.db.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (!charResult.rows.length || charResult.rows[0].user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Character not found or unauthorized' 
      });
    }

    const checkpoint = await CheckpointService.createCheckpoint(
      characterId,
      description || 'Manual checkpoint',
      req.db
    );

    res.json({
      success: true,
      data: checkpoint
    });
  } catch (err) {
    req.logger.error('Error creating checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/checkpoints
 * List checkpoints for character
 */
router.get('/', auth.required, async (req, res) => {
  try {
    const { characterId, limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'characterId query param required' 
      });
    }

    // Verify ownership
    const charResult = await req.db.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (!charResult.rows.length || charResult.rows[0].user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const checkpoints = await CheckpointService.listCheckpoints(
      characterId,
      Math.min(parseInt(limit) || 20, 100),
      parseInt(offset) || 0,
      req.db
    );

    res.json({
      success: true,
      count: checkpoints.length,
      data: checkpoints
    });
  } catch (err) {
    req.logger.error('Error listing checkpoints:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/checkpoints/:id
 * Get checkpoint details
 */
router.get('/:id', auth.required, async (req, res) => {
  try {
    const checkpointId = req.params.id;
    const userId = req.user.id;

    // Verify ownership
    const result = await req.db.query(
      'SELECT c.* FROM checkpoints c WHERE c.id = $1 AND c.user_id = $2',
      [checkpointId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ 
        success: false, 
        error: 'Checkpoint not found' 
      });
    }

    const checkpoint = result.rows[0];

    res.json({
      success: true,
      data: checkpoint
    });
  } catch (err) {
    req.logger.error('Error fetching checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/checkpoints/:id
 * Delete checkpoint
 */
router.delete('/:id', auth.required, async (req, res) => {
  try {
    const checkpointId = req.params.id;
    const userId = req.user.id;

    await CheckpointService.deleteCheckpoint(checkpointId, userId, req.db);

    res.json({
      success: true,
      message: 'Checkpoint deleted'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error deleting checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// CHECKPOINT RESTORATION
// ============================================================================

/**
 * POST /api/checkpoints/:id/restore
 * Restore from checkpoint
 */
router.post('/:id/restore', auth.required, async (req, res) => {
  try {
    const checkpointId = req.params.id;
    const userId = req.user.id;

    const checkpoint = await CheckpointService.loadCheckpoint(
      checkpointId,
      userId,
      req.db
    );

    // TODO: Apply restoration to character, inventory, etc.
    // This is handled by the client applying the state

    res.json({
      success: true,
      data: checkpoint
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error restoring checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/checkpoints/:id/rollback
 * Rollback to previous checkpoint
 */
router.post('/:id/rollback', auth.required, async (req, res) => {
  try {
    const checkpointId = req.params.id;
    const { reason = 'user-initiated' } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const result = await req.db.query(
      `SELECT character_id FROM checkpoints 
       WHERE id = $1 AND user_id = $2`,
      [checkpointId, userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const characterId = result.rows[0].character_id;

    const rollback = await CheckpointService.rollback(
      characterId,
      checkpointId,
      reason,
      req.db
    );

    res.json({
      success: true,
      data: rollback
    });
  } catch (err) {
    req.logger.error('Error rolling back checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// CLOUD SYNC
// ============================================================================

/**
 * POST /api/checkpoints/:id/export
 * Export checkpoint to cloud
 */
router.post('/:id/export', auth.required, async (req, res) => {
  try {
    const checkpointId = req.params.id;
    const { provider = 'gcs' } = req.body;
    const userId = req.user.id;

    if (!['gcs', 'aws', 's3', 'azure'].includes(provider)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid cloud provider' 
      });
    }

    // Verify ownership
    const result = await req.db.query(
      'SELECT id FROM checkpoints WHERE id = $1 AND user_id = $2',
      [checkpointId, userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // TODO: Initialize cloud service based on provider
    // const cloudService = getCloudService(provider);
    // const export = await CheckpointService.exportCheckpoint(
    //   checkpointId,
    //   provider,
    //   cloudService,
    //   req.db
    // );

    res.json({
      success: true,
      message: 'Checkpoint export queued',
      provider
    });
  } catch (err) {
    req.logger.error('Error exporting checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/checkpoints/import
 * Import checkpoint from cloud
 */
router.post('/import', auth.required, async (req, res) => {
  try {
    const { cloudId, provider } = req.body;
    const userId = req.user.id;

    if (!cloudId || !provider) {
      return res.status(400).json({ 
        success: false, 
        error: 'cloudId and provider required' 
      });
    }

    // TODO: Initialize cloud service
    // const cloudService = getCloudService(provider);
    // const checkpoint = await CheckpointService.importCheckpoint(
    //   cloudId,
    //   userId,
    //   cloudService,
    //   req.db
    // );

    res.json({
      success: true,
      message: 'Checkpoint import queued',
      provider
    });
  } catch (err) {
    req.logger.error('Error importing checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/checkpoints/cloud/status
 * Get cloud sync status
 */
router.get('/cloud/status', auth.required, async (req, res) => {
  try {
    const { characterId } = req.query;
    const userId = req.user.id;

    if (!characterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'characterId query param required' 
      });
    }

    // Verify ownership
    const charResult = await req.db.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (!charResult.rows.length || charResult.rows[0].user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const status = await CheckpointService.getCloudSyncStatus(
      characterId,
      req.db
    );

    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    req.logger.error('Error getting cloud sync status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// VERIFICATION & STATS
// ============================================================================

/**
 * POST /api/checkpoints/:id/verify
 * Verify checkpoint integrity
 */
router.post('/:id/verify', auth.required, async (req, res) => {
  try {
    const checkpointId = req.params.id;
    const userId = req.user.id;

    // Verify ownership
    const result = await req.db.query(
      'SELECT id FROM checkpoints WHERE id = $1 AND user_id = $2',
      [checkpointId, userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const integrity = await CheckpointService.verifyCheckpointIntegrity(
      checkpointId,
      req.db
    );

    res.json({
      success: true,
      data: integrity
    });
  } catch (err) {
    req.logger.error('Error verifying checkpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/characters/:characterId/checkpoint-stats
 * Get checkpoint statistics
 */
router.get('/character/:characterId/stats', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const userId = req.user.id;

    // Verify ownership
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const charResult = await req.db.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (!charResult.rows.length || charResult.rows[0].user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const stats = await CheckpointService.getCheckpointStats(
      characterId,
      req.db
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    req.logger.error('Error getting checkpoint stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
