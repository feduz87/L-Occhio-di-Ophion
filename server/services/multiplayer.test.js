// L'Occhio di Ophion - Multiplayer Unit Tests
// Tests for multiplayer service, guilds, trading, and PvP

const assert = require('assert');
const MultiplayerService = require('../server/services/multiplayer');
const GuildService = require('../server/services/guild');
const TradeService = require('../server/services/trade');

describe('Multiplayer Service', () => {
  describe('Shared Instances', () => {
    it('should create shared instance', async () => {
      const instanceId = await MultiplayerService.createInstance(1, 'zone', 'Test Zone', { maxPlayers: 50 });
      assert(instanceId > 0);
    });

    it('should get active instances', async () => {
      const instances = await MultiplayerService.getActiveInstances(1);
      assert(Array.isArray(instances));
    });

    it('should join instance', async () => {
      const instanceId = await MultiplayerService.createInstance(1, 'zone', 'Join Test', { maxPlayers: 10 });
      const result = await MultiplayerService.joinInstance(instanceId, 1);
      assert(result === true);
    });

    it('should leave instance', async () => {
      const instanceId = await MultiplayerService.createInstance(1, 'zone', 'Leave Test', { maxPlayers: 10 });
      await MultiplayerService.joinInstance(instanceId, 1);
      const result = await MultiplayerService.leaveInstance(instanceId, 1);
      assert(result === true);
    });

    it('should get instance participants', async () => {
      const instanceId = await MultiplayerService.createInstance(1, 'zone', 'Participant Test', { maxPlayers: 10 });
      await MultiplayerService.joinInstance(instanceId, 1);
      const participants = await MultiplayerService.getInstanceParticipants(instanceId);
      assert(Array.isArray(participants));
      assert(participants.length > 0);
    });
  });

  describe('Player Groups', () => {
    it('should create group', async () => {
      const groupId = await MultiplayerService.createGroup(1, 'Test Party', 'party');
      assert(groupId > 0);
    });

    it('should join group', async () => {
      const groupId = await MultiplayerService.createGroup(1, 'Join Test', 'party');
      const result = await MultiplayerService.joinGroup(groupId, 2);
      assert(result === true);
    });

    it('should leave group', async () => {
      const groupId = await MultiplayerService.createGroup(1, 'Leave Test', 'party');
      await MultiplayerService.joinGroup(groupId, 2);
      const result = await MultiplayerService.leaveGroup(groupId, 2);
      assert(result === true);
    });

    it('should get group details', async () => {
      const groupId = await MultiplayerService.createGroup(1, 'Details Test', 'party');
      const group = await MultiplayerService.getGroupDetails(groupId);
      assert(group !== null);
      assert(group.group_name === 'Details Test');
    });

    it('should get group members', async () => {
      const groupId = await MultiplayerService.createGroup(1, 'Members Test', 'party');
      await MultiplayerService.joinGroup(groupId, 2);
      const members = await MultiplayerService.getGroupMembers(groupId);
      assert(Array.isArray(members));
      assert(members.length === 2);
    });

    it('should get character groups', async () => {
      const groupId = await MultiplayerService.createGroup(1, 'Char Group Test', 'party');
      const groups = await MultiplayerService.getCharacterGroups(1);
      assert(Array.isArray(groups));
    });
  });

  describe('Player Interactions', () => {
    it('should add friend', async () => {
      const result = await MultiplayerService.addFriend(1, 2);
      assert(result === true);
    });

    it('should block player', async () => {
      const result = await MultiplayerService.blockPlayer(1, 3);
      assert(result === true);
    });

    it('should get friends', async () => {
      await MultiplayerService.addFriend(1, 2);
      const friends = await MultiplayerService.getFriends(1);
      assert(Array.isArray(friends));
    });
  });

  describe('PvP Rankings', () => {
    it('should initialize PvP ranking', async () => {
      const result = await MultiplayerService.initializePvPRanking(1);
      assert(result === true);
    });

    it('should update PvP ranking after match', async () => {
      await MultiplayerService.initializePvPRanking(1);
      await MultiplayerService.initializePvPRanking(2);
      const result = await MultiplayerService.updatePvPRanking(1, 2);
      assert(result === true);
    });

    it('should get PvP leaderboard', async () => {
      const leaderboard = await MultiplayerService.getPvPLeaderboard(10);
      assert(Array.isArray(leaderboard));
    });

    it('should get character PvP stats', async () => {
      await MultiplayerService.initializePvPRanking(1);
      const stats = await MultiplayerService.getCharacterPvPStats(1);
      assert(stats !== null);
      assert(stats.character_id === 1);
    });

    it('should calculate win rate correctly', async () => {
      await MultiplayerService.initializePvPRanking(1);
      await MultiplayerService.updatePvPRanking(1, 2);
      await MultiplayerService.updatePvPRanking(1, 2);
      const stats = await MultiplayerService.getCharacterPvPStats(1);
      assert(stats.total_matches === 2);
      assert(stats.total_wins === 2);
    });
  });

  describe('Utilities', () => {
    it('should cleanup expired instances', async () => {
      const count = await MultiplayerService.cleanupExpiredInstances();
      assert(typeof count === 'number');
    });

    it('should update participant activity', async () => {
      const instanceId = await MultiplayerService.createInstance(1, 'zone', 'Activity Test', { maxPlayers: 10 });
      await MultiplayerService.joinInstance(instanceId, 1);
      const result = await MultiplayerService.updateParticipantActivity(instanceId, 1);
      assert(result === true);
    });
  });
});

