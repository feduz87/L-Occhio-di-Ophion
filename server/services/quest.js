/**
 * Quest Service
 * 
 * Manages:
 * - Quest lifecycle (accept, progress, complete, abandon)
 * - Reward calculation and distribution
 * - Quest objectives tracking
 * - Quest conditions and requirements
 * - Quest statistics and history
 */

const db = require('../db/init');

class QuestService {
  /**
   * Get quest details
   */
  static async getQuest(questId, db) {
    const result = await db.query(
      `SELECT q.*, n.name as quest_giver_name, n.role as quest_giver_role
       FROM quests q
       LEFT JOIN npcs n ON q.quest_giver_id = n.id
       WHERE q.id = $1`,
      [questId]
    );

    if (result.rows.length === 0) {
      throw new Error('Quest not found');
    }

    const quest = result.rows[0];

    // Get objectives
    const objectivesResult = await db.query(
      'SELECT * FROM quest_objectives WHERE quest_id = $1 ORDER BY order_num',
      [questId]
    );

    quest.objectives = objectivesResult.rows;

    // Get rewards
    const rewardsResult = await db.query(
      'SELECT * FROM quest_rewards WHERE quest_id = $1',
      [questId]
    );

    quest.rewards = rewardsResult.rows;

    // Parse conditions if JSON
    if (typeof quest.conditions === 'string') {
      quest.conditions = JSON.parse(quest.conditions || '{}');
    }

    return quest;
  }

  /**
   * Get active quests for character
   */
  static async getActiveQuests(characterId, db) {
    const result = await db.query(
      `SELECT cq.*, q.name, q.description, q.difficulty, q.quest_type,
              n.name as quest_giver_name, n.role as quest_giver_role
       FROM character_quests cq
       JOIN quests q ON cq.quest_id = q.id
       LEFT JOIN npcs n ON q.quest_giver_id = n.id
       WHERE cq.character_id = $1 AND cq.status IN ('accepted', 'in_progress')
       ORDER BY cq.created_at DESC`,
      [characterId]
    );

    return result.rows;
  }

  /**
   * Get all quests for character (including completed/failed)
   */
  static async getAllQuests(characterId, db) {
    const result = await db.query(
      `SELECT cq.*, q.name, q.description, q.difficulty, q.quest_type,
              n.name as quest_giver_name
       FROM character_quests cq
       JOIN quests q ON cq.quest_id = q.id
       LEFT JOIN npcs n ON q.quest_giver_id = n.id
       WHERE cq.character_id = $1
       ORDER BY cq.created_at DESC`,
      [characterId]
    );

    return result.rows;
  }

  /**
   * Get quests available at location
   */
  static async getQuestsAtLocation(locationId, characterId = null, db) {
    let query = `
      SELECT DISTINCT q.id, q.name, q.description, q.difficulty, q.quest_type,
                      q.rewards_gold, n.name as quest_giver_name, n.role
      FROM quests q
      JOIN npcs n ON q.quest_giver_id = n.id
      JOIN hotspots h ON n.hotspot_id = h.id
      WHERE h.node_id = $1
      ORDER BY q.difficulty, q.name
    `;

    const params = [locationId];

    const result = await db.query(query, params);

    // Enrich with player status if provided
    if (characterId) {
      for (const quest of result.rows) {
        const statusResult = await db.query(
          'SELECT status FROM character_quests WHERE character_id = $1 AND quest_id = $2',
          [characterId, quest.id]
        );

        quest.player_status = statusResult.rows.length > 0 ? statusResult.rows[0].status : null;
      }
    }

    return result.rows;
  }

  /**
   * Accept quest (create character_quests record)
   */
  static async acceptQuest(questId, characterId, db) {
    // Check quest exists
    const questCheck = await db.query(
      'SELECT * FROM quests WHERE id = $1',
      [questId]
    );

    if (questCheck.rows.length === 0) {
      throw new Error('Quest not found');
    }

    // Check not already accepted
    const existingCheck = await db.query(
      'SELECT id FROM character_quests WHERE character_id = $1 AND quest_id = $2',
      [characterId, questId]
    );

    if (existingCheck.rows.length > 0) {
      throw new Error('Quest already accepted or completed');
    }

    // Create character_quests record
    const result = await db.query(
      `INSERT INTO character_quests (character_id, quest_id, status, progress)
       VALUES ($1, $2, 'accepted', 0)
       RETURNING *`,
      [characterId, questId]
    );

    return result.rows[0];
  }

  /**
   * Update quest progress (0-100)
   */
  static async updateProgress(questId, characterId, progressDelta, db) {
    const result = await db.query(
      `UPDATE character_quests
       SET progress = LEAST(100, GREATEST(0, progress + $1))
       WHERE character_id = $2 AND quest_id = $3 AND status != 'completed'
       RETURNING *`,
      [progressDelta, characterId, questId]
    );

    if (result.rows.length === 0) {
      throw new Error('Quest not found or already completed');
    }

    return result.rows[0];
  }

