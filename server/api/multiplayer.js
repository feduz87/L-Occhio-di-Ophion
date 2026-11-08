// L'Occhio di Ophion - Multiplayer API Endpoints
// REST API for multiplayer features: instances, groups, guilds, trades, PvP

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MultiplayerService = require('../services/multiplayer');
const GuildService = require('../services/guild');
const TradeService = require('../services/trade');
const logger = require('../utils/logger');

// ==================== SHARED INSTANCES ====================

/**
 * GET /api/multiplayer/instances
 * List active instances in world
 */
router.get('/instances', auth.required, async (req, res) => {
  try {
    const { world_id, type, is_pvp } = req.query;
    
    if (!world_id) {
      return res.status(400).json({ error: 'world_id required' });
    }
    
    const instances = await MultiplayerService.getActiveInstances(parseInt(world_id), {
      instanceType: type,
      isPvp: is_pvp === 'true'
    });
    
    res.json({
      success: true,
      count: instances.length,
      instances
    });
  } catch (error) {
    logger.error(`❌ GET /instances: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/instances/:id
 * Get instance details
 */
router.get('/instances/:id', auth.required, async (req, res) => {
  try {
    const instance = await MultiplayerService.getInstanceDetails(req.params.id);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const participants = await MultiplayerService.getInstanceParticipants(req.params.id);
    
    res.json({
      success: true,
      instance,
      participants,
      participant_count: participants.length
    });
  } catch (error) {
    logger.error(`❌ GET /instances/:id: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/instances/:id/join
 * Join instance
 */
router.post('/instances/:id/join', auth.required, async (req, res) => {
  try {
    const success = await MultiplayerService.joinInstance(
      req.params.id,
      req.user.characterId
    );
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to join instance' });
    }
    
    res.json({ success: true, message: 'Joined instance' });
  } catch (error) {
    logger.error(`❌ POST /instances/:id/join: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/instances/:id/leave
 * Leave instance
 */
router.post('/instances/:id/leave', auth.required, async (req, res) => {
  try {
    await MultiplayerService.leaveInstance(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Left instance' });
  } catch (error) {
    logger.error(`❌ POST /instances/:id/leave: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PLAYER GROUPS ====================

/**
 * POST /api/multiplayer/groups
 * Create party/group
 */
router.post('/groups', auth.required, async (req, res) => {
  try {
    const { group_name, group_type } = req.body;
    
    if (!group_name) {
      return res.status(400).json({ error: 'group_name required' });
    }
    
    const groupId = await MultiplayerService.createGroup(
      req.user.characterId,
      group_name,
      group_type || 'party'
    );
    
    res.status(201).json({
      success: true,
      group_id: groupId,
      message: 'Group created'
    });
  } catch (error) {
    logger.error(`❌ POST /groups: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/groups/:id
 * Get group details
 */
router.get('/groups/:id', auth.required, async (req, res) => {
  try {
    const group = await MultiplayerService.getGroupDetails(req.params.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const members = await MultiplayerService.getGroupMembers(req.params.id);
    
    res.json({
      success: true,
      group,
      members,
      member_count: members.length
    });
  } catch (error) {
    logger.error(`❌ GET /groups/:id: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/groups/:id/join
 * Join group
 */
router.post('/groups/:id/join', auth.required, async (req, res) => {
  try {
    await MultiplayerService.joinGroup(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Joined group' });
  } catch (error) {
    logger.error(`❌ POST /groups/:id/join: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/groups/:id/leave
 * Leave group
 */
router.post('/groups/:id/leave', auth.required, async (req, res) => {
  try {
    await MultiplayerService.leaveGroup(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Left group' });
  } catch (error) {
    logger.error(`❌ POST /groups/:id/leave: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/my-groups
 * Get character's groups
 */
router.get('/my-groups', auth.required, async (req, res) => {
  try {
    const groups = await MultiplayerService.getCharacterGroups(req.user.characterId);
    
    res.json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    logger.error(`❌ GET /my-groups: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PLAYER INTERACTIONS ====================

/**
 * POST /api/multiplayer/friends/:id
 * Add friend
 */
router.post('/friends/:id', auth.required, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    
    await MultiplayerService.addFriend(req.user.characterId, targetId);
    
    res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    logger.error(`❌ POST /friends/:id: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/block/:id
 * Block player
 */
router.post('/block/:id', auth.required, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    
    await MultiplayerService.blockPlayer(req.user.characterId, targetId);
    
    res.json({ success: true, message: 'Player blocked' });
  } catch (error) {
    logger.error(`❌ POST /block/:id: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/friends
 * Get friend list
 */
router.get('/friends', auth.required, async (req, res) => {
  try {
    const friends = await MultiplayerService.getFriends(req.user.characterId);
    
    res.json({
      success: true,
      count: friends.length,
      friends
    });
  } catch (error) {
    logger.error(`❌ GET /friends: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PVP RANKINGS ====================

/**
 * GET /api/multiplayer/pvp/leaderboard
 * Get PvP leaderboard
 */
router.get('/pvp/leaderboard', auth.required, async (req, res) => {
  try {
    const { limit } = req.query;
    
    const leaderboard = await MultiplayerService.getPvPLeaderboard(parseInt(limit) || 100);
    
    res.json({
      success: true,
      count: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    logger.error(`❌ GET /pvp/leaderboard: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/pvp/stats
 * Get character PvP stats
 */
router.get('/pvp/stats', auth.required, async (req, res) => {
  try {
    const stats = await MultiplayerService.getCharacterPvPStats(req.user.characterId);
    
    if (!stats) {
      return res.status(404).json({ error: 'PvP stats not found' });
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`❌ GET /pvp/stats: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GUILDS ====================

/**
 * POST /api/multiplayer/guilds
 * Create guild
 */
router.post('/guilds', auth.required, async (req, res) => {
  try {
    const { guild_name, description } = req.body;
    
    if (!guild_name) {
      return res.status(400).json({ error: 'guild_name required' });
    }
    
    const guildId = await GuildService.createGuild(
      req.user.characterId,
      guild_name,
      description
    );
    
    res.status(201).json({
      success: true,
      guild_id: guildId,
      message: 'Guild created'
    });
  } catch (error) {
    logger.error(`❌ POST /guilds: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/guilds/:id
 * Get guild details
 */
router.get('/guilds/:id', auth.required, async (req, res) => {
  try {
    const guild = await GuildService.getGuildDetails(req.params.id);
    
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const members = await GuildService.getGuildMembers(req.params.id);
    
    res.json({
      success: true,
      guild,
      members,
      member_count: members.length
    });
  } catch (error) {
    logger.error(`❌ GET /guilds/:id: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/guilds/search/:term
 * Search guilds
 */
router.get('/guilds/search/:term', auth.required, async (req, res) => {
  try {
    const guilds = await GuildService.searchGuilds(req.params.term);
    
    res.json({
      success: true,
      count: guilds.length,
      guilds
    });
  } catch (error) {
    logger.error(`❌ GET /guilds/search/:term: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/guilds/:id/join
 * Join guild
 */
router.post('/guilds/:id/join', auth.required, async (req, res) => {
  try {
    await GuildService.joinGuild(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Joined guild' });
  } catch (error) {
    logger.error(`❌ POST /guilds/:id/join: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/guilds/:id/leave
 * Leave guild
 */
router.post('/guilds/:id/leave', auth.required, async (req, res) => {
  try {
    await GuildService.leaveGuild(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Left guild' });
  } catch (error) {
    logger.error(`❌ POST /guilds/:id/leave: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/my-guild
 * Get character's guild
 */
router.get('/my-guild', auth.required, async (req, res) => {
  try {
    const guild = await GuildService.getCharacterGuild(req.user.characterId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Not in a guild' });
    }
    
    res.json({
      success: true,
      guild
    });
  } catch (error) {
    logger.error(`❌ GET /my-guild: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/guilds/:id/treasury
 * Get guild treasury
 */
router.get('/guilds/:id/treasury', auth.required, async (req, res) => {
  try {
    const treasury = await GuildService.getTreasury(req.params.id);
    
    if (!treasury) {
      return res.status(404).json({ error: 'Treasury not found' });
    }
    
    res.json({
      success: true,
      treasury
    });
  } catch (error) {
    logger.error(`❌ GET /guilds/:id/treasury: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/guilds/:id/deposit
 * Deposit gold to guild treasury
 */
router.post('/guilds/:id/deposit', auth.required, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    await GuildService.depositGold(req.params.id, req.user.characterId, amount);
    
    res.json({ success: true, message: 'Gold deposited' });
  } catch (error) {
    logger.error(`❌ POST /guilds/:id/deposit: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/guilds/:id/withdraw
 * Withdraw gold from treasury
 */
router.post('/guilds/:id/withdraw', auth.required, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    await GuildService.withdrawGold(req.params.id, req.user.characterId, amount);
    
    res.json({ success: true, message: 'Gold withdrawn' });
  } catch (error) {
    logger.error(`❌ POST /guilds/:id/withdraw: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/guilds/:id/logs
 * Get guild logs
 */
router.get('/guilds/:id/logs', auth.required, async (req, res) => {
  try {
    const logs = await GuildService.getGuildLogs(req.params.id);
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error(`❌ GET /guilds/:id/logs: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRADING ====================

/**
 * POST /api/multiplayer/trades
 * Initiate trade
 */
router.post('/trades', auth.required, async (req, res) => {
  try {
    const { target_id, items, gold } = req.body;
    
    if (!target_id) {
      return res.status(400).json({ error: 'target_id required' });
    }
    
    const tradeId = await TradeService.initiateTrade(
      req.user.characterId,
      target_id,
      items || [],
      gold || 0
    );
    
    res.status(201).json({
      success: true,
      trade_id: tradeId,
      message: 'Trade initiated'
    });
  } catch (error) {
    logger.error(`❌ POST /trades: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/trades/:id
 * Get trade details
 */
router.get('/trades/:id', auth.required, async (req, res) => {
  try {
    const trade = await TradeService.getTradeDetails(req.params.id, req.user.characterId);
    
    res.json({
      success: true,
      trade
    });
  } catch (error) {
    logger.error(`❌ GET /trades/:id: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/trades/:id/offer
 * Add offer to trade
 */
router.post('/trades/:id/offer', auth.required, async (req, res) => {
  try {
    const { items, gold } = req.body;
    
    await TradeService.addTradeOffer(
      req.params.id,
      req.user.characterId,
      items || [],
      gold || 0
    );
    
    res.json({ success: true, message: 'Offer added' });
  } catch (error) {
    logger.error(`❌ POST /trades/:id/offer: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/trades/:id/accept
 * Accept trade
 */
router.post('/trades/:id/accept', auth.required, async (req, res) => {
  try {
    await TradeService.acceptTrade(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Trade accepted' });
  } catch (error) {
    logger.error(`❌ POST /trades/:id/accept: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/multiplayer/trades/:id/cancel
 * Cancel trade
 */
router.post('/trades/:id/cancel', auth.required, async (req, res) => {
  try {
    await TradeService.cancelTrade(req.params.id, req.user.characterId);
    
    res.json({ success: true, message: 'Trade cancelled' });
  } catch (error) {
    logger.error(`❌ POST /trades/:id/cancel: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/trades/pending
 * Get pending trades
 */
router.get('/trades/pending', auth.required, async (req, res) => {
  try {
    const trades = await TradeService.getPendingTrades(req.user.characterId);
    
    res.json({
      success: true,
      count: trades.length,
      trades
    });
  } catch (error) {
    logger.error(`❌ GET /trades/pending: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/multiplayer/trades/history
 * Get trade history
 */
router.get('/trades/history', auth.required, async (req, res) => {
  try {
    const trades = await TradeService.getTradeHistory(req.user.characterId);
    
    res.json({
      success: true,
      count: trades.length,
      trades
    });
  } catch (error) {
    logger.error(`❌ GET /trades/history: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