describe('Guild Service', () => {
  describe('Guild Management', () => {
    it('should create guild', async () => {
      const guildId = await GuildService.createGuild(1, 'Test Guild', 'A test guild');
      assert(guildId > 0);
    });

    it('should reject duplicate guild names', async () => {
      await GuildService.createGuild(1, 'Unique Guild', 'Description');
      try {
        await GuildService.createGuild(2, 'Unique Guild', 'Description');
        assert.fail('Should reject duplicate guild name');
      } catch (error) {
        assert(error.message.includes('already exists'));
      }
    });

    it('should get guild details', async () => {
      const guildId = await GuildService.createGuild(1, 'Details Guild', 'Test');
      const guild = await GuildService.getGuildDetails(guildId);
      assert(guild !== null);
      assert(guild.guild_name === 'Details Guild');
    });

    it('should search guilds', async () => {
      await GuildService.createGuild(1, 'Searchable Guild', 'Test');
      const results = await GuildService.searchGuilds('Searchable');
      assert(results.length > 0);
    });

    it('should disband guild (founder only)', async () => {
      const guildId = await GuildService.createGuild(1, 'Disband Test', 'Test');
      const result = await GuildService.disbandGuild(guildId, 1);
      assert(result === true);
    });
  });

  describe('Membership', () => {
    it('should join guild', async () => {
      const guildId = await GuildService.createGuild(1, 'Join Guild', 'Test');
      const result = await GuildService.joinGuild(guildId, 2);
      assert(result === true);
    });

    it('should leave guild', async () => {
      const guildId = await GuildService.createGuild(1, 'Leave Guild', 'Test');
      await GuildService.joinGuild(guildId, 2);
      const result = await GuildService.leaveGuild(guildId, 2);
      assert(result === true);
    });

    it('should get guild members', async () => {
      const guildId = await GuildService.createGuild(1, 'Members Guild', 'Test');
      await GuildService.joinGuild(guildId, 2);
      const members = await GuildService.getGuildMembers(guildId);
      assert(Array.isArray(members));
      assert(members.length === 2);
    });

    it('should get character guild', async () => {
      const guildId = await GuildService.createGuild(1, 'Char Guild', 'Test');
      const guild = await GuildService.getCharacterGuild(1);
      assert(guild !== null);
      assert(guild.id === guildId);
    });

    it('should change member rank', async () => {
      const guildId = await GuildService.createGuild(1, 'Rank Guild', 'Test');
      await GuildService.joinGuild(guildId, 2);
      const result = await GuildService.changeMemberRank(guildId, 2, 'officer', 1);
      assert(result === true);
    });

    it('should add contribution points', async () => {
      const guildId = await GuildService.createGuild(1, 'Contrib Guild', 'Test');
      const result = await GuildService.addContributionPoints(guildId, 1, 100);
      assert(result === true);
    });
  });

  describe('Treasury', () => {
    it('should get treasury', async () => {
      const guildId = await GuildService.createGuild(1, 'Treasury Guild', 'Test');
      const treasury = await GuildService.getTreasury(guildId);
      assert(treasury !== null);
      assert(treasury.gold_amount === 0);
    });

    it('should deposit gold', async () => {
      const guildId = await GuildService.createGuild(1, 'Deposit Guild', 'Test');
      const result = await GuildService.depositGold(guildId, 1, 1000);
      assert(result === true);
    });

    it('should withdraw gold (officer)', async () => {
      const guildId = await GuildService.createGuild(1, 'Withdraw Guild', 'Test');
      await GuildService.depositGold(guildId, 1, 5000);
      const result = await GuildService.withdrawGold(guildId, 1, 1000);
      assert(result === true);
    });
  });

  describe('Guild Leveling', () => {
    it('should level up guild', async () => {
      const guildId = await GuildService.createGuild(1, 'Level Guild', 'Test');
      // Add enough experience
      for (let i = 0; i < 20; i++) {
        await GuildService.addContributionPoints(guildId, 1, 100);
      }
      const result = await GuildService.levelUpGuild(guildId);
      assert(result === true);
    });
  });
});

