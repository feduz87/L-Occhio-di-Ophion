/**
 * NPC Service Tests
 * 
 * Unit tests for NPC dialogue, affinity, and relationship management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import NPCService from '../services/npc.js';

describe('NPCService', () => {
  let characterId = 'test-char-1';
  let npcId = 'npc-grimbeard';
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: async (sql, params) => {
        // Mock database responses
        if (sql.includes('SELECT * FROM npcs WHERE id')) {
          return {
            rows: [{
              id: npcId,
              name: 'Grimbeard',
              race: 'Dwarf',
              role: 'merchant',
              hotspot_id: 'hotspot-1',
              personality: JSON.stringify({
                temperament: 'gruff',
                intelligence: 8,
                charisma: 7,
                likes: ['gold', 'craftsmanship'],
                dislikes: ['elves', 'thieves']
              }),
              initial_affinity: 0
            }]
          };
        }
        if (sql.includes('SELECT * FROM npc_state WHERE npc_id')) {
          return { rows: [{ npc_id: npcId, current_mood: 'neutral' }] };
        }
        if (sql.includes('SELECT * FROM character_relationships')) {
          return { rows: [{ character_id: characterId, npc_id: npcId, current_affinity: 10 }] };
        }
        if (sql.includes('SELECT h.*, m.name')) {
          return {
            rows: [{
              id: 'hotspot-1',
              location_name: 'Dwarven Hold',
              position_x: 100,
              position_y: 200
            }]
          };
        }
        if (sql.includes('INSERT INTO dialogue_history')) {
          return { rows: [{ id: 1 }] };
        }
        if (sql.includes('UPDATE character_relationships')) {
          return { rows: [{ current_affinity: 12, relationship_type: 'acquaintance' }] };
        }
        return { rows: [] };
      }
    };
  });

  describe('getNPC', () => {
    it('should retrieve NPC with personality and affinity', async () => {
      const npcData = await NPCService.getNPC(npcId, characterId, mockDb);

      expect(npcData).toBeDefined();
      expect(npcData.npc.name).toBe('Grimbeard');
      expect(npcData.npc.personality.temperament).toBe('gruff');
      expect(npcData.affinity.current_affinity).toBe(10);
    });

    it('should parse personality JSON correctly', async () => {
      const npcData = await NPCService.getNPC(npcId, characterId, mockDb);

      expect(npcData.npc.personality).toEqual(
        expect.objectContaining({
          temperament: 'gruff',
          intelligence: 8,
          charisma: 7
        })
      );
    });
  });

  describe('generateDialogue', () => {
    it('should return NPC response with affinity delta', async () => {
      const response = await NPCService.generateDialogue(
        npcId,
        characterId,
        'Hello, I would like to trade with you.',
        mockDb
      );

      expect(response).toHaveProperty('response');
      expect(response).toHaveProperty('affinity_delta');
      expect(response).toHaveProperty('new_affinity');
      expect(response).toHaveProperty('relationship_type');
    });

    it('should increase affinity for positive messages', async () => {
      const response = await NPCService.generateDialogue(
        npcId,
        characterId,
        'Your craftsmanship is truly excellent. I respect you.',
        mockDb
      );

      expect(response.affinity_delta).toBeGreaterThan(0);
    });

    it('should decrease affinity for negative messages', async () => {
      const response = await NPCService.generateDialogue(
        npcId,
        characterId,
        'You are weak and stupid!',
        mockDb
      );

      expect(response.affinity_delta).toBeLessThan(0);
    });
  });

  describe('updateAffinity', () => {
    it('should update existing affinity relationship', async () => {
      const result = await NPCService.updateAffinity(npcId, characterId, 5, mockDb);

      expect(result).toHaveProperty('current_affinity');
      expect(result).toHaveProperty('relationship_type');
    });

    it('should cap affinity at 100 and -100', async () => {
      // Test max cap
      let result = await NPCService.updateAffinity(npcId, characterId, 200, mockDb);
      expect(result.current_affinity).toBeLessThanOrEqual(100);

      // Test min cap
      result = await NPCService.updateAffinity(npcId, characterId, -200, mockDb);
      expect(result.current_affinity).toBeGreaterThanOrEqual(-100);
    });

    it('should derive relationship_type from affinity level', async () => {
      const result = await NPCService.updateAffinity(npcId, characterId, 80, mockDb);

      expect(['amante', 'amico', 'acquaintance', 'neutral', 'suspicious', 'ostile']).toContain(result.relationship_type);
    });
  });

  describe('_parseAffinityDelta', () => {
    it('should detect positive words', () => {
      const delta = NPCService._parseAffinityDelta(
        'thank you very much',
        'response',
        'neutral'
      );

      expect(delta).toBeGreaterThan(0);
    });

    it('should detect negative words', () => {
      const delta = NPCService._parseAffinityDelta(
        'you are terrible and weak',
        'response',
        'neutral'
      );

      expect(delta).toBeLessThan(0);
    });

    it('should base delta on attitude', () => {
      const friendlyDelta = NPCService._parseAffinityDelta('hello', 'response', 'friendly');
      const hostileDelta = NPCService._parseAffinityDelta('hello', 'response', 'hostile');

      expect(friendlyDelta).toBeGreaterThan(hostileDelta);
    });
  });

  describe('_getDialogueTemplate', () => {
    it('should return appropriate template for hostile merchant', () => {
      const template = NPCService._getDialogueTemplate('hostile', 'merchant');

      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(0);
    });

    it('should vary templates by attitude', () => {
      const hostile = NPCService._getDialogueTemplate('hostile', 'warrior');
      const friendly = NPCService._getDialogueTemplate('friendly', 'warrior');

      expect(hostile).not.toBe(friendly);
    });
  });
});