  /**
   * Complete quest and distribute rewards
   */
  static async completeQuest(questId, characterId, db) {
    // Get quest details
    const questResult = await db.query(
      'SELECT * FROM quests WHERE id = $1',
      [questId]
    );

    if (questResult.rows.length === 0) {
      throw new Error('Quest not found');
    }

    const quest = questResult.rows[0];

    // Get character quest
    const charQuestResult = await db.query(
      'SELECT * FROM character_quests WHERE character_id = $1 AND quest_id = $2',
      [characterId, questId]
    );

    if (charQuestResult.rows.length === 0) {
      throw new Error('Character has not accepted this quest');
    }

    // Get rewards
    const rewardsResult = await db.query(
      'SELECT * FROM quest_rewards WHERE quest_id = $1',
      [questId]
    );

    const rewards = rewardsResult.rows;

    // Calculate total gold
    let totalGold = quest.rewards_gold || 0;
    for (const reward of rewards) {
      if (reward.reward_type === 'gold') {
        totalGold += reward.reward_value;
      }
    }

    // Update character quest status
    const updatedQuest = await db.query(
      `UPDATE character_quests
       SET status = 'completed', progress = 100, completed_at = NOW()
       WHERE character_id = $1 AND quest_id = $2
       RETURNING *`,
      [characterId, questId]
    );

    // Award gold
    if (totalGold > 0) {
      await db.query(
        'UPDATE characters SET gold = gold + $1 WHERE id = $2',
        [totalGold, characterId]
      );
    }

    // Award other rewards
    let awardedItems = [];
    for (const reward of rewards) {
      if (reward.reward_type === 'item') {
        // Add to character inventory
        const itemResult = await db.query(
          `INSERT INTO character_inventory (character_id, item_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (character_id, item_id) DO UPDATE
           SET quantity = character_inventory.quantity + $3
           RETURNING *`,
          [characterId, reward.reward_value, 1]
        );

        awardedItems.push({
          item_id: reward.reward_value,
          quantity: 1
        });
      }

      if (reward.reward_type === 'experience') {
        // Award experience
        await db.query(
          'UPDATE characters SET experience = experience + $1 WHERE id = $2',
          [reward.reward_value, characterId]
        );
      }
    }

    // Update NPC affinity (quest giver likes successful completion)
    if (quest.quest_giver_id) {
      await db.query(
        `UPDATE character_relationships
         SET current_affinity = LEAST(100, current_affinity + 10)
         WHERE character_id = $1 AND npc_id = $2`,
        [characterId, quest.quest_giver_id]
      );
    }

    return {
      quest: updatedQuest.rows[0],
      rewards: {
        gold: totalGold,
        items: awardedItems,
        experience: rewards.reduce((sum, r) => sum + (r.reward_type === 'experience' ? r.reward_value : 0), 0)
      }
    };
  }

  /**
   * Fail/Abandon quest
   */
  static async abandonQuest(questId, characterId, reason, db) {
    const result = await db.query(
      `UPDATE character_quests
       SET status = 'abandoned', abandoned_reason = $1, abandoned_at = NOW()
       WHERE character_id = $2 AND quest_id = $3
       RETURNING *`,
      [reason, characterId, questId]
    );

    if (result.rows.length === 0) {
      throw new Error('Quest not found or already completed');
    }

    // Slight affinity penalty with quest giver
    const questResult = await db.query(
      'SELECT quest_giver_id FROM quests WHERE id = $1',
      [questId]
    );

    if (questResult.rows[0].quest_giver_id) {
      await db.query(
        `UPDATE character_relationships
         SET current_affinity = GREATEST(-100, current_affinity - 3)
         WHERE character_id = $1 AND npc_id = $2`,
        [characterId, questResult.rows[0].quest_giver_id]
      );
    }

    return result.rows[0];
  }

  /**
   * Get quest objectives and progress
   */
  static async getQuestObjectives(questId, characterId, db) {
    const result = await db.query(
      `SELECT qo.*, cqo.completed
       FROM quest_objectives qo
       LEFT JOIN character_quest_objectives cqo 
         ON qo.id = cqo.objective_id AND cqo.character_id = $1
       WHERE qo.quest_id = $2
       ORDER BY qo.order_num`,
      [characterId, questId]
    );

    return result.rows;
  }

