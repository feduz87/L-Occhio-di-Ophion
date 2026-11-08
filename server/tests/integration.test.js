/**
 * Integration Tests - Full API Flow
 * Tests: Register → Login → Create Character → Get Character
 * Framework: Vitest
 * 
 * Run: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pkg from 'pg';
import axios from 'axios';
import { app, pool, logger } from '../index.js';

const { Pool } = pkg;

// Test configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

const TEST_CHARACTER = {
  name: 'TestHero',
  race: 'Uomini',
  heritage: 'Sangue Antico',
  class: 'Guerriero',
};

let testServer = null;
let testToken = null;
let testCharacterId = null;
let testUserId = null;

/**
 * Setup: Start server for integration testing
 */
beforeAll(async () => {
  // Start test server
  testServer = app.listen(3001, 'localhost');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Cleanup test database tables
  try {
    await pool.query('DELETE FROM inventory_slots WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM character_status WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM character_resources WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM character_stats WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1)', [`testuser_%`]);
    await pool.query('DELETE FROM users WHERE username LIKE $1', [`testuser_%`]);
  } catch (err) {
    logger.warn('Cleanup warning:', err.message);
  }
}, 30000);

/**
 * Cleanup: Stop server and clean test data
 */
afterAll(async () => {
  if (testServer) testServer.close();
  
  try {
    // Cleanup
    await pool.query('DELETE FROM inventory_slots WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM character_status WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM character_resources WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM character_stats WHERE character_id IN (SELECT character_id FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1))', [`testuser_%`]);
    await pool.query('DELETE FROM characters WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE $1)', [`testuser_%`]);
    await pool.query('DELETE FROM users WHERE username LIKE $1', [`testuser_%`]);
  } catch (err) {
    logger.warn('Cleanup warning:', err.message);
  }
  
  await pool.end();
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Authentication Flow', () => {
  
  it('should register a new user (201)', async () => {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      username: TEST_USER.username,
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('user');
    expect(response.data.user).toHaveProperty('user_id');
    expect(response.data.user).toHaveProperty('username', TEST_USER.username);
    expect(response.data.user).toHaveProperty('email', TEST_USER.email);
    
    testUserId = response.data.user.user_id;
  });

  it('should reject duplicate username (409)', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        username: TEST_USER.username,
        email: `other_${Date.now()}@example.com`,
        password: TEST_USER.password,
      });
      expect.fail('Should have thrown 409 error');
    } catch (error) {
      expect(error.response.status).toBe(409);
      expect(error.response.data.error).toBe('Conflict');
    }
  });

  it('should reject missing required fields (400)', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        username: 'testuser',
        // Missing email and password
      });
      expect.fail('Should have thrown 400 error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('Validation error');
    }
  });

  it('should login and return JWT token (200)', async () => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token');
    expect(response.data).toHaveProperty('user');
    expect(response.data.user).toHaveProperty('username', TEST_USER.username);
    
    testToken = response.data.token;
  });

  it('should reject invalid password (401)', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: TEST_USER.username,
        password: 'WrongPassword123!',
      });
      expect.fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.error).toBe('Unauthorized');
    }
  });

  it('should reject non-existent user (401)', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: 'nonexistent_user',
        password: 'SomePassword123!',
      });
      expect.fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
      expect(error.response.data.error).toBe('Unauthorized');
    }
  });

  it('should get current user with valid token (200)', async () => {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('user');
    expect(response.data.user).toHaveProperty('username', TEST_USER.username);
  });

  it('should reject request without token (401)', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      expect.fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it('should reject invalid token (401)', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid.token.here',
        },
      });
      expect.fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

});

// ============================================================================
// CHARACTER CREATION TESTS
// ============================================================================

