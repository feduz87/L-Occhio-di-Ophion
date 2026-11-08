/**
 * Character API Routes
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validateCharacterCreation, validateUUID } from '../middleware/validation.js';
import * as characterService from '../services/character.js';

const router = express.Router();

/**
 * POST /api/characters
 * Create a new character
 */
router.post('/', authMiddleware, validateCharacterCreation, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const characterData = {
      name: req.body.name.trim(),
      heritage: req.body.heritage,
      race: req.body.race,
      class: req.body.class,
    };

    const character = await characterService.createCharacter(
      req.db,
      userId,
      characterData
    );

    res.status(201).json({
      message: 'Character created successfully',
      character,
    });
  } catch (error) {
    // Handle specific validation errors
    if (error.message.includes('Invalid')) {
      return res.status(422).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
    }

    // Database error
    req.logger.error('Character creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create character',
    });
  }
});

/**
 * GET /api/characters
 * List all characters for authenticated user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const characters = await characterService.listCharactersByUser(req.db, userId);

    res.json({
      characters,
    });
  } catch (error) {
    req.logger.error('Character list error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list characters',
    });
  }
});

/**
 * GET /api/characters/:character_id
 * Get character details with all components
 */
router.get('/:character_id', authMiddleware, validateUUID('character_id'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const characterId = req.params.character_id;

    const character = await characterService.getCharacterById(req.db, characterId, userId);

    res.json(character);
  } catch (error) {
    if (error.message === 'Character not found') {
      return res.status(404).json({
        error: 'Not found',
        message: 'Character not found',
      });
    }

    req.logger.error('Character fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch character',
    });
  }
});

/**
 * PATCH /api/characters/:character_id
 * Update character (name, etc.)
 */
router.patch('/:character_id', authMiddleware, validateUUID('character_id'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const characterId = req.params.character_id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'name is required',
      });
    }

    // Validate name
    characterService.validateName(name);

    // Check ownership
    const charResult = await req.db.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (charResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Character not found',
      });
    }

    if (charResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not own this character',
      });
    }

    // Check for duplicate name
    const dupResult = await req.db.query(
      'SELECT id FROM characters WHERE user_id = $1 AND name = $2 AND id != $3',
      [userId, name.trim(), characterId]
    );

    if (dupResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Character name already exists',
      });
    }

    // Update
    await req.db.query(
      'UPDATE characters SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [name.trim(), characterId]
    );

    // Return updated character
    const character = await characterService.getCharacterById(req.db, characterId, userId);
    res.json(character);
  } catch (error) {
    if (error.message.includes('name')) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
      });
    }

    req.logger.error('Character update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update character',
    });
  }
});

export default router;
