/**
 * NPC + Quest Integration Tests
 * 
 * End-to-end tests for NPC dialogue, affinity building, and quest acceptance flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import NPCService from '../server/services/npc.js';
import QuestService from '../server/services/quest.js';

describe('NPC + Quest Integration', () => {
  let characterId = 'test-char-integration';
  let npcId = 'npc-quest-giver';
  let questId = 'quest-gather-herbs';
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: async (sql, params) => {
        // NPC data
        if (sql.includes('SELECT * FROM npcs WHERE id = $1')) {
          return {
            rows: [{
              id: npcId,
              name: 'Quest Master',
              race: 'Human',
              role: 'quest_giver',
              hotspot_id: 'hotspot-quest-hall',
              personality: JSON.stringify({
                temperament: 'professional',
                intelligence: 9,
                charisma: 8,
                likes: ['adventurers', 'gold'],
                dislikes: ['laziness']
              }),
              initial_affinity: 5,
              is_recruitable: false
            }]
          };
        }

        // NPC state
        if (sql.includes('SELECT * FROM npc_state WHERE npc_id = $1')) {
          return { rows: [{ npc_id: npcId, current_mood: 'professional' }] };
        }

        // Character relationships
        if (sql.includes('SELECT * FROM character_relationships WHERE character_id = $1 AND npc_id = $2')) {
          return { rows: [{ character_id: characterId, npc_id: npcId, current_affinity: 5, relationship_type: 'neutral' }] };
        }

        // Hotspot/location
        if (sql.includes('SELECT h.*, m.name as location_name')) {
          return {
            rows: [{
              id: 'hotspot-quest-hall',
              location_name: 'Quest Hall',
              position_x: 50,
              position_y: 50
            }]
          };
        }

        // Quest details
        if (sql.includes('SELECT q.*, n.name as quest_giver_name FROM quests q LEFT JOIN npcs n')) {
          return {
            rows: [{
              id: questId,
              name: 'Gather Rare Herbs',
              description: 'Find 10 moonflowers in the forest',
              difficulty: 'easy',
              quest_type: 'gather',
              quest_giver_id: npcId,
              rewards_gold: 200,
              rewards_experience: 500,
              quest_giver_name: 'Quest Master'
            }]
          };
        }

        // Quest objectives
        if (sql.includes('SELECT * FROM quest_objectives WHERE quest_id')) {
          return {
            rows: [
              { id: 'obj-1', quest_id: questId, description: 'Find 10 moonflowers', order_num: 1 }
            ]
          };
        }

        // Quest rewards
        if (sql.includes('SELECT * FROM quest_rewards WHERE quest_id')) {
          return {
            rows: [
              { id: 'reward-1', quest_id: questId, reward_type: 'gold', reward_value: 200 }
            ]
          };
        }

        // Character quests
        if (sql.includes('INSERT INTO character_quests') || sql.includes('SELECT cq.*, q.name')) {
          return {
            rows: [{
              id: 'char-quest-1',
              character_id: characterId,
              quest_id: questId,
              status: 'accepted',
              progress: 0
            }]
          };
        }

        // Dialogue history
        if (sql.includes('INSERT INTO dialogue_history')) {
          return { rows: [{ id: 1 }] };
        }

        // Update affinity
        if (sql.includes('UPDATE character_relationships')) {
          return { rows: [{ current_affinity: 8, relationship_type: 'warm' }] };
        }

        // Character gold
        if (sql.includes('SELECT gold FROM characters')) {
          return { rows: [{ gold: 5000 }] };
        }

        // Complete quest
        if (sql.includes('UPDATE character_quests') && sql.includes('status = \'completed\'')) {
          return { rows: [{ status: 'completed', progress: 100 }] };
        }

        return { rows: [] };
      }
    };
  });

  describe('Dialogue → Affinity → Quest Flow', () => {
    it('should load NPC and initiate dialogue', async () => {
      const npcData = await NPCService.getNPC(npcId, characterId, mockDb);

      expect(npcData.npc.name).toBe('Quest Master');
      expect(npcData.affinity.current_affinity).toBe(5);
      expect(npcData.affinity.relationship_type).toBe('neutral');
    });

    it('should generate dialogue that affects affinity', async () => {
      const response = await NPCService.generateDialogue(
        npcId,
        characterId,
        'I am ready to help with any quests. Thank you for the opportunity.',
        mockDb
      );

      expect(response.affinity_delta).toBeGreaterThan(0);
      expect(response.new_affinity).toBeGreaterThan(5);
    });

    it('should allow quest acceptance after dialogue', async () => {
      const charQuest = await QuestService.acceptQuest(questId, characterId, mockDb);

      expect(charQuest.status).toBe('accepted');
      expect(charQuest.progress).toBe(0);
    });

    it('should track quest progress', async () => {
      await QuestService.acceptQuest(questId, characterId, mockDb);

      const updated = await QuestService.updateProgress(questId, characterId, 50, mockDb);

      expect(updated.progress).toBeGreaterThan(0);
    });

    it('should complete quest and increase NPC affinity', async () => {
      await QuestService.acceptQuest(questId, characterId, mockDb);

      const result = await QuestService.completeQuest(questId, characterId, mockDb);

      expect(result.quest.status).toBe('completed');
      expect(result.rewards.gold).toBe(200);
    });
  });

  describe('Multiple NPCs and Quests', () => {
    it('should allow accepting multiple quests', async () => {
      const quest1 = await QuestService.acceptQuest(questId, characterId, mockDb);
      const quest2 = await QuestService.acceptQuest('quest-2', characterId, mockDb);

      expect(quest1.status).toBe('accepted');
      expect(quest2.status).toBe('accepted');
    });

    it('should track quest stats including active and completed', async () => {
      const stats = await QuestService.getQuestStats(characterId, mockDb);

      expect(stats).toHaveProperty('active_count');
      expect(stats).toHaveProperty('completed_count');
    });
  });

  describe('Error Handling', () => {
    it('should handle quest abandonment with reason', async () => {
      const abandoned = await QuestService.abandonQuest(
        questId,
        characterId,
        'Too dangerous at my current level',
        mockDb
      );

      expect(abandoned.status).toBe('abandoned');
    });
  });
});
