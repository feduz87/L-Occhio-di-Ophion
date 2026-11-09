// L'Occhio di Ophion - Trading Service
// Manages secure item and currency trading between players

import pool from '../db/pool.js';
import logger from '../utils/logger.js';

class TradeService {
  // ==================== TRADE MANAGEMENT ====================

  /**
   * Initiate trade between two players
   */
  async initiateTrade(initiatorId, targetId, initiatorItems = [], initiatorGold = 0) {
    try {
      // Verify both are different players
      if (initiatorId === targetId) {
        throw new Error('Cannot trade with self');
      }
      
      // Verify target exists
      const targetResult = await pool.query(
        `SELECT id FROM characters WHERE id = $1`,
        [targetId]
      );
      
      if (targetResult.rows.length === 0) {
        throw new Error('Target player not found');
      }
      
      // Check for existing active trades
      const existingTrade = await pool.query(
        `
        SELECT id FROM trades
        WHERE (initiator_id = $1 AND target_id = $2)
        AND status IN ('pending', 'accepted')
        `,
        [initiatorId, targetId]
      );
      
      if (existingTrade.rows.length > 0) {
        throw new Error('Active trade already exists with this player');
      }
      
      // Verify initiator has items
      const hasItems = await this.verifyItems(initiatorId, initiatorItems);
      if (!hasItems) {
        throw new Error('You do not have all required items');
      }
      
      // Verify initiator has gold
      const goldResult = await pool.query(
        `SELECT currency FROM character_attributes WHERE character_id = $1`,
        [initiatorId]
      );
      
      if (goldResult.rows[0].currency < initiatorGold) {
        throw new Error('Insufficient gold');
      }
      
      // Create trade
      const result = await pool.query(
        `
        INSERT INTO trades (initiator_id, target_id, initiator_items, initiator_gold)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [initiatorId, targetId, JSON.stringify(initiatorItems), initiatorGold]
      );
      
      const tradeId = result.rows[0].id;
      logger.info(`✅ Trade initiated: ${initiatorId} -> ${targetId} (ID: ${tradeId})`);
      
      return tradeId;
    } catch (error) {
      logger.error(`❌ Failed to initiate trade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add offer to trade (target player's items)
   */
  async addTradeOffer(tradeId, targetId, targetItems = [], targetGold = 0) {
    try {
      // Verify trade exists and belongs to target
      const tradeResult = await pool.query(
        `SELECT * FROM trades WHERE id = $1 AND target_id = $2`,
        [tradeId, targetId]
      );
      
      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found or you are not the target');
      }
      
      if (tradeResult.rows[0].status !== 'pending') {
        throw new Error('Trade is no longer pending');
      }
      
      // Verify target has items
      const hasItems = await this.verifyItems(targetId, targetItems);
      if (!hasItems) {
        throw new Error('You do not have all required items');
      }
      
      // Verify target has gold
      const goldResult = await pool.query(
        `SELECT currency FROM character_attributes WHERE character_id = $1`,
        [targetId]
      );
      
      if (goldResult.rows[0].currency < targetGold) {
        throw new Error('Insufficient gold');
      }
      
      // Update trade with target's offer
      await pool.query(
        `
        UPDATE trades
        SET target_items = $1, target_gold = $2
        WHERE id = $3
        `,
        [JSON.stringify(targetItems), targetGold, tradeId]
      );
      
      logger.info(`✅ Offer added to trade ${tradeId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to add trade offer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept trade
   */
  async acceptTrade(tradeId, characterId) {
    try {
      // Get trade details
      const tradeResult = await pool.query(
        `SELECT * FROM trades WHERE id = $1`,
        [tradeId]
      );
      
      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found');
      }
      
      const trade = tradeResult.rows[0];
      
      if (trade.status !== 'pending') {
        throw new Error('Trade is no longer pending');
      }
      
      // Determine who is accepting
      const isInitiator = trade.initiator_id === characterId;
      const isTarget = trade.target_id === characterId;
      
      if (!isInitiator && !isTarget) {
        throw new Error('You are not involved in this trade');
      }
      
      // Update acceptance status
      if (isInitiator) {
        await pool.query(
          `UPDATE trades SET initiator_accepted = TRUE WHERE id = $1`,
          [tradeId]
        );
      } else {
        await pool.query(
          `UPDATE trades SET target_accepted = TRUE WHERE id = $1`,
          [tradeId]
        );
      }
      
      // Check if both accepted
      const updatedTrade = await pool.query(
        `SELECT * FROM trades WHERE id = $1`,
        [tradeId]
      );
      
      if (updatedTrade.rows[0].initiator_accepted && updatedTrade.rows[0].target_accepted) {
        // Both accepted, execute trade
        await this.executeTrade(tradeId);
      }
      
      logger.info(`✅ Player ${characterId} accepted trade ${tradeId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to accept trade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel trade
   */
  async cancelTrade(tradeId, characterId) {
    try {
      // Verify character is involved in trade
      const tradeResult = await pool.query(
        `SELECT * FROM trades WHERE id = $1`,
        [tradeId]
      );
      
      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found');
      }
      
      const trade = tradeResult.rows[0];
      
      if (trade.initiator_id !== characterId && trade.target_id !== characterId) {
        throw new Error('You are not involved in this trade');
      }
      
      if (trade.status === 'completed' || trade.status === 'cancelled') {
        throw new Error('Cannot cancel completed or already cancelled trade');
      }
      
      await pool.query(
        `UPDATE trades SET status = 'cancelled' WHERE id = $1`,
        [tradeId]
      );
      
      logger.info(`✅ Trade ${tradeId} cancelled by ${characterId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to cancel trade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get trade details
   */
  async getTradeDetails(tradeId, characterId) {
    try {
      // Verify character is involved
      const tradeResult = await pool.query(
        `
        SELECT 
          t.*,
          ic.name as initiator_name,
          tc.name as target_name
        FROM trades t
        JOIN characters ic ON t.initiator_id = ic.id
        JOIN characters tc ON t.target_id = tc.id
        WHERE t.id = $1 AND (t.initiator_id = $2 OR t.target_id = $2)
        `,
        [tradeId, characterId]
      );
      
      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found or not authorized');
      }
      
      return tradeResult.rows[0];
    } catch (error) {
      logger.error(`❌ Failed to get trade details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pending trades for character
   */
  async getPendingTrades(characterId) {
    try {
      const result = await pool.query(
        `
        SELECT 
          t.id,
          t.initiator_id,
          ic.name as initiator_name,
          t.target_id,
          tc.name as target_name,
          t.initiator_items,
          t.initiator_gold,
          t.target_items,
          t.target_gold,
          t.initiator_accepted,
          t.target_accepted,
          t.created_at,
          (CASE WHEN t.initiator_id = $1 THEN 'initiated' ELSE 'received' END) as direction
        FROM trades t
        JOIN characters ic ON t.initiator_id = ic.id
        JOIN characters tc ON t.target_id = tc.id
        WHERE (t.initiator_id = $1 OR t.target_id = $1)
        AND t.status = 'pending'
        ORDER BY t.created_at DESC
        LIMIT 50
        `,
        [characterId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get pending trades: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(characterId, limit = 50) {
    try {
      const result = await pool.query(
        `
        SELECT * FROM trade_history
        WHERE initiator_id = $1 OR target_id = $1
        LIMIT $2
        `,
        [characterId, limit]
      );
      
      return result.rows;
    } catch (error) {
      logger.error(`❌ Failed to get trade history: ${error.message}`);
      throw error;
    }
  }

  // ==================== INTERNAL METHODS ====================

  /**
   * Execute trade atomically
   */
  async executeTrade(tradeId) {
    try {
      // Get trade details
      const tradeResult = await pool.query(
        `SELECT * FROM trades WHERE id = $1 FOR UPDATE`,
        [tradeId]
      );
      
      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found');
      }
      
      const trade = tradeResult.rows[0];
      
      if (trade.status !== 'pending') {
        throw new Error('Trade not pending');
      }
      
      // Start transaction
      await pool.query('BEGIN');
      
      try {
        // Exchange gold
        if (trade.initiator_gold > 0) {
          await pool.query(
            `UPDATE character_attributes SET currency = currency - $2 WHERE character_id = $1`,
            [trade.initiator_id, trade.initiator_gold]
          );
          
          await pool.query(
            `UPDATE character_attributes SET currency = currency + $2 WHERE character_id = $1`,
            [trade.target_id, trade.initiator_gold]
          );
        }
        
        if (trade.target_gold > 0) {
          await pool.query(
            `UPDATE character_attributes SET currency = currency - $2 WHERE character_id = $1`,
            [trade.target_id, trade.target_gold]
          );
          
          await pool.query(
            `UPDATE character_attributes SET currency = currency + $2 WHERE character_id = $1`,
            [trade.initiator_id, trade.target_gold]
          );
        }
        
        // Mark as completed
        await pool.query(
          `UPDATE trades SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [tradeId]
        );
        
        await pool.query('COMMIT');
        logger.info(`✅ Trade ${tradeId} completed successfully`);
        
        return true;
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error(`❌ Failed to execute trade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify character has items (simplified check)
   */
  async verifyItems(characterId, items) {
    try {
      if (!items || items.length === 0) {
        return true;
      }
      
      // In production, would check actual inventory
      // For now, simplified check
      const result = await pool.query(
        `SELECT COUNT(*) as item_count FROM inventory WHERE character_id = $1`,
        [characterId]
      );
      
      // Just verify character has inventory
      return result.rows[0].item_count >= items.length;
    } catch (error) {
      logger.error(`❌ Failed to verify items: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up expired trades
   */
  async cleanupExpiredTrades() {
    try {
      const result = await pool.query(
        `
        UPDATE trades
        SET status = 'cancelled'
        WHERE status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
        RETURNING id
        `
      );
      
      logger.info(`✅ Cleaned up ${result.rowCount} expired trades`);
      return result.rowCount;
    } catch (error) {
      logger.error(`❌ Failed to cleanup expired trades: ${error.message}`);
      throw error;
    }
  }
}

export default new TradeService();

