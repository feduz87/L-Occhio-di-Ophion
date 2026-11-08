/**
 * Quest API Routes
 * 
 * Endpoints:
 * - GET /api/quests - List all quests
 * - GET /api/quests/:id - Get quest details
 * - GET /api/quests/location/:locationId - Get quests at location
 * - POST /api/quests/:id/accept - Accept quest
 * - POST /api/quests/:id/complete - Complete quest (requires all objectives)
 * - POST /api/quests/:id/abandon - Abandon quest
 * - POST /api/quests/:id/objectives/:objId/complete - Mark objective complete
 * - GET /api/quests/search/:query - Search quests
 * - GET /api/quests/type/:type - Get quests by type
 * - GET /api/characters/:characterId/quests - Get character's quests
 * - GET /api/characters/:characterId/quest-stats - Get quest statistics
 */

import express from 'express';
import auth from '../middleware/auth.js';
import QuestService from '../services/quest.js';

const router = express.Router();

// ============================================================================
// LIST / SEARCH
// ============================================================================

/**
 * GET /api/quests
 * List all quests (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await req.db.query(
      `SELECT q.*, n.name as quest_giver_name
       FROM quests q
       LEFT JOIN npcs n ON q.quest_giver_id = n.id
       ORDER BY q.difficulty, q.name
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      count: result.rows.length,
      offset: offset,
      limit: limit,
      data: result.rows
    });
  } catch (err) {
    req.logger.error('Error listing quests:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/quests/search/:query
 * Search quests by name or description
 */
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;

    if (query.length < 2) {
      return res.status(400).json({ success: false, error: 'Query too short' });
    }

    const quests = await QuestService.searchQuests(query, req.db);

    res.json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    req.logger.error('Error searching quests:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/quests/type/:type
 * Get quests by type (main, side, bounty, etc)
 */
router.get('/type/:type', async (req, res) => {
  try {
    const questType = req.params.type;

    const quests = await QuestService.getQuestsByType(questType, req.db);

    res.json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    req.logger.error('Error fetching quests by type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET DETAILS
// ============================================================================

/**
 * GET /api/quests/:id
 * Get quest details with objectives and rewards
 */
router.get('/:id', async (req, res) => {
  try {
    const questId = req.params.id;

    const quest = await QuestService.getQuest(questId, req.db);

    res.json({
      success: true,
      data: quest
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error fetching quest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/quests/location/:locationId
 * Get quests available at a location
 */
router.get('/location/:locationId', auth.optional, async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const characterId = req.user?.id || null;

    const quests = await QuestService.getQuestsAtLocation(locationId, characterId, req.db);

    res.json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    req.logger.error('Error fetching location quests:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// CHARACTER QUESTS
// ============================================================================

/**
 * GET /api/characters/:characterId/quests
 * Get all character quests (active + completed + abandoned)
 */
router.get('/character/:characterId/quests', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const quests = await QuestService.getAllQuests(characterId, req.db);

    res.json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    req.logger.error('Error fetching character quests:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/characters/:characterId/quests/active
 * Get only active quests
 */
router.get('/character/:characterId/quests/active', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const quests = await QuestService.getActiveQuests(characterId, req.db);

    res.json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    req.logger.error('Error fetching active quests:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/characters/:characterId/quest-stats
 * Get quest statistics for character
 */
router.get('/character/:characterId/stats', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const stats = await QuestService.getQuestStats(characterId, req.db);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    req.logger.error('Error fetching quest stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/characters/:characterId/quest-recommendations
 * Get recommended quests for character
 */
router.get('/character/:characterId/recommendations', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const quests = await QuestService.getRecommendedQuests(characterId, req.db);

    res.json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    req.logger.error('Error fetching quest recommendations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// QUEST LIFECYCLE
// ============================================================================

/**
 * POST /api/quests/:id/accept
 * Accept a quest (requires auth)
 */
router.post('/:id/accept', auth.required, async (req, res) => {
  try {
    const questId = req.params.id;
    const characterId = req.user.id;

    const quest = await QuestService.acceptQuest(questId, characterId, req.db);

    res.json({
      success: true,
      data: quest
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message.includes('already accepted')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    req.logger.error('Error accepting quest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/quests/:id/complete
 * Complete a quest and claim rewards (requires auth)
 */
router.post('/:id/complete', auth.required, async (req, res) => {
  try {
    const questId = req.params.id;
    const characterId = req.user.id;

    const result = await QuestService.completeQuest(questId, characterId, req.db);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message.includes('not accepted')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    req.logger.error('Error completing quest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/quests/:id/abandon
 * Abandon a quest (requires auth)
 * 
 * Body: { reason: "Optional reason for abandonment" }
 */
router.post('/:id/abandon', auth.required, async (req, res) => {
  try {
    const questId = req.params.id;
    const characterId = req.user.id;
    const { reason } = req.body;

    const quest = await QuestService.abandonQuest(questId, characterId, reason || 'No reason provided', req.db);

    res.json({
      success: true,
      data: quest
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message.includes('already completed')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    req.logger.error('Error abandoning quest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// OBJECTIVES
// ============================================================================

/**
 * GET /api/quests/:id/objectives
 * Get quest objectives with progress (requires auth)
 */
router.get('/:id/objectives', auth.required, async (req, res) => {
  try {
    const questId = req.params.id;
    const characterId = req.user.id;

    const objectives = await QuestService.getQuestObjectives(questId, characterId, req.db);

    res.json({
      success: true,
      count: objectives.length,
      data: objectives
    });
  } catch (err) {
    req.logger.error('Error fetching objectives:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/quests/:id/objectives/:objId/complete
 * Mark objective as complete (requires auth)
 */
router.post('/:id/objectives/:objId/complete', auth.required, async (req, res) => {
  try {
    const questId = req.params.id;
    const objectiveId = req.params.objId;
    const characterId = req.user.id;

    const result = await QuestService.completeObjective(objectiveId, questId, characterId, req.db);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error completing objective:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
