// L'Occhio di Ophion - Multiplayer Service
// Manages shared instances, player groups, guilds, trades, PvP rankings

import pool from '../db/pool.js';
import logger from '../utils/logger.js';

class MultiplayerService {
  // ==================== SHARED INSTANCES ====================

  /**
   * Create a new shared instance
   */
  async createInstance(worldId, instanceType, instanceName, options = {}) {
    try {
      const maxPlayers = options.maxPlayers || 100;
      const isPvp = options.isPvp || false;
      
      const result = await pool.query(
        `SELECT create_instance($1, $2, $3, $4, $5) AS instance_id`,
        [worldId, instanceType, instanceName, maxPlayers, isPvp]
      );
      
      const instanceId = result.rows[0].instance_id;
      logger.info(`✅ Instance created: ${instanceName} (ID: ${instanceId})`);
      
      return instanceId;
    } catch (error) {
      logger.error(`❌ Failed to create instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Join player to instance
   */
  async joinInstance(instanceId, characterId, isLeader = false) {
    try {
      const result = await pool.query(
        `SELECT join_instance($1, $2, $3) AS success`,
        [instanceId, characterId, isLeader]
      );
      
      if (result.rows[0].success) {
        logger.info(`✅ Character ${characterId} joined instance ${instanceId}`);
        return true;
      }
      
      logger.warn(`⚠️ Failed to join instance (full or doesn't exist)`);
      return false;
    } catch (error) {
      logger.error(`❌ Failed to join instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave instance
   */
  async leaveInstance(instanceId, characterId) {
    try {
      await pool.query(
        `SELECT leave_instance($1, $2)`,
        [instanceId, characterId]
      );
      
      logger.info(`✅ Character ${characterId} left instance ${instanceId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to leave instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active instances
   */
  async getActiveInstances(worldId, filters = {}) {
    try {
      let query = `
        SELECT * FROM active_instances
        WHERE world_id = $1
      `;
      const params = [worldId];
      let paramIndex = 2;
      
      if (filters.instanceType) {
        query += ` AND instance_type = $${paramIndex}`;
        params.push(filters.instanceType);
        paramIndex++;
      }
      
      if (filters.isPvp !== undefined) {
        query += ` AND is_pvp = $${paramIndex}`;
        params.push(filters.isPvp);
        paramIndex++;
      }
      
      query += ` ORDER BY actual_players DESC LIMIT 50`;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get active instances: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get instance details
   */
  async getInstanceDetails(instanceId) {
    try {
      const result = await pool.query(
        `SELECT * FROM shared_instances WHERE id = $1`,
        [instanceId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get instance details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get instance participants
   */
  async getInstanceParticipants(instanceId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          ip.character_id,
          c.name,
          c.class,
          c.level,
          ip.is_leader,
          ip.joined_at
        FROM instance_participants ip
        JOIN characters c ON ip.character_id = c.id
        WHERE ip.instance_id = $1 AND ip.is_active = TRUE
        ORDER BY ip.is_leader DESC, ip.joined_at ASC
        `,
        [instanceId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get instance participants: ${error.message}`);
      throw error;
    }
  }

  // ==================== PLAYER GROUPS (PARTIES) ====================

  /**
   * Create player group/party
   */
  async createGroup(leaderId, groupName, groupType = 'party', options = {}) {
    try {
      const maxMembers = options.maxMembers || 6;
      const settings = {
        loot_distribution: options.lootDistribution || 'roll',
        auto_invite: options.autoInvite || false,
        level_requirement: options.levelRequirement || 1,
        difficulty: options.difficulty || 'normal'
      };
      
      const result = await pool.query(
        `
        INSERT INTO player_groups (leader_id, group_name, group_type, max_members, group_settings)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        `,
        [leaderId, groupName, groupType, maxMembers, JSON.stringify(settings)]
      );
      
      const groupId = result.rows[0].id;
      
      // Add leader as member
      await pool.query(
        `INSERT INTO player_group_members (group_id, character_id, role)
         VALUES ($1, $2, $3)`,
        [groupId, leaderId, 'leader']
      );
      
      logger.info(`✅ Group created: ${groupName} (ID: ${groupId})`);
      return groupId;
    } catch (error) {
      logger.error(`❌ Failed to create group: ${error.message}`);
      throw error;
    }
  }

  /**
   * Join group
   */
  async joinGroup(groupId, characterId) {
    try {
      // Check capacity
      const groupResult = await pool.query(
        `
        SELECT pg.max_members, COUNT(pgm.id) as current_members
        FROM player_groups pg
        LEFT JOIN player_group_members pgm ON pg.id = pgm.group_id
        WHERE pg.id = $1
        GROUP BY pg.id, pg.max_members
        `,
        [groupId]
      );
      
      if (groupResult.rows.length === 0) {
        throw new Error('Group not found');
      }
      
      const { max_members, current_members } = groupResult.rows[0];
      
      if (current_members >= max_members) {
        throw new Error('Group is full');
      }
      
      await pool.query(
        `INSERT INTO player_group_members (group_id, character_id, role)
         VALUES ($1, $2, $3)`,
        [groupId, characterId, 'member']
      );
      
      logger.info(`✅ Character ${characterId} joined group ${groupId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to join group: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave group
   */
  async leaveGroup(groupId, characterId) {
    try {
      // Check if leader
      const leaderResult = await pool.query(
        `SELECT leader_id FROM player_groups WHERE id = $1`,
        [groupId]
      );
      
      if (leaderResult.rows[0].leader_id === characterId) {
        // Disband group if no other members
        const memberCount = await pool.query(
          `SELECT COUNT(*) as count FROM player_group_members WHERE group_id = $1`,
          [groupId]
        );
        
        if (memberCount.rows[0].count <= 1) {
          await pool.query(`DELETE FROM player_groups WHERE id = $1`, [groupId]);
          logger.info(`✅ Group ${groupId} disbanded`);
          return true;
        }
      }
      
      await pool.query(
        `DELETE FROM player_group_members WHERE group_id = $1 AND character_id = $2`,
        [groupId, characterId]
      );
      
      logger.info(`✅ Character ${characterId} left group ${groupId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to leave group: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get group details
   */
  async getGroupDetails(groupId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          pg.*,
          c.name as leader_name,
          COUNT(pgm.id) as current_member_count
        FROM player_groups pg
        JOIN characters c ON pg.leader_id = c.id
        LEFT JOIN player_group_members pgm ON pg.id = pgm.group_id
        WHERE pg.id = $1
        GROUP BY pg.id, pg.leader_id, pg.group_name, pg.group_type, pg.max_members, pg.group_settings, pg.current_instance_id, pg.created_at, pg.updated_at, c.name
        `,
        [groupId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get group details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          pgm.character_id,
          c.name,
          c.class,
          c.level,
          pgm.role,
          pgm.joined_at,
          pgm.last_active
        FROM player_group_members pgm
        JOIN characters c ON pgm.character_id = c.id
        WHERE pgm.group_id = $1
        ORDER BY pgm.role DESC, pgm.joined_at ASC
        `,
        [groupId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get group members: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get character's groups
   */
  async getCharacterGroups(characterId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          pg.id,
          pg.group_name,
          pg.group_type,
          pg.leader_id,
          c.name as leader_name,
          pgm.role,
          COUNT(*) OVER (PARTITION BY pg.id) as member_count,
          pg.max_members,
          pg.created_at
        FROM player_group_members pgm
        JOIN player_groups pg ON pgm.group_id = pg.id
        JOIN characters c ON pg.leader_id = c.id
        WHERE pgm.character_id = $1
        ORDER BY pgm.role DESC, pg.created_at DESC
        `,
        [characterId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get character groups: ${error.message}`);
      throw error;
    }
  }

  // ==================== PLAYER INTERACTIONS ====================

  /**
   * Send friend request
   */
  async addFriend(initiatorId, targetId) {
    try {
      // Check if already friends
      const existing = await pool.query(
        `
        SELECT id FROM player_interactions
        WHERE interaction_type = 'friend' 
        AND ((initiator_id = $1 AND target_id = $2) OR (initiator_id = $2 AND target_id = $1))
        AND is_active = TRUE
        `,
        [initiatorId, targetId]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Already friends with this player');
      }
      
      await pool.query(
        `
        INSERT INTO player_interactions (initiator_id, target_id, interaction_type)
        VALUES ($1, $2, 'friend')
        `,
        [initiatorId, targetId]
      );
      
      logger.info(`✅ Friend request sent from ${initiatorId} to ${targetId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to add friend: ${error.message}`);
      throw error;
    }
  }

  /**
   * Block player
   */
  async blockPlayer(initiatorId, targetId) {
    try {
      await pool.query(
        `
        INSERT INTO player_interactions (initiator_id, target_id, interaction_type)
        VALUES ($1, $2, 'block')
        ON CONFLICT (initiator_id, target_id, interaction_type) DO UPDATE SET is_active = TRUE
        `,
        [initiatorId, targetId]
      );
      
      logger.info(`✅ Player ${targetId} blocked by ${initiatorId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to block player: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get friend list
   */
  async getFriends(characterId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          CASE 
            WHEN initiator_id = $1 THEN target_id
            ELSE initiator_id
          END as friend_id,
          c.name,
          c.class,
          c.level,
          c.is_online
        FROM player_interactions
        JOIN characters c ON (
          CASE WHEN initiator_id = $1 THEN target_id ELSE initiator_id END
        ) = c.id
        WHERE interaction_type = 'friend'
        AND is_active = TRUE
        AND ((initiator_id = $1 AND target_id IN (SELECT id FROM characters))
             OR (target_id = $1 AND initiator_id IN (SELECT id FROM characters)))
        ORDER BY c.name
        `,
        [characterId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get friends: ${error.message}`);
      throw error;
    }
  }

  // ==================== PVP RANKINGS ====================

  /**
   * Initialize PvP ranking for character
   */
  async initializePvPRanking(characterId) {
    try {
      await pool.query(
        `
        INSERT INTO pvp_rankings (character_id, mmr, arena_rank)
        VALUES ($1, 1000, 9999)
        ON CONFLICT (character_id) DO NOTHING
        `,
        [characterId]
      );
      
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize PvP ranking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update PvP ranking after match
   */
  async updatePvPRanking(winnerId, loserId, options = {}) {
    try {
      const mmrGain = options.mmrGain || 25;
      const mmrLoss = options.mmrLoss || 20;
      
      // Update winner
      await pool.query(
        `
        UPDATE pvp_rankings
        SET 
          mmr = mmr + $2,
          total_wins = total_wins + 1,
          total_matches = total_matches + 1,
          current_streak = current_streak + 1,
          best_streak = GREATEST(best_streak, current_streak + 1),
          last_match_at = CURRENT_TIMESTAMP
        WHERE character_id = $1
        `,
        [winnerId, mmrGain]
      );
      
      // Update loser
      await pool.query(
        `
        UPDATE pvp_rankings
        SET 
          mmr = GREATEST(0, mmr - $2),
          total_losses = total_losses + 1,
          total_matches = total_matches + 1,
          current_streak = 0,
          last_match_at = CURRENT_TIMESTAMP
        WHERE character_id = $1
        `,
        [loserId, mmrLoss]
      );
      
      logger.info(`✅ PvP ranking updated: ${winnerId} won, ${loserId} lost`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to update PvP ranking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get PvP leaderboard
   */
  async getPvPLeaderboard(limit = 100) {
    try {
      const result = await pool.query(
        `SELECT * FROM pvp_leaderboard LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get PvP leaderboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get character PvP stats
   */
  async getCharacterPvPStats(characterId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          *,
          ROUND(100.0 * total_wins / NULLIF(total_matches, 0), 2) AS win_rate
        FROM pvp_rankings
        WHERE character_id = $1
        `,
        [characterId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get character PvP stats: ${error.message}`);
      throw error;
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Clean up expired instances
   */
  async cleanupExpiredInstances() {
    try {
      const result = await pool.query(
        `
        DELETE FROM shared_instances
        WHERE expires_at < CURRENT_TIMESTAMP AND is_locked = FALSE
        RETURNING id
        `
      );
      
      logger.info(`✅ Cleaned up ${result.rowCount} expired instances`);
      return result.rowCount;
    } catch (error) {
      logger.error(`❌ Failed to cleanup expired instances: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update instance participant activity
   */
  async updateParticipantActivity(instanceId, characterId) {
    try {
      await pool.query(
        `
        UPDATE instance_participants
        SET last_active = CURRENT_TIMESTAMP
        WHERE instance_id = $1 AND character_id = $2
        `,
        [instanceId, characterId]
      );
      
      return true;
    } catch (error) {
      logger.error(`❌ Failed to update participant activity: ${error.message}`);
      throw error;
    }
  }
}

export default new MultiplayerService();