describe('Trade Service', () => {
  describe('Trade Management', () => {
    it('should initiate trade', async () => {
      const tradeId = await TradeService.initiateTrade(1, 2, [], 100);
      assert(tradeId > 0);
    });

    it('should reject self-trade', async () => {
      try {
        await TradeService.initiateTrade(1, 1, [], 100);
        assert.fail('Should reject self-trade');
      } catch (error) {
        assert(error.message.includes('Cannot trade with self'));
      }
    });

    it('should get trade details', async () => {
      const tradeId = await TradeService.initiateTrade(1, 2, [], 100);
      const trade = await TradeService.getTradeDetails(tradeId, 1);
      assert(trade !== null);
      assert(trade.id === tradeId);
    });

    it('should accept trade', async () => {
      const tradeId = await TradeService.initiateTrade(1, 2, [], 100);
      await TradeService.addTradeOffer(tradeId, 2, [], 50);
      const result = await TradeService.acceptTrade(tradeId, 1);
      assert(result === true);
    });

    it('should cancel trade', async () => {
      const tradeId = await TradeService.initiateTrade(1, 2, [], 100);
      const result = await TradeService.cancelTrade(tradeId, 1);
      assert(result === true);
    });

    it('should get pending trades', async () => {
      const tradeId = await TradeService.initiateTrade(1, 2, [], 100);
      const trades = await TradeService.getPendingTrades(1);
      assert(Array.isArray(trades));
      assert(trades.length > 0);
    });

    it('should get trade history', async () => {
      const trades = await TradeService.getTradeHistory(1);
      assert(Array.isArray(trades));
    });
  });

  describe('Trade Atomicity', () => {
    it('should execute trade atomically', async () => {
      const tradeId = await TradeService.initiateTrade(1, 2, [], 100);
      await TradeService.addTradeOffer(tradeId, 2, [], 50);
      await TradeService.acceptTrade(tradeId, 1);
      await TradeService.acceptTrade(tradeId, 2);
      
      const trade = await TradeService.getTradeDetails(tradeId, 1);
      assert(trade.status === 'completed');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired trades', async () => {
      const count = await TradeService.cleanupExpiredTrades();
      assert(typeof count === 'number');
    });
  });
});

module.exports = {
  MultiplayerService,
  GuildService,
  TradeService
};