  /**
   * Mark quest objective as complete
   */
  static async completeObjective(objectiveId, questId, characterId, db) {
    // Verify objective belongs to quest
    const objCheck = await db.query(
      'SELECT * FROM quest_objectives WHERE id = $1 AND quest_id = $2',
      [objectiveId, questId]
    );

    if (objCheck.rows.length === 0) {
      throw new Error('Objective not found');
    }

    // Insert/update objective completion
    const result = await db.query(
      `INSERT INTO character_quest_objectives (character_id, objective_id, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (character_id, objective_id) DO UPDATE
       SET completed = true, completed_at = NOW()
       RETURNING *`,
      [characterId, objectiveId]
    );

    // Check if all objectives complete → auto-complete quest if eligible
    const allCompleteCheck = await db.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN cqo.completed = true THEN 1 ELSE 0 END) as completed
       FROM quest_objectives qo
       LEFT JOIN character_quest_objectives cqo 
         ON qo.id = cqo.objective_id AND cqo.character_id = $1
       WHERE qo.quest_id = $2`,
      [characterId, questId]
    );

    const { total, completed } = allCompleteCheck.rows[0];

    if (total > 0 && parseInt(completed) === parseInt(total)) {
      // All objectives complete
      const charQuest = await db.query(
        'SELECT status FROM character_quests WHERE character_id = $1 AND quest_id = $2',
        [characterId, questId]
      );

      if (charQuest.rows[0].status !== 'completed') {
        // Mark quest as ready for completion
        await db.query(
          `UPDATE character_quests
           SET status = 'ready_to_complete'
           WHERE character_id = $1 AND quest_id = $2`,
          [characterId, questId]
        );
      }
    }

    return result.rows[0];
  }

  /**
   * Get quest statistics
   */
  static async getQuestStats(characterId, db) {
    const result = await db.query(
      `SELECT
        COUNT(CASE WHEN status = 'accepted' OR status = 'in_progress' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN q.rewards_gold ELSE 0 END), 0) as total_gold_earned
       FROM character_quests cq
       JOIN quests q ON cq.quest_id = q.id
       WHERE cq.character_id = $1`,
      [characterId]
    );

    return result.rows[0];
  }

  /**
   * Get quest by difficulty level
   */
  static async getQuestsByDifficulty(difficulty, db) {
    const result = await db.query(
      `SELECT * FROM quests WHERE difficulty = $1 ORDER BY name`,
      [difficulty]
    );

    return result.rows;
  }

  /**
   * Get quests by type
   */
  static async getQuestsByType(questType, db) {
    const result = await db.query(
      `SELECT * FROM quests WHERE quest_type = $1 ORDER BY name`,
      [questType]
    );

    return result.rows;
  }

  /**
   * Search quests by keyword
   */
  static async searchQuests(keyword, db) {
    const result = await db.query(
      `SELECT * FROM quests
       WHERE name ILIKE $1 OR description ILIKE $1
       ORDER BY name
       LIMIT 20`,
      [`%${keyword}%`]
    );

    return result.rows;
  }

  /**
   * Calculate quest difficulty based on level and objectives
   */
  static async calculateDifficulty(questId, db) {
    const quest = await this.getQuest(questId, db);

    let difficulty = 1;

    // Base on explicit difficulty level
    const diffMap = { easy: 1, medium: 2, hard: 3, extreme: 4 };
    if (quest.difficulty) {
      difficulty = diffMap[quest.difficulty.toLowerCase()] || 1;
    }

    // Adjust by objective count
    if (quest.objectives && quest.objectives.length > 3) {
      difficulty += 1;
    }

    // Adjust by condition complexity
    if (quest.conditions && Object.keys(quest.conditions).length > 2) {
      difficulty += 1;
    }

    return Math.min(4, difficulty);
  }

  /**
   * Get quest recommendations for character
   */
  static async getRecommendedQuests(characterId, db) {
    // Get character level/stats for recommendation
    const charResult = await db.query(
      'SELECT level, experience FROM characters WHERE id = $1',
      [characterId]
    );

    if (charResult.rows.length === 0) {
      throw new Error('Character not found');
    }

    const character = charResult.rows[0];

    // Get quests not yet accepted, with matching difficulty
    const result = await db.query(
      `SELECT q.*, n.name as quest_giver_name
       FROM quests q
       LEFT JOIN npcs n ON q.quest_giver_id = n.id
       WHERE q.id NOT IN (
         SELECT quest_id FROM character_quests WHERE character_id = $1
       )
       ORDER BY q.difficulty, q.rewards_gold DESC
       LIMIT 10`,
      [characterId]
    );

    return result.rows;
  }

  /**
   * Get recently completed quests (for story tracking)
   */
  static async getRecentlyCompleted(characterId, limit = 10, db) {
    const result = await db.query(
      `SELECT cq.*, q.name, q.description, n.name as quest_giver_name
       FROM character_quests cq
       JOIN quests q ON cq.quest_id = q.id
       LEFT JOIN npcs n ON q.quest_giver_id = n.id
       WHERE cq.character_id = $1 AND cq.status = 'completed'
       ORDER BY cq.completed_at DESC
       LIMIT $2`,
      [characterId, limit]
    );

    return result.rows;
  }
}

module.exports = QuestService;
