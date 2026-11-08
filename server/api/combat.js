/**
 * Combat API Routes
 * 
 * Endpoints:
 * - POST /api/combat/start - Initiate combat
 * - GET /api/combat/:id - Get combat state
 * - POST /api/combat/:id/attack - Execute attack
 * - POST /api/combat/:id/ability - Use ability
 * - POST /api/combat/:id/defend - Defend action
 * - POST /api/combat/:id/flee - Attempt to flee
 * - POST /api/combat/:id/end - End combat and claim rewards
 * - GET /api/combat/:id/history - Combat action history
 * - GET /api/characters/:id/combat-stats - Combat statistics
 */

import express from 'express';
import auth from '../middleware/auth.js';
import CombatService from '../services/combat.js';
import EnemyService from '../services/enemy.js';

const router = express.Router();

// ============================================================================
// COMBAT LIFECYCLE
// ============================================================================

/**
 * POST /api/combat/start
 * Initiate combat with enemies at location
 * 
 * Body: { locationId: uuid, enemyIds: [uuid, ...] }
 */
router.post('/start', auth.required, async (req, res) => {
  try {
    const characterId = req.user.id;
    const { locationId, enemyIds } = req.body;

    if (!locationId || !enemyIds || enemyIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'locationId and enemyIds required' 
      });
    }

    const combat = await CombatService.initiateCombat(
      characterId,
      enemyIds,
      locationId,
      req.db
    );

    res.json({
      success: true,
      data: combat
    });
  } catch (err) {
    req.logger.error('Error starting combat:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/combat/:id
 * Get current combat state
 */
router.get('/:id', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;

    const state = await CombatService.getCombatState(combatId, req.db);

    res.json({
      success: true,
      data: state
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error fetching combat:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// COMBAT ACTIONS
// ============================================================================

/**
 * POST /api/combat/:id/attack
 * Execute attack action
 * 
 * Body: { targetId: uuid }
 */
router.post('/:id/attack', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;
    const characterId = req.user.id;
    const { targetId } = req.body;

    if (!targetId) {
      return res.status(400).json({ 
        success: false, 
        error: 'targetId required' 
      });
    }

    const result = await CombatService.executeAttack(
      combatId,
      characterId,
      targetId,
      req.db
    );

    // Advance turn
    await CombatService.endTurn(combatId, req.db);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    if (err.message.includes('turn')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    req.logger.error('Error executing attack:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/combat/:id/ability
 * Use ability action
 * 
 * Body: { abilityId: uuid, targetId: uuid }
 */
router.post('/:id/ability', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;
    const characterId = req.user.id;
    const { abilityId, targetId } = req.body;

    if (!abilityId || !targetId) {
      return res.status(400).json({ 
        success: false, 
        error: 'abilityId and targetId required' 
      });
    }

    const result = await CombatService.useAbility(
      combatId,
      characterId,
      abilityId,
      targetId,
      req.db
    );

    // Advance turn
    await CombatService.endTurn(combatId, req.db);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    req.logger.error('Error using ability:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/combat/:id/defend
 * Execute defend action
 */
router.post('/:id/defend', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;
    const characterId = req.user.id;

    const result = await CombatService.executeDefend(
      combatId,
      characterId,
      req.db
    );

    // Advance turn
    await CombatService.endTurn(combatId, req.db);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    req.logger.error('Error defending:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/combat/:id/flee
 * Attempt to flee combat
 */
router.post('/:id/flee', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;
    const characterId = req.user.id;

    const result = await CombatService.attemptFlee(
      combatId,
      characterId,
      req.db
    );

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    req.logger.error('Error fleeing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// COMBAT RESOLUTION
// ============================================================================

/**
 * POST /api/combat/:id/end
 * End combat and claim rewards
 * 
 * Body: { winnerId: uuid }
 */
router.post('/:id/end', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;
    const { winnerId } = req.body;

    if (!winnerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'winnerId required' 
      });
    }

    const result = await CombatService.endCombat(
      combatId,
      winnerId,
      req.db
    );

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    req.logger.error('Error ending combat:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// COMBAT HISTORY & INFO
// ============================================================================

/**
 * GET /api/combat/:id/history
 * Get combat action history
 */
router.get('/:id/history', auth.required, async (req, res) => {
  try {
    const combatId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const history = await CombatService.getActionHistory(combatId, req.db);

    res.json({
      success: true,
      count: history.length,
      data: history.slice(-limit)
    });
  } catch (err) {
    req.logger.error('Error fetching combat history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/characters/:characterId/combat-history
 * Get combat history for character
 */
router.get('/character/:characterId/history', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const history = await CombatService.getCombatHistory(characterId, limit, req.db);

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (err) {
    req.logger.error('Error fetching character combat history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/characters/:characterId/combat-stats
 * Get combat statistics for character
 */
router.get('/character/:characterId/stats', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const stats = await CombatService.getCombatStats(characterId, req.db);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    req.logger.error('Error fetching combat stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ENEMY INFO
// ============================================================================

/**
 * GET /api/enemies
 * List all enemies
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const enemies = await EnemyService.getAllEnemies(limit, offset, req.db);

    res.json({
      success: true,
      count: enemies.length,
      offset,
      limit,
      data: enemies
    });
  } catch (err) {
    req.logger.error('Error listing enemies:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enemies/:id
 * Get enemy details
 */
router.get('/enemy/:id', async (req, res) => {
  try {
    const enemyId = req.params.id;

    const enemy = await EnemyService.getEnemy(enemyId, req.db);
    const stats = await EnemyService.getEnemyStats(enemyId, req.db);

    res.json({
      success: true,
      data: {
        enemy,
        stats
      }
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error fetching enemy:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enemies/type/:type
 * Get enemies by type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const type = req.params.type;

    const enemies = await EnemyService.getEnemiesByType(type, req.db);

    res.json({
      success: true,
      count: enemies.length,
      data: enemies
    });
  } catch (err) {
    req.logger.error('Error fetching enemies by type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enemies/difficulty/:difficulty
 * Get enemies by difficulty
 */
router.get('/difficulty/:difficulty', async (req, res) => {
  try {
    const difficulty = req.params.difficulty;

    const enemies = await EnemyService.getEnemiesByDifficulty(difficulty, req.db);

    res.json({
      success: true,
      count: enemies.length,
      data: enemies
    });
  } catch (err) {
    req.logger.error('Error fetching enemies by difficulty:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
