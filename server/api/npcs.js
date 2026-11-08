/**
 * NPC API Routes
 * 
 * Endpoints:
 * - GET /api/npcs - List all NPCs (paginated)
 * - GET /api/npcs/:id - Get NPC details
 * - GET /api/npcs/:id/dialogue - Generate dialogue via Gemini
 * - GET /api/npcs/:id/quests - Get quests offered by NPC
 * - GET /api/npcs/:id/stats - Get NPC statistics
 * - GET /api/npcs/location/:locationId - Get NPCs at location
 * - GET /api/character/:characterId/relationships - Get all NPC relationships
 * - POST /api/npcs/:id/recruit - Recruit NPC as companion
 * - GET /api/npcs/search/:query - Search NPCs
 */

import express from 'express';
import auth from '../middleware/auth.js';
import NPCService from '../services/npc.js';

const router = express.Router();

// ============================================================================
// LIST / SEARCH
// ============================================================================

/**
 * GET /api/npcs
 * List all NPCs (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const npcs = await NPCService.getAllNPCs(limit, offset, req.db);

    res.json({
      success: true,
      count: npcs.length,
      offset: offset,
      limit: limit,
      data: npcs
    });
  } catch (err) {
    req.logger.error('Error listing NPCs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/npcs/search/:query
 * Search NPCs by name or role
 */
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;

    if (query.length < 2) {
      return res.status(400).json({ success: false, error: 'Query too short' });
    }

    const npcs = await NPCService.searchNPCs(query, req.db);

    res.json({
      success: true,
      count: npcs.length,
      data: npcs
    });
  } catch (err) {
    req.logger.error('Error searching NPCs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// GET DETAILS
// ============================================================================

/**
 * GET /api/npcs/:id
 * Get NPC details (requires auth for affinity data)
 */
router.get('/:id', auth.optional, async (req, res) => {
  try {
    const npcId = req.params.id;
    const characterId = req.user?.id || null;

    const npcData = await NPCService.getNPC(npcId, characterId, req.db);

    res.json({
      success: true,
      data: npcData
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error fetching NPC:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/npcs/:id/stats
 * Get NPC statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const npcId = req.params.id;

    const stats = await NPCService.getNPCStats(npcId, req.db);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error fetching NPC stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// DIALOGUE / INTERACTION
// ============================================================================

/**
 * POST /api/npcs/:id/dialogue
 * Generate NPC dialogue via Gemini (requires auth)
 * 
 * Body: { message: "Your character message" }
 */
router.post('/:id/dialogue', auth.required, async (req, res) => {
  try {
    const npcId = req.params.id;
    const characterId = req.user.id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    const response = await NPCService.generateDialogue(npcId, characterId, message, req.db);

    res.json({
      success: true,
      data: response
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    req.logger.error('Error generating dialogue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/npcs/:id/conversation
 * Get conversation history with NPC (requires auth)
 */
router.get('/:id/conversation', auth.required, async (req, res) => {
  try {
    const npcId = req.params.id;
    const characterId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const history = await NPCService.getConversationHistory(npcId, characterId, limit, req.db);

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (err) {
    req.logger.error('Error fetching conversation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// LOCATION-BASED
// ============================================================================

/**
 * GET /api/npcs/location/:locationId
 * Get all NPCs at a location (optional auth for affinity)
 */
router.get('/location/:locationId', auth.optional, async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const characterId = req.user?.id || null;

    const npcs = await NPCService.getLocationNPCs(locationId, characterId, req.db);

    res.json({
      success: true,
      count: npcs.length,
      data: npcs
    });
  } catch (err) {
    req.logger.error('Error fetching location NPCs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// RELATIONSHIPS
// ============================================================================

/**
 * GET /api/characters/:characterId/relationships
 * Get all NPC relationships for character (requires auth)
 */
router.get('/character/:characterId/relationships', auth.required, async (req, res) => {
  try {
    const characterId = req.params.characterId;

    // Verify authorization (own character only)
    if (req.user.id !== characterId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const relationships = await NPCService.getCharacterRelationships(characterId, req.db);

    res.json({
      success: true,
      count: relationships.length,
      data: relationships
    });
  } catch (err) {
    req.logger.error('Error fetching relationships:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// COMPANION RECRUITMENT
// ============================================================================

/**
 * POST /api/npcs/:id/recruit
 * Recruit NPC as companion (requires auth)
 * 
 * Body: { cost: 500 }
 */
router.post('/:id/recruit', auth.required, async (req, res) => {
  try {
    const npcId = req.params.id;
    const characterId = req.user.id;
    const { cost } = req.body;

    if (!cost || cost < 0) {
      return res.status(400).json({ success: false, error: 'Valid cost required' });
    }

    const companion = await NPCService.recruitCompanion(npcId, characterId, cost, req.db);

    res.json({
      success: true,
      data: companion
    });
  } catch (err) {
    if (err.message.includes('Affinity too low')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.message.includes('Insufficient gold')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.message.includes('cannot be recruited')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    req.logger.error('Error recruiting companion:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
