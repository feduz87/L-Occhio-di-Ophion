/**
 * NPC Service
 * 
 * Manages:
 * - NPC creation and retrieval
 * - Affinity tracking and updates
 * - IA-powered dialogue generation (Gemini)
 * - Conversation history
 * - Quest assignment
 * - Companion recruitment
 */

import db from '../db/init.js';
import { generateText, generateDialogue } from './gemini.js';

class NPCService {
  /**
   * Get full NPC details with current state and player affinity
   */
  static async getNPC(npcId, characterId = null, db) {
    const npcResult = await db.query(
      'SELECT * FROM npcs WHERE id = $1',
      [npcId]
    );

    if (npcResult.rows.length === 0) {
      throw new Error('NPC not found');
    }

    const npc = npcResult.rows[0];

    // Get NPC state
    const stateResult = await db.query(
      'SELECT * FROM npc_state WHERE npc_id = $1',
      [npcId]
    );

    const npcState = stateResult.rows.length > 0 ? stateResult.rows[0] : null;

    // Get player's affinity with this NPC (if provided)
    let playerAffinity = null;
    if (characterId) {
      const affResult = await db.query(
        'SELECT * FROM character_relationships WHERE character_id = $1 AND npc_id = $2',
        [characterId, npcId]
      );

      playerAffinity = affResult.rows.length > 0 ? affResult.rows[0] : null;
    }

    // Get hotspot details (location)
    const hotspotResult = await db.query(
      `SELECT h.*, m.name as location_name 
       FROM hotspots h
       JOIN map_nodes m ON h.node_id = m.id
       WHERE h.id = $1`,
      [npc.hotspot_id]
    );

    const location = hotspotResult.rows.length > 0 ? hotspotResult.rows[0] : null;

    return {
      npc: {
        ...npc,
        personality: JSON.parse(npc.personality || '{}')
      },
      state: npcState,
      affinity: playerAffinity,
      location: location
    };
  }

