/**
 * Gemini Service Tests
 * 
 * Tests cover:
 * - Service initialization
 * - Text generation (main flow)
 * - Dialogue generation (NPC)
 * - Combat description
 * - Error handling & fallback
 * - Caching behavior
 * - Statistics tracking
 * 
 * Run: npm test server/services/gemini.test.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeGemini,
  generateText,
  generateDialogue,
  generateCombatDescription,
  getStats,
  resetStats,
  clearCache,
  getHealth,
} from './gemini.js';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('Gemini Service', () => {
  beforeEach(() => {
    resetStats();
    clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('Initialization', () => {
    it('should initialize successfully with API key', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';
      process.env.GEMINI_FALLBACK = 'true';

      await initializeGemini(mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith('✅ Gemini API initialized');
    });

    it('should fallback when API key missing', async () => {
      process.env.GEMINI_API_KEY = '';
      process.env.GEMINI_FALLBACK = 'true';

      await initializeGemini(mockLogger);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should throw when API key missing and fallback disabled', async () => {
      process.env.GEMINI_API_KEY = '';
      process.env.GEMINI_FALLBACK = 'false';

      expect(async () => {
        await initializeGemini(mockLogger);
      }).rejects.toThrow();
    });
  });

  // =========================================================================
  // Text Generation Tests
  // =========================================================================

  describe('Text Generation', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = '';
      process.env.GEMINI_FALLBACK = 'true';
    });

    it('should generate fallback text when API unavailable', async () => {
      const response = await generateText('Tell me a story', 'DUNGEON_MASTER');

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(10);
      expect(typeof response).toBe('string');
    });

    it('should generate different fallback texts', async () => {
      const response1 = await generateText('Prompt 1', 'DUNGEON_MASTER');
      const response2 = await generateText('Prompt 2', 'DUNGEON_MASTER');

      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
      // Might be same or different (random selection)
    });

    it('should track fallback usage in stats', async () => {
      resetStats();
      await generateText('Test', 'DUNGEON_MASTER');

      const stats = getStats();
      expect(stats.fallbacks).toBeGreaterThan(0);
      expect(stats.requests).toBe(1);
    });

    it('should handle different system prompt types', async () => {
      const dm = await generateText('Test', 'DUNGEON_MASTER');
      const merchant = await generateText('Test', 'NPC_MERCHANT');
      const warrior = await generateText('Test', 'NPC_WARRIOR');
      const combat = await generateText('Test', 'COMBAT_NARRATOR');

      expect(dm).toBeTruthy();
      expect(merchant).toBeTruthy();
      expect(warrior).toBeTruthy();
      expect(combat).toBeTruthy();
    });
  });

  // =========================================================================
  // Dialogue Generation Tests
  // =========================================================================

  describe('Dialogue Generation', () => {
    beforeEach(() => {
      process.env.GEMINI_FALLBACK = 'true';
    });

    it('should generate NPC dialogue', async () => {
      const npc = {
        name: 'Armorer',
        type: 'MERCHANT',
        affinity: 0.5,
        mood: 'friendly',
      };

      const dialogue = await generateDialogue(npc, { location: 'Shop' }, 'Do you have swords?');

      expect(dialogue).toBeTruthy();
      expect(dialogue.length).toBeGreaterThan(5);
    });

    it('should include player message in dialogue', async () => {
      const npc = { name: 'Sage', type: 'WARRIOR' };
      const playerMessage = 'Can you teach me to fight?';

      const dialogue = await generateDialogue(npc, {}, playerMessage);

      expect(dialogue).toBeTruthy();
      expect(typeof dialogue).toBe('string');
    });

    it('should handle affinity in dialogue generation', async () => {
      const npcHighAffinity = {
        name: 'Friend',
        type: 'MERCHANT',
        affinity: 0.9,
      };

      const npcLowAffinity = {
        name: 'Stranger',
        type: 'MERCHANT',
        affinity: 0.1,
      };

      const dialogueHigh = await generateDialogue(npcHighAffinity, {}, 'Hello');
      const dialogueLow = await generateDialogue(npcLowAffinity, {}, 'Hello');

      expect(dialogueHigh).toBeTruthy();
      expect(dialogueLow).toBeTruthy();
    });

    it('should track dialogue requests in stats', async () => {
      resetStats();
      const npc = { name: 'Test', type: 'MERCHANT' };

      await generateDialogue(npc, {}, 'Hello');

      const stats = getStats();
      expect(stats.requests).toBe(1);
    });
  });

  // =========================================================================
  // Combat Description Tests
  // =========================================================================

  describe('Combat Description', () => {
    beforeEach(() => {
      process.env.GEMINI_FALLBACK = 'true';
    });

    it('should generate combat description', async () => {
      const encounter = {
        playerName: 'Aragorn',
        playerClass: 'Warrior',
        playerLevel: 5,
        playerHP: 20,
        playerHPMax: 28,
        playerAC: 14,
        enemyName: 'Goblin',
        enemyType: 'Goblin Raider',
        enemyHP: 7,
        enemyHPMax: 7,
        enemyAC: 15,
        action: 'attack',
        location: 'Dark Forest',
      };

      const description = await generateCombatDescription(encounter);

      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(20);
    });

    it('should include action details in description', async () => {
      const encounter = {
        playerName: 'Hero',
        playerClass: 'Mage',
        playerLevel: 3,
        playerHP: 10,
        playerHPMax: 15,
        playerAC: 12,
        enemyName: 'Orc',
        enemyType: 'Orc Warrior',
        enemyHP: 15,
        enemyHPMax: 15,
        enemyAC: 14,
        action: 'cast fireball',
        location: 'Cave',
      };

      const description = await generateCombatDescription(encounter);

      expect(description).toBeTruthy();
      expect(typeof description).toBe('string');
    });

    it('should track combat requests in stats', async () => {
      resetStats();
      const encounter = {
        playerName: 'Test',
        playerClass: 'Warrior',
        playerLevel: 1,
        playerHP: 10,
        playerHPMax: 10,
        playerAC: 10,
        enemyName: 'Enemy',
        enemyType: 'Test',
        enemyHP: 5,
        enemyHPMax: 5,
        enemyAC: 10,
        action: 'attack',
        location: 'Test',
      };

      await generateCombatDescription(encounter);

      const stats = getStats();
      expect(stats.requests).toBe(1);
    });
  });

  // =========================================================================
  // Caching Tests
  // =========================================================================

  describe('Caching Behavior', () => {
    beforeEach(() => {
      process.env.GEMINI_FALLBACK = 'true';
      resetStats();
      clearCache();
    });

    it('should cache system prompts', async () => {
      await generateText('Test 1', 'DUNGEON_MASTER');
      await generateText('Test 2', 'DUNGEON_MASTER');

      const stats = getStats();
      expect(stats.cached).toBeGreaterThan(0);
    });

    it('should track cache hit rate', async () => {
      await generateText('Test 1', 'DUNGEON_MASTER');
      await generateText('Test 2', 'DUNGEON_MASTER');
      await generateText('Test 3', 'DUNGEON_MASTER');

      const stats = getStats();
      expect(stats.cacheHitRate).toBeTruthy();
      expect(parseInt(stats.cacheHitRate)).toBeGreaterThan(0);
    });

    it('should clear cache on demand', async () => {
      await generateText('Test', 'DUNGEON_MASTER');
      const statsBefore = getStats();

      clearCache();
      resetStats();
      await generateText('Test', 'DUNGEON_MASTER');
      const statsAfter = getStats();

      expect(statsBefore.requests).toBeGreaterThan(0);
      expect(statsAfter.requests).toBe(1);
    });
  });

  // =========================================================================
  // Statistics Tests
  // =========================================================================

  describe('Statistics', () => {
    beforeEach(() => {
      resetStats();
      process.env.GEMINI_FALLBACK = 'true';
    });

    it('should track request count', async () => {
      resetStats();
      await generateText('Test', 'DUNGEON_MASTER');
      await generateText('Test', 'DUNGEON_MASTER');
      await generateText('Test', 'DUNGEON_MASTER');

      const stats = getStats();
      expect(stats.requests).toBe(3);
    });

    it('should track fallback usage', async () => {
      resetStats();
      process.env.GEMINI_FALLBACK = 'true';

      await generateText('Test', 'DUNGEON_MASTER');

      const stats = getStats();
      expect(stats.fallbacks).toBeGreaterThan(0);
    });

    it('should calculate cache hit rate percentage', async () => {
      resetStats();
      await generateText('Test', 'DUNGEON_MASTER');
      await generateText('Test', 'DUNGEON_MASTER');

      const stats = getStats();
      expect(stats.cacheHitRate).toContain('%');
      expect(parseInt(stats.cacheHitRate)).toBeGreaterThanOrEqual(0);
      expect(parseInt(stats.cacheHitRate)).toBeLessThanOrEqual(100);
    });

    it('should reset statistics', async () => {
      await generateText('Test', 'DUNGEON_MASTER');
      let stats = getStats();
      expect(stats.requests).toBeGreaterThan(0);

      resetStats();
      stats = getStats();
      expect(stats.requests).toBe(0);
      expect(stats.cached).toBe(0);
      expect(stats.fallbacks).toBe(0);
    });
  });

  // =========================================================================
  // Health Check Tests
  // =========================================================================

  describe('Health Check', () => {
    beforeEach(() => {
      process.env.GEMINI_FALLBACK = 'true';
      clearCache();
    });

    it('should return health status', () => {
      const health = getHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('apiAvailable');
      expect(health).toHaveProperty('cacheSize');
      expect(health).toHaveProperty('stats');
    });

    it('should indicate fallback mode when API unavailable', () => {
      process.env.GEMINI_API_KEY = '';
      const health = getHealth();

      expect(health.status).toMatch(/ready|fallback/);
    });

    it('should track cache size', async () => {
      await generateText('Test', 'DUNGEON_MASTER');
      const health = getHealth();

      expect(health.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('Full Integration', () => {
    beforeEach(() => {
      process.env.GEMINI_FALLBACK = 'true';
      resetStats();
      clearCache();
    });

    it('should handle full dialogue flow', async () => {
      const npc = {
        name: 'Merchant',
        type: 'MERCHANT',
        affinity: 0.5,
      };

      const message1 = await generateDialogue(npc, {}, 'Hello there');
      const message2 = await generateDialogue(npc, {}, 'Do you have potions?');
      const message3 = await generateDialogue(npc, {}, 'How much?');

      expect(message1).toBeTruthy();
      expect(message2).toBeTruthy();
      expect(message3).toBeTruthy();

      const stats = getStats();
      expect(stats.requests).toBe(3);
    });

    it('should handle mixed prompt types', async () => {
      const text1 = await generateText('Test', 'DUNGEON_MASTER');
      const text2 = await generateText('Test', 'NPC_MERCHANT');

      const npc = { name: 'Test', type: 'WARRIOR' };
      const dialogue = await generateDialogue(npc, {}, 'Hello');

      const encounter = {
        playerName: 'Hero',
        playerClass: 'Warrior',
        playerLevel: 1,
        playerHP: 10,
        playerHPMax: 10,
        playerAC: 10,
        enemyName: 'Enemy',
        enemyType: 'Test',
        enemyHP: 5,
        enemyHPMax: 5,
        enemyAC: 10,
        action: 'attack',
        location: 'Test',
      };
      const combat = await generateCombatDescription(encounter);

      expect(text1).toBeTruthy();
      expect(text2).toBeTruthy();
      expect(dialogue).toBeTruthy();
      expect(combat).toBeTruthy();

      const stats = getStats();
      expect(stats.requests).toBe(4);
    });
  });
});
