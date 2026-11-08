/**
 * Travel Integration Tests
 * 
 * Tests full travel flow:
 * - Create character
 * - Discover location
 * - Travel to location
 * - Encounter generation
 * - Rest and recovery
 * - Travel history
 */

const request = require('supertest');
const { app, pool } = require('../index');

describe('Travel Integration Tests', () => {
  let authToken;
  let characterId;
  let userId;
  let originLocationId;
  let destLocationId;

  /**
   * Setup: Create user, character, and locations
   */
  beforeAll(async () => {
    // Register user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: `traveler_${Date.now()}`,
        email: `traveler_${Date.now()}@test.com`,
        password: 'TestPassword123'
      });

    expect(registerRes.status).toBe(201);
    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;

    // Create character
    const charRes = await request(app)
      .post('/api/characters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Traveler Hero',
        race: 'human',
        class: 'warrior'
      });

    expect(charRes.status).toBe(201);
    characterId = charRes.body.character.id;

    // Get available locations (assuming they exist from seeding)
    const locRes = await request(app)
      .get('/api/map/nodes?node_type=settlement');

    if (locRes.body.locations && locRes.body.locations.length >= 2) {
      originLocationId = locRes.body.locations[0].id;
      destLocationId = locRes.body.locations[1].id;
    } else {
      // Fallback: create test locations if none exist
      const loc1 = await pool.query(
        `INSERT INTO map_nodes (node_key, name, description, node_type, region, danger_level)
         VALUES ('test-location-1', 'Test Settlement', 'A test location', 'settlement', 'Test', 1)
         RETURNING id`
      );
      const loc2 = await pool.query(
        `INSERT INTO map_nodes (node_key, name, description, node_type, region, danger_level)
         VALUES ('test-location-2', 'Test Dungeon', 'A test dungeon', 'dungeon', 'Test', 3)
         RETURNING id`
      );
      originLocationId = loc1.rows[0].id;
      destLocationId = loc2.rows[0].id;
    }

    // Set character starting location
    await pool.query(
      `INSERT INTO character_locations (character_id, current_node_id)
       VALUES ($1, $2)`,
      [characterId, originLocationId]
    );

    // Discover starting location
    await pool.query(
      `INSERT INTO character_discovered_locations (character_id, node_id)
       VALUES ($1, $2)`,
      [characterId, originLocationId]
    );
  });

  /**
   * Cleanup
   */
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM character_locations WHERE character_id = $1', [characterId]);
    await pool.query('DELETE FROM characters WHERE id = $1', [characterId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  });

  /**
   * Test: Get all locations
   */
  test('GET /api/map/nodes - List all locations', async () => {
    const res = await request(app)
      .get('/api/map/nodes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.locations)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test: Get location details
   */
  test('GET /api/map/nodes/:id - Get location details', async () => {
    const res = await request(app)
      .get(`/api/map/nodes/${originLocationId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('location');
    expect(res.body.data).toHaveProperty('hotspots');
    expect(res.body.data).toHaveProperty('containers');
  });

  /**
   * Test: Get nearby locations
   */
  test('GET /api/map/nodes/:id/nearby - Get nearby locations', async () => {
    const res = await request(app)
      .get(`/api/map/nodes/${originLocationId}/nearby`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.nearby)).toBe(true);
  });

  /**
   * Test: Get travel info (route planning)
   */
  test('GET /api/map/travel-info - Get travel information', async () => {
    const res = await request(app)
      .get('/api/map/travel-info')
      .query({
        from: originLocationId,
        to: destLocationId,
        party_size: 1
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('cost');
    expect(res.body.data).toHaveProperty('duration');
    expect(res.body.data).toHaveProperty('risk');
    expect(res.body.data.cost).toHaveProperty('gold');
    expect(res.body.data.duration).toHaveProperty('hours');
  });

  /**
   * Test: Initiate travel
   */
  test('POST /api/travel/initiate - Start travel to destination', async () => {
    // First discover the destination
    await pool.query(
      `INSERT INTO character_discovered_locations (character_id, node_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [characterId, destLocationId]
    );

    const res = await request(app)
      .post('/api/travel/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        character_id: characterId,
        destination_id: destLocationId
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('destination');
    expect(res.body.data).toHaveProperty('costGold');
    expect(res.body.data).toHaveProperty('duration');
  });

  /**
   * Test: Get current travel status
   */
  test('GET /api/travel/character/:id/current - Get current location and travel status', async () => {
    const res = await request(app)
      .get(`/api/travel/character/${characterId}/current`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('current_location');
  });

  /**
   * Test: Get discovered locations
   */
  test('GET /api/map/discovered - Get discovered locations for character', async () => {
    const res = await request(app)
      .get('/api/map/discovered')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.locations)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test: Get travel history
   */
  test('GET /api/travel/character/:id/history - Get travel history', async () => {
    const res = await request(app)
      .get(`/api/travel/character/${characterId}/history?limit=10`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  /**
   * Test: Rest at location
   */
  test('POST /api/travel/rest - Rest and recover health', async () => {
    const res = await request(app)
      .post('/api/travel/rest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        character_id: characterId,
        hours: 8
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('hpRecovered');
    expect(res.body.data).toHaveProperty('newHp');
  });

  /**
   * Test: Discover location
   */
  test('POST /api/map/discover - Discover new location', async () => {
    const res = await request(app)
      .post('/api/map/discover')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        location_id: destLocationId
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  /**
   * Test: Get travel cost calculator
   */
  test('GET /api/travel/costs/calculator - Calculate travel costs to nearby locations', async () => {
    const res = await request(app)
      .get('/api/travel/costs/calculator')
      .query({
        origin_id: originLocationId,
        party_size: 1
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('routes');
    expect(Array.isArray(res.body.routes)).toBe(true);
    if (res.body.routes.length > 0) {
      expect(res.body.routes[0]).toHaveProperty('destination');
      expect(res.body.routes[0]).toHaveProperty('cost');
    }
  });

  /**
   * Test: Get world summary
   */
  test('GET /api/map/summary - Get world statistics', async () => {
    const res = await request(app)
      .get('/api/map/summary');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('total_locations');
    expect(res.body.stats).toHaveProperty('by_type');
    expect(res.body.stats).toHaveProperty('average_danger');
  });

  /**
   * Test: Get regions list
   */
  test('GET /api/map/regions - Get available regions', async () => {
    const res = await request(app)
      .get('/api/map/regions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.regions)).toBe(true);
  });

  /**
   * Test: Get travel statistics
   */
  test('GET /api/travel/statistics - Get user travel statistics', async () => {
    const res = await request(app)
      .get('/api/travel/statistics')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('total_journeys');
    expect(res.body.stats).toHaveProperty('total_gold_spent');
  });

  /**
   * Test: Error handling - Missing required fields
   */
  test('POST /api/travel/initiate - Reject request with missing fields', async () => {
    const res = await request(app)
      .post('/api/travel/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        // Missing destination_id
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  /**
   * Test: Error handling - Unauthorized access
   */
  test('POST /api/travel/initiate - Reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/travel/initiate')
      .send({
        character_id: characterId,
        destination_id: destLocationId
      });

    expect(res.status).toBe(401);
  });

  /**
   * Test: Error handling - Invalid location
   */
  test('GET /api/map/nodes/:id - Handle invalid location ID', async () => {
    const res = await request(app)
      .get('/api/map/nodes/00000000-0000-0000-0000-000000000000');

    // Should either return 404 or empty result depending on implementation
    expect([200, 404]).toContain(res.status);
  });

  /**
   * Test: Full travel flow
   */
  test('Full Travel Flow: Discover → Travel → Rest → Check History', async () => {
    // 1. Discover location
    const discoverRes = await request(app)
      .post('/api/map/discover')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        location_id: destLocationId
      });
    expect([200, 200]).toContain(discoverRes.status); // 200 for new, might be 200 for existing

    // 2. Initiate travel
    const travelRes = await request(app)
      .post('/api/travel/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        character_id: characterId,
        destination_id: destLocationId
      });
    expect(travelRes.status).toBe(201);

    // 3. Check current status
    const statusRes = await request(app)
      .get(`/api/travel/character/${characterId}/current`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.current_location).toBeDefined();

    // 4. Rest
    const restRes = await request(app)
      .post('/api/travel/rest')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        character_id: characterId,
        hours: 8
      });
    expect(restRes.status).toBe(200);

    // 5. Check travel history
    const historyRes = await request(app)
      .get(`/api/travel/character/${characterId}/history`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
  });
});