  /**
   * Generate dialogue via Gemini with context
   * 
   * Returns NPC response with affinity changes
   */
  static async generateDialogue(npcId, characterId, playerMessage, db) {
    const npcData = await this.getNPC(npcId, characterId, db);
    
    if (!npcData) {
      throw new Error('NPC not found');
    }

    const { npc, state, affinity, location } = npcData;
    const personality = npc.personality;

    // Build context for Gemini
    const affinityLevel = affinity ? affinity.current_affinity : npc.initial_affinity;
    let attitude = 'neutral';
    if (affinityLevel < -50) attitude = 'hostile';
    else if (affinityLevel < -20) attitude = 'suspicious';
    else if (affinityLevel > 50) attitude = 'friendly';
    else if (affinityLevel > 20) attitude = 'warm';

    const conversationContext = {
      npc_name: npc.name,
      npc_race: npc.race,
      npc_role: npc.role,
      personality: personality,
      current_mood: state?.current_mood || 'neutral',
      affinity_level: affinityLevel,
      attitude: attitude,
      location: location?.location_name || 'unknown',
      player_message: playerMessage
    };

    // Generate response via Gemini
    let npcResponse;
    try {
      npcResponse = await generateDialogue(npc.name, conversationContext);
    } catch (err) {
      // Fallback to template
      npcResponse = this._getDialogueTemplate(attitude, npc.role);
    }

    // Parse affinity delta from dialogue (simplified)
    const affinityDelta = this._parseAffinityDelta(playerMessage, npcResponse, attitude);

    // Store in dialogue history
    await db.query(
      `INSERT INTO dialogue_history (character_id, npc_id, player_message, npc_response, affinity_delta, emotion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [characterId, npcId, playerMessage, npcResponse, affinityDelta, attitude]
    );

    // Update affinity
    const newAffinity = await this.updateAffinity(npcId, characterId, affinityDelta, db);

    return {
      response: npcResponse,
      affinity_delta: affinityDelta,
      new_affinity: newAffinity.current_affinity,
      relationship_type: newAffinity.relationship_type,
      emotion: attitude
    };
  }

  /**
   * Simplified affinity delta parser
   * In production, could use sentiment analysis
   */
  static _parseAffinityDelta(playerMessage, npcResponse, attitude) {
    // Base delta based on NPC attitude
    let delta = 0;

    if (attitude === 'friendly') delta = 5;
    else if (attitude === 'warm') delta = 3;
    else if (attitude === 'hostile') delta = -5;
    else if (attitude === 'suspicious') delta = -2;

    // Check message content for modifiers
    const positiveWords = ['thank', 'please', 'help', 'friend', 'respect', 'love', 'good'];
    const negativeWords = ['hate', 'stupid', 'weak', 'coward', 'insult', 'terrible'];

    const lowerMessage = playerMessage.toLowerCase();

    for (const word of positiveWords) {
      if (lowerMessage.includes(word)) delta += 2;
    }

    for (const word of negativeWords) {
      if (lowerMessage.includes(word)) delta -= 3;
    }

    return Math.max(-10, Math.min(10, delta)); // Cap at ±10
  }

  /**
   * Get dialogue template fallback
   */
  static _getDialogueTemplate(attitude, role) {
    const templates = {
      hostile: {
        merchant: 'I have nothing to sell to you. Leave.',
        quest_giver: 'Don\'t waste my time.',
        warrior: 'Draw your blade or get out!',
        mage: 'Your presence disturbs the magical balance.'
      },
      suspicious: {
        merchant: 'What\'s your business? Be quick about it.',
        quest_giver: 'I\'ll need to know more about you first.',
        warrior: 'You look trouble. Prove yourself trustworthy.',
        mage: 'Your intentions are unclear to me.'
      },
      neutral: {
        merchant: 'What can I help you with?',
        quest_giver: 'We have work if you\'re interested.',
        warrior: 'State your business.',
        mage: 'Welcome. What brings you here?'
      },
      warm: {
        merchant: 'Welcome back! What can I get you?',
        quest_giver: 'Good to see you. Interested in another task?',
        warrior: 'Good to see you, friend.',
        mage: 'Welcome, traveler. Always pleased to see you.'
      },
      friendly: {
        merchant: 'Ah, my friend! The best for you, as always!',
        quest_giver: 'My dear friend, I have just the thing for you.',
        warrior: 'My brother/sister! Let\'s share an ale!',
        mage: 'Welcome home, trusted one.'
      }
    };

    const typeTemplates = templates[attitude] || templates.neutral;
    const defaultTemplate = typeTemplates[role] || typeTemplates.merchant;

    return defaultTemplate;
  }

  /**
   * Update affinity for character ↔ NPC relationship
   */
  static async updateAffinity(npcId, characterId, delta, db) {
    // Get or create relationship
    let result = await db.query(
      'SELECT * FROM character_relationships WHERE character_id = $1 AND npc_id = $2',
      [characterId, npcId]
    );

    let newAffinity;
    if (result.rows.length === 0) {
      // Create new relationship
      const npcResult = await db.query(
        'SELECT initial_affinity FROM npcs WHERE id = $1',
        [npcId]
      );

      newAffinity = npcResult.rows[0].initial_affinity + delta;

      await db.query(
        `INSERT INTO character_relationships (character_id, npc_id, current_affinity, last_talked)
         VALUES ($1, $2, $3, NOW())`,
        [characterId, npcId, newAffinity]
      );
    } else {
      // Update existing
      newAffinity = Math.max(-100, Math.min(100, result.rows[0].current_affinity + delta));

      await db.query(
        `UPDATE character_relationships 
         SET current_affinity = $1, last_talked = NOW()
         WHERE character_id = $2 AND npc_id = $3`,
        [newAffinity, characterId, npcId]
      );
    }

    // Determine relationship type based on affinity
    let relationshipType = 'neutral';
    if (newAffinity < -50) relationshipType = 'ostile'; // hostile
    else if (newAffinity < -10) relationshipType = 'suspicious';
    else if (newAffinity > 70) relationshipType = 'amante'; // lover/beloved
    else if (newAffinity > 40) relationshipType = 'amico'; // friend
    else if (newAffinity > 10) relationshipType = 'acquaintance';

    // Update relationship type
    await db.query(
      `UPDATE character_relationships 
       SET relationship_type = $1
       WHERE character_id = $2 AND npc_id = $3`,
      [relationshipType, characterId, npcId]
    );

    return {
      current_affinity: newAffinity,
      relationship_type: relationshipType
    };
  }

  /**
   * Get conversation history with NPC
   */
  static async getConversationHistory(npcId, characterId, limit = 20, db) {
    const result = await db.query(
      `SELECT player_message, npc_response, affinity_delta, emotion, created_at
       FROM dialogue_history
       WHERE character_id = $1 AND npc_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [characterId, npcId, limit]
    );

    return result.rows.reverse(); // Chronological order
  }

  /**
   * Assign quest to character from NPC
   */
  static async assignQuest(questId, characterId, db) {
    // Check quest exists
    const questResult = await db.query(
      'SELECT * FROM quests WHERE id = $1',
      [questId]
    );

    if (questResult.rows.length === 0) {
      throw new Error('Quest not found');
    }

    const quest = questResult.rows[0];

    // Check if already assigned
    const existing = await db.query(
      'SELECT id FROM character_quests WHERE character_id = $1 AND quest_id = $2',
      [characterId, questId]
    );

    if (existing.rows.length > 0) {
      throw new Error('Quest already assigned');
    }

    // Create character quest
    const result = await db.query(
      `INSERT INTO character_quests (character_id, quest_id, status, progress)
       VALUES ($1, $2, 'accepted', 0)
       RETURNING *`,
      [characterId, questId]
    );

    return result.rows[0];
  }

