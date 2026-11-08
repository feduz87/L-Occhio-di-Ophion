// L'Occhio di Ophion - Multiplayer Integration Tests
// Tests for multiplayer API endpoints and real-world scenarios

const request = require('supertest');
const assert = require('assert');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('Multiplayer API Integration Tests', () => {
  let token;
  let characterId;
  let groupId;
  let guildId;
  let tradeId;
  let instanceId;

  before(async () => {
    // Login and get token
    const res = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    token = res.body.token;
    characterId = res.body.character_id;
  });

  describe('Shared Instances', () => {
    it('GET /api/multiplayer/instances should list active instances', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/instances?world_id=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.instances));
    });

    it('GET /api/multiplayer/instances/:id should get instance details', async () => {
      // Assume instance 1 exists
      const res = await request(API_BASE)
        .get('/api/multiplayer/instances/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.instance !== undefined);
    });

    it('POST /api/multiplayer/instances/:id/join should join instance', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/instances/1/join')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
    });

    it('GET /api/multiplayer/instances/:id should show participants', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/instances/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.participants.length > 0);
    });

    it('POST /api/multiplayer/instances/:id/leave should leave instance', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/instances/1/leave')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
    });
  });

  describe('Player Groups', () => {
    it('POST /api/multiplayer/groups should create group', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_name: 'Test Party',
          group_type: 'party'
        })
        .expect(201);
      
      assert(res.body.success === true);
      groupId = res.body.group_id;
    });

    it('GET /api/multiplayer/groups/:id should get group details', async () => {
      const res = await request(API_BASE)
        .get(`/api/multiplayer/groups/${groupId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.group.id === groupId);
    });

    it('GET /api/multiplayer/my-groups should list character groups', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/my-groups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.groups));
    });

    it('POST /api/multiplayer/groups/:id/leave should leave group', async () => {
      const res = await request(API_BASE)
        .post(`/api/multiplayer/groups/${groupId}/leave`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
    });
  });

  describe('Player Interactions', () => {
    it('POST /api/multiplayer/friends/:id should send friend request', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/friends/2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
    });

    it('GET /api/multiplayer/friends should get friend list', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/friends')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.friends));
    });

    it('POST /api/multiplayer/block/:id should block player', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/block/3')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
    });
  });

  describe('PvP Rankings', () => {
    it('GET /api/multiplayer/pvp/leaderboard should list top players', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/pvp/leaderboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.leaderboard));
    });

    it('GET /api/multiplayer/pvp/stats should get character stats', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/pvp/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.stats !== undefined);
    });
  });

  describe('Guilds', () => {
    it('POST /api/multiplayer/guilds should create guild', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/guilds')
        .set('Authorization', `Bearer ${token}`)
        .send({
          guild_name: 'Test Guild',
          description: 'A test guild'
        })
        .expect(201);
      
      assert(res.body.success === true);
      guildId = res.body.guild_id;
    });

    it('GET /api/multiplayer/guilds/:id should get guild details', async () => {
      const res = await request(API_BASE)
        .get(`/api/multiplayer/guilds/${guildId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.guild.id === guildId);
    });

    it('GET /api/multiplayer/guilds/search/:term should search guilds', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/guilds/search/Test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.guilds));
    });

    it('GET /api/multiplayer/my-guild should get character guild', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/my-guild')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.guild !== undefined);
    });

    it('GET /api/multiplayer/guilds/:id/treasury should get treasury', async () => {
      const res = await request(API_BASE)
        .get(`/api/multiplayer/guilds/${guildId}/treasury`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.treasury !== undefined);
    });

    it('POST /api/multiplayer/guilds/:id/deposit should deposit gold', async () => {
      const res = await request(API_BASE)
        .post(`/api/multiplayer/guilds/${guildId}/deposit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 })
        .expect(200);
      
      assert(res.body.success === true);
    });

    it('POST /api/multiplayer/guilds/:id/withdraw should withdraw gold', async () => {
      const res = await request(API_BASE)
        .post(`/api/multiplayer/guilds/${guildId}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 })
        .expect(200);
      
      assert(res.body.success === true);
    });

    it('GET /api/multiplayer/guilds/:id/logs should get guild logs', async () => {
      const res = await request(API_BASE)
        .get(`/api/multiplayer/guilds/${guildId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.logs));
    });
  });

  describe('Trading', () => {
    it('POST /api/multiplayer/trades should initiate trade', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/trades')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_id: 2,
          items: [],
          gold: 100
        })
        .expect(201);
      
      assert(res.body.success === true);
      tradeId = res.body.trade_id;
    });

    it('GET /api/multiplayer/trades/:id should get trade details', async () => {
      const res = await request(API_BASE)
        .get(`/api/multiplayer/trades/${tradeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(res.body.trade !== undefined);
    });

    it('GET /api/multiplayer/trades/pending should list pending trades', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/trades/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.trades));
    });

    it('GET /api/multiplayer/trades/history should get trade history', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/trades/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
      assert(Array.isArray(res.body.trades));
    });

    it('POST /api/multiplayer/trades/:id/cancel should cancel trade', async () => {
      const res = await request(API_BASE)
        .post(`/api/multiplayer/trades/${tradeId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      assert(res.body.success === true);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/guilds')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      
      assert(res.body.error !== undefined);
    });

    it('should return 401 for missing auth', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/instances?world_id=1')
        .expect(401);
      
      assert(res.body.error !== undefined);
    });

    it('should return 404 for nonexistent resource', async () => {
      const res = await request(API_BASE)
        .get('/api/multiplayer/guilds/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      assert(res.body.error !== undefined);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent guild operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(API_BASE)
            .get('/api/multiplayer/pvp/leaderboard')
            .set('Authorization', `Bearer ${token}`)
        );
      }
      
      const results = await Promise.all(promises);
      assert(results.every(r => r.status === 200));
    });

    it('should handle concurrent group operations', async () => {
      const createPromises = [];
      
      for (let i = 0; i < 3; i++) {
        createPromises.push(
          request(API_BASE)
            .post('/api/multiplayer/groups')
            .set('Authorization', `Bearer ${token}`)
            .send({
              group_name: `Concurrent Group ${i}`,
              group_type: 'party'
            })
        );
      }
      
      const results = await Promise.all(createPromises);
      assert(results.every(r => r.status === 201));
    });
  });

  describe('Data Validation', () => {
    it('should validate gold amount', async () => {
      const res = await request(API_BASE)
        .post(`/api/multiplayer/guilds/${guildId}/deposit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -100 })
        .expect(400);
      
      assert(res.body.error !== undefined);
    });

    it('should validate group name', async () => {
      const res = await request(API_BASE)
        .post('/api/multiplayer/groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          group_name: '',
          group_type: 'party'
        })
        .expect(400);
      
      assert(res.body.error !== undefined);
    });
  });
});

module.exports = {};