describe('Character Creation Flow', () => {
  
  it('should create a character (201)', async () => {
    const response = await axios.post(`${BASE_URL}/characters`, TEST_CHARACTER, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('character');
    expect(response.data.character).toHaveProperty('character_id');
    expect(response.data.character).toHaveProperty('name', TEST_CHARACTER.name);
    expect(response.data.character).toHaveProperty('race', TEST_CHARACTER.race);
    expect(response.data.character).toHaveProperty('class', TEST_CHARACTER.class);
    expect(response.data.character).toHaveProperty('level', 1);
    expect(response.data.character).toHaveProperty('hit_points');
    expect(response.data.character).toHaveProperty('armor_class');
    expect(response.data.character).toHaveProperty('stats');
    expect(response.data.character).toHaveProperty('modifiers');
    expect(response.data.character).toHaveProperty('resources');
    
    // Verify stats are in valid range
    expect(response.data.character.stats).toHaveProperty('strength');
    expect(response.data.character.stats.strength).toBeGreaterThanOrEqual(3);
    expect(response.data.character.stats.strength).toBeLessThanOrEqual(18);
    
    testCharacterId = response.data.character.character_id;
  });

  it('should reject duplicate character name (409)', async () => {
    try {
      await axios.post(`${BASE_URL}/characters`, TEST_CHARACTER, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 409 error');
    } catch (error) {
      expect(error.response.status).toBe(409);
      expect(error.response.data.error).toBe('Conflict');
    }
  });

  it('should reject invalid race (422)', async () => {
    try {
      await axios.post(`${BASE_URL}/characters`, {
        ...TEST_CHARACTER,
        name: 'InvalidRace',
        race: 'InvalidRace',
      }, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 422 error');
    } catch (error) {
      expect(error.response.status).toBe(422);
    }
  });

  it('should reject invalid class (422)', async () => {
    try {
      await axios.post(`${BASE_URL}/characters`, {
        ...TEST_CHARACTER,
        name: 'InvalidClass',
        class: 'InvalidClass',
      }, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 422 error');
    } catch (error) {
      expect(error.response.status).toBe(422);
    }
  });

  it('should reject missing required fields (400)', async () => {
    try {
      await axios.post(`${BASE_URL}/characters`, {
        name: 'Incomplete',
        // Missing race, heritage, class
      }, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 400 error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toBe('Validation error');
    }
  });

  it('should reject request without authentication (401)', async () => {
    try {
      await axios.post(`${BASE_URL}/characters`, TEST_CHARACTER);
      expect.fail('Should have thrown 401 error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

});

// ============================================================================
// CHARACTER RETRIEVAL TESTS
// ============================================================================

describe('Character Retrieval Flow', () => {
  
  it('should get character by ID (200)', async () => {
    const response = await axios.get(`${BASE_URL}/characters/${testCharacterId}`, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('character');
    expect(response.data.character).toHaveProperty('character_id', testCharacterId);
    expect(response.data.character).toHaveProperty('name', TEST_CHARACTER.name);
    expect(response.data.character).toHaveProperty('stats');
    expect(response.data.character).toHaveProperty('inventory');
  });

  it('should list user\'s characters (200)', async () => {
    const response = await axios.get(`${BASE_URL}/characters`, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.characters)).toBe(true);
    expect(response.data.characters.length).toBeGreaterThan(0);
    
    const createdChar = response.data.characters.find(c => c.character_id === testCharacterId);
    expect(createdChar).toBeDefined();
    expect(createdChar).toHaveProperty('name', TEST_CHARACTER.name);
  });

  it('should reject accessing other user\'s character (403)', async () => {
    // Create another user
    const otherUser = {
      username: `testuser_other_${Date.now()}`,
      email: `other_${Date.now()}@example.com`,
      password: 'OtherPassword123!',
    };
    
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, otherUser);
    const otherToken = (await axios.post(`${BASE_URL}/auth/login`, {
      username: otherUser.username,
      password: otherUser.password,
    })).data.token;

    try {
      await axios.get(`${BASE_URL}/characters/${testCharacterId}`, {
        headers: {
          Authorization: `Bearer ${otherToken}`,
        },
      });
      expect.fail('Should have thrown 403 error');
    } catch (error) {
      expect(error.response.status).toBe(403);
    }
  });

  it('should return 404 for non-existent character', async () => {
    try {
      await axios.get(`${BASE_URL}/characters/00000000-0000-0000-0000-000000000000`, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 404 error');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

});

// ============================================================================
// CHARACTER UPDATE TESTS
// ============================================================================

describe('Character Update Flow', () => {
  
  it('should update character name (200)', async () => {
    const newName = 'UpdatedName';
    const response = await axios.patch(`${BASE_URL}/characters/${testCharacterId}`, {
      name: newName,
    }, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.character).toHaveProperty('name', newName);
  });

  it('should reject duplicate name on update (409)', async () => {
    // Create second character
    const char2 = await axios.post(`${BASE_URL}/characters`, {
      name: 'SecondCharacter',
      race: 'Elfi',
      heritage: 'Alti',
      class: 'Sapiente',
    }, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    try {
      await axios.patch(`${BASE_URL}/characters/${char2.data.character.character_id}`, {
        name: 'UpdatedName', // Same as testCharacter
      }, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 409 error');
    } catch (error) {
      expect(error.response.status).toBe(409);
    }
  });

  it('should reject empty name (400)', async () => {
    try {
      await axios.patch(`${BASE_URL}/characters/${testCharacterId}`, {
        name: '',
      }, {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      expect.fail('Should have thrown 400 error');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });

});

// ============================================================================
// HEALTH CHECK TESTS
// ============================================================================

describe('Server Health', () => {
  
  it('should return health status (200)', async () => {
    const response = await axios.get(`${BASE_URL}/health`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
    expect(response.data).toHaveProperty('database', 'connected');
  });

  it('should return game config (200)', async () => {
    const response = await axios.get(`${BASE_URL}/game/config`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('game', 'L\'Occhio di Ophion');
    expect(response.data).toHaveProperty('version');
  });

});