  /**
   * Get quests offered by NPC
   */
  static async getQuestsFromNPC(npcId, db) {
    const result = await db.query(
      `SELECT id, name, description, difficulty, rewards_gold, quest_type
       FROM quests
       WHERE quest_giver_id = $1
       ORDER BY difficulty`,
      [npcId]
    );

    return result.rows;
  }

  /**
   * Get NPCs in location
   */
  static async getLocationNPCs(locationId, characterId = null, db) {
    let query = `
      SELECT DISTINCT n.id, n.name, n.role, n.personality, h.position_x, h.position_y
      FROM npcs n
      JOIN hotspots h ON n.hotspot_id = h.id
      WHERE h.node_id = $1
      ORDER BY h.position_y, h.position_x
    `;

    const params = [locationId];

    const result = await db.query(query, params);

    // Enrich with affinity if character provided
    if (characterId) {
      for (const npc of result.rows) {
        const affResult = await db.query(
          'SELECT current_affinity, relationship_type FROM character_relationships WHERE character_id = $1 AND npc_id = $2',
          [characterId, npc.id]
        );

        npc.affinity = affResult.rows.length > 0 ? affResult.rows[0] : null;
      }
    }

    return result.rows;
  }

  /**
   * Get all NPCs (paginated)
   */
  static async getAllNPCs(limit = 50, offset = 0, db) {
    const result = await db.query(
      `SELECT n.*, h.node_id, m.name as location_name
       FROM npcs n
       JOIN hotspots h ON n.hotspot_id = h.id
       JOIN map_nodes m ON h.node_id = m.id
       ORDER BY n.name
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Get NPC statistics
   */
  static async getNPCStats(npcId, db) {
    // Count interactions
    const interactionResult = await db.query(
      `SELECT COUNT(*) as interaction_count,
              AVG(affinity_delta) as average_affinity_delta
       FROM dialogue_history
       WHERE npc_id = $1`,
      [npcId]
    );

    // Get affinity spread
    const affinityResult = await db.query(
      `SELECT MIN(current_affinity) as min_affinity,
              MAX(current_affinity) as max_affinity,
              AVG(current_affinity) as average_affinity,
              COUNT(*) as player_count
       FROM character_relationships
       WHERE npc_id = $1`,
      [npcId]
    );

    const interactions = interactionResult.rows[0];
    const affinity = affinityResult.rows[0];

    return {
      total_interactions: parseInt(interactions.interaction_count) || 0,
      average_affinity_delta: parseFloat(interactions.average_affinity_delta || 0).toFixed(2),
      affinity_range: {
        min: parseInt(affinity.min_affinity) || 0,
        max: parseInt(affinity.max_affinity) || 0,
        average: parseFloat(affinity.average_affinity || 0).toFixed(1)
      },
      known_to_players: parseInt(affinity.player_count) || 0
    };
  }

  /**
   * Get character's all relationships with NPCs
   */
  static async getCharacterRelationships(characterId, db) {
    const result = await db.query(
      `SELECT cr.*, n.name, n.role, n.race
       FROM character_relationships cr
       JOIN npcs n ON cr.npc_id = n.id
       ORDER BY cr.current_affinity DESC`,
      [characterId]
    );

    return result.rows;
  }

  /**
   * Recruit NPC as companion
   */
  static async recruitCompanion(npcId, characterId, cost, db) {
    // Check NPC is recruitable
    const npcResult = await db.query(
      'SELECT * FROM npcs WHERE id = $1',
      [npcId]
    );

    if (npcResult.rows.length === 0 || !npcResult.rows[0].is_recruitable) {
      throw new Error('NPC cannot be recruited');
    }

    // Check affinity requirement
    const affResult = await db.query(
      'SELECT current_affinity FROM character_relationships WHERE character_id = $1 AND npc_id = $2',
      [characterId, npcId]
    );

    const affinity = affResult.rows.length > 0 ? affResult.rows[0].current_affinity : 0;

    if (affinity < 20) {
      throw new Error('Affinity too low for recruitment (need 20+)');
    }

    // Check character has enough gold
    const charResult = await db.query(
      'SELECT gold FROM characters WHERE id = $1',
      [characterId]
    );

    if (charResult.rows[0].gold < cost) {
      throw new Error('Insufficient gold');
    }

    // Create companion record
    const result = await db.query(
      `INSERT INTO companions (character_id, npc_id, status, recruitment_cost_gold)
       VALUES ($1, $2, 'recruited', $3)
       RETURNING *`,
      [characterId, npcId, cost]
    );

    // Deduct gold
    await db.query(
      'UPDATE characters SET gold = gold - $1 WHERE id = $2',
      [cost, characterId]
    );

    return result.rows[0];
  }

  /**
   * Search NPCs by name or role
   */
  static async searchNPCs(query, db) {
    const result = await db.query(
      `SELECT * FROM npcs
       WHERE name ILIKE $1 OR role ILIKE $1
       ORDER BY name
       LIMIT 20`,
      [`%${query}%`]
    );

    return result.rows;
  }
}

export default NPCService;
