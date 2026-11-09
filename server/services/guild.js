// L'Occhio di Ophion - Guild Service
// Manages guilds, memberships, treasury, and permissions

import pool from '../db/pool.js';
import logger from '../utils/logger.js';

class GuildService {
  // ==================== GUILD MANAGEMENT ====================

  /**
   * Create new guild
   */
  async createGuild(founderId, guildName, description = '') {
    try {
      // Check name uniqueness
      const existing = await pool.query(
        `SELECT id FROM guilds WHERE LOWER(guild_name) = LOWER($1)`,
        [guildName]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Guild name already exists');
      }
      
      const result = await pool.query(
        `
        SELECT create_guild($1, $2, $3) AS guild_id
        `,
        [guildName, founderId, description]
      );
      
      const guildId = result.rows[0].guild_id;
      logger.info(`✅ Guild created: ${guildName} (ID: ${guildId})`);
      
      return guildId;
    } catch (error) {
      logger.error(`❌ Failed to create guild: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disband guild (founder only)
   */
  async disbandGuild(guildId, characterId) {
    try {
      // Verify founder
      const result = await pool.query(
        `SELECT founder_id FROM guilds WHERE id = $1`,
        [guildId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Guild not found');
      }
      
      if (result.rows[0].founder_id !== characterId) {
        throw new Error('Only guild founder can disband guild');
      }
      
      // Delete guild (cascades to members, treasury, logs)
      await pool.query(`DELETE FROM guilds WHERE id = $1`, [guildId]);
      
      logger.info(`✅ Guild ${guildId} disbanded by ${characterId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to disband guild: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guild details
   */
  async getGuildDetails(guildId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          g.*,
          c.name as founder_name
        FROM guilds g
        JOIN characters c ON g.founder_id = c.id
        WHERE g.id = $1
        `,
        [guildId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get guild details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search guilds
   */
  async searchGuilds(searchTerm, limit = 20) {
    try {
      const result = await pool.query(
        `
        SELECT 
          g.id,
          g.guild_name,
          g.level,
          g.description,
          g.current_member_count,
          g.max_members,
          c.name as founder_name
        FROM guilds g
        JOIN characters c ON g.founder_id = c.id
        WHERE LOWER(g.guild_name) LIKE LOWER($1)
        ORDER BY g.level DESC, g.experience DESC
        LIMIT $2
        `,
        [`%${searchTerm}%`, limit]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to search guilds: ${error.message}`);
      throw error;
    }
  }

  // ==================== MEMBERSHIP MANAGEMENT ====================

  /**
   * Join guild
   */
  async joinGuild(guildId, characterId) {
    try {
      const result = await pool.query(
        `SELECT join_guild($1, $2) AS success`,
        [guildId, characterId]
      );
      
      if (!result.rows[0].success) {
        throw new Error('Failed to join guild (full or other issue)');
      }
      
      logger.info(`✅ Character ${characterId} joined guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to join guild: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave guild
   */
  async leaveGuild(guildId, characterId) {
    try {
      // Check if founder
      const guildResult = await pool.query(
        `SELECT founder_id FROM guilds WHERE id = $1`,
        [guildId]
      );
      
      if (guildResult.rows[0].founder_id === characterId) {
        throw new Error('Founder cannot leave guild (use disband)');
      }
      
      // Remove member
      await pool.query(
        `DELETE FROM guild_members WHERE guild_id = $1 AND character_id = $2`,
        [guildId, characterId]
      );
      
      // Decrease member count
      await pool.query(
        `UPDATE guilds SET current_member_count = GREATEST(1, current_member_count - 1) WHERE id = $1`,
        [guildId]
      );
      
      // Log action
      await this.logGuildAction(guildId, characterId, 'member_leave', { character_id: characterId });
      
      logger.info(`✅ Character ${characterId} left guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to leave guild: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId) {
    try {
      const result = await pool.query(
        `SELECT * FROM guild_members_view WHERE guild_id = $1`,
        [guildId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get guild members: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get character's guild
   */
  async getCharacterGuild(characterId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          g.*,
          gm.rank,
          gm.contribution_points,
          c.name as founder_name
        FROM guild_members gm
        JOIN guilds g ON gm.guild_id = g.id
        JOIN characters c ON g.founder_id = c.id
        WHERE gm.character_id = $1
        `,
        [characterId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get character guild: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change member rank
   */
  async changeMemberRank(guildId, targetCharacterId, newRank, authorityId) {
    try {
      // Verify authority (officer or founder)
      const authResult = await pool.query(
        `
        SELECT rank FROM guild_members
        WHERE guild_id = $1 AND character_id = $2
        `,
        [guildId, authorityId]
      );
      
      if (authResult.rows.length === 0) {
        throw new Error('You are not a guild member');
      }
      
      const { rank } = authResult.rows[0];
      if (!['founder', 'officer'].includes(rank)) {
        throw new Error('Insufficient permissions');
      }
      
      // Validate new rank
      if (!['founder', 'officer', 'member', 'recruit'].includes(newRank)) {
        throw new Error('Invalid rank');
      }
      
      // Cannot demote founder
      const targetResult = await pool.query(
        `SELECT rank FROM guild_members WHERE guild_id = $1 AND character_id = $2`,
        [guildId, targetCharacterId]
      );
      
      if (targetResult.rows[0].rank === 'founder') {
        throw new Error('Cannot change founder rank');
      }
      
      await pool.query(
        `UPDATE guild_members SET rank = $1, updated_at = CURRENT_TIMESTAMP
         WHERE guild_id = $2 AND character_id = $3`,
        [newRank, guildId, targetCharacterId]
      );
      
      await this.logGuildAction(guildId, authorityId, 'rank_change', {
        target_id: targetCharacterId,
        new_rank: newRank
      });
      
      logger.info(`✅ Rank changed for character ${targetCharacterId} to ${newRank}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to change member rank: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add contribution points
   */
  async addContributionPoints(guildId, characterId, points) {
    try {
      await pool.query(
        `
        UPDATE guild_members
        SET contribution_points = contribution_points + $3
        WHERE guild_id = $1 AND character_id = $2
        `,
        [guildId, characterId, points]
      );
      
      // Update guild experience
      const expMultiplier = 10;
      await pool.query(
        `
        UPDATE guilds
        SET experience = experience + $2
        WHERE id = $1
        `,
        [guildId, points * expMultiplier]
      );
      
      logger.info(`✅ Added ${points} contribution points to character ${characterId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to add contribution points: ${error.message}`);
      throw error;
    }
  }

  // ==================== TREASURY MANAGEMENT ====================

  /**
   * Get guild treasury
   */
  async getTreasury(guildId) {
    try {
      const result = await pool.query(
        `SELECT * FROM guild_treasury WHERE guild_id = $1`,
        [guildId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get treasury: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deposit gold to treasury
   */
  async depositGold(guildId, characterId, amount) {
    try {
      // Start transaction
      await pool.query('BEGIN');
      
      // Verify character has gold
      const charResult = await pool.query(
        `SELECT currency FROM character_attributes WHERE character_id = $1`,
        [characterId]
      );
      
      if (charResult.rows[0].currency < amount) {
        await pool.query('ROLLBACK');
        throw new Error('Insufficient gold');
      }
      
      // Deduct from character
      await pool.query(
        `UPDATE character_attributes SET currency = currency - $2 WHERE character_id = $1`,
        [characterId, amount]
      );
      
      // Add to treasury
      await pool.query(
        `UPDATE guild_treasury SET gold_amount = gold_amount + $2 WHERE guild_id = $1`,
        [guildId, amount]
      );
      
      // Log action
      await this.logGuildAction(guildId, characterId, 'treasure_deposit', {
        amount,
        type: 'gold'
      });
      
      await pool.query('COMMIT');
      
      logger.info(`✅ Deposited ${amount} gold to guild ${guildId}`);
      return true;
    } catch (error) {
      await pool.query('ROLLBACK').catch(() => {});
      logger.error(`❌ Failed to deposit gold: ${error.message}`);
      throw error;
    }
  }

  /**
   * Withdraw gold from treasury (officer+)
   */
  async withdrawGold(guildId, characterId, amount) {
    try {
      // Verify rank
      const rankResult = await pool.query(
        `SELECT rank FROM guild_members WHERE guild_id = $1 AND character_id = $2`,
        [guildId, characterId]
      );
      
      if (rankResult.rows.length === 0) {
        throw new Error('Not a guild member');
      }
      
      const { rank } = rankResult.rows[0];
      if (!['founder', 'officer'].includes(rank)) {
        throw new Error('Insufficient permissions (officer+ required)');
      }
      
      // Start transaction
      await pool.query('BEGIN');
      
      // Verify treasury has funds
      const treasuryResult = await pool.query(
        `SELECT gold_amount FROM guild_treasury WHERE guild_id = $1`,
        [guildId]
      );
      
      if (treasuryResult.rows[0].gold_amount < amount) {
        await pool.query('ROLLBACK');
        throw new Error('Insufficient funds in treasury');
      }
      
      // Deduct from treasury
      await pool.query(
        `UPDATE guild_treasury SET gold_amount = gold_amount - $2 WHERE guild_id = $1`,
        [guildId, amount]
      );
      
      // Add to character
      await pool.query(
        `UPDATE character_attributes SET currency = currency + $2 WHERE character_id = $1`,
        [characterId, amount]
      );
      
      // Log action
      await this.logGuildAction(guildId, characterId, 'treasure_withdraw', {
        amount,
        type: 'gold'
      });
      
      await pool.query('COMMIT');
      
      logger.info(`✅ Withdrew ${amount} gold from guild ${guildId}`);
      return true;
    } catch (error) {
      await pool.query('ROLLBACK').catch(() => {});
      logger.error(`❌ Failed to withdraw gold: ${error.message}`);
      throw error;
    }
  }

  // ==================== GUILD LOGGING ====================

  /**
   * Log guild action
   */
  async logGuildAction(guildId, actorId, actionType, details = {}) {
    try {
      await pool.query(
        `
        INSERT INTO guild_logs (guild_id, actor_id, action_type, action_details)
        VALUES ($1, $2, $3, $4)
        `,
        [guildId, actorId, actionType, JSON.stringify(details)]
      );
      
      return true;
    } catch (error) {
      logger.error(`❌ Failed to log guild action: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guild logs
   */
  async getGuildLogs(guildId, limit = 100) {
    try {
      const result = await pool.query(
        `
        SELECT 
          gl.*,
          c.name as actor_name
        FROM guild_logs gl
        LEFT JOIN characters c ON gl.actor_id = c.id
        WHERE gl.guild_id = $1
        ORDER BY gl.created_at DESC
        LIMIT $2
        `,
        [guildId, limit]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get guild logs: ${error.message}`);
      throw error;
    }
  }

  // ==================== GUILD LEVELING ====================

  /**
   * Level up guild
   */
  async levelUpGuild(guildId) {
    try {
      const result = await pool.query(
        `
        SELECT level, experience FROM guilds WHERE id = $1
        `,
        [guildId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Guild not found');
      }
      
      const { level, experience } = result.rows[0];
      const expRequired = level * 1000 + 500; // Scaling exp requirement
      
      if (experience < expRequired) {
        return false; // Not enough experience
      }
      
      // Level up and reset experience
      await pool.query(
        `
        UPDATE guilds
        SET level = level + 1, experience = 0
        WHERE id = $1
        `,
        [guildId]
      );
      
      // Increase max members by 10
      await pool.query(
        `UPDATE guilds SET max_members = max_members + 10 WHERE id = $1`,
        [guildId]
      );
      
      logger.info(`✅ Guild ${guildId} leveled up to level ${level + 1}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to level up guild: ${error.message}`);
      throw error;
    }
  }
}

export default new GuildService();

