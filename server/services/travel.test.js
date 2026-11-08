/**
 * Travel Service Tests
 * 
 * Tests:
 * - Travel cost calculation
 * - Encounter generation
 * - Location discovery
 * - Rest mechanics
 */

const TravelService = require('../services/travel');
const MapService = require('../services/map');
const EncounterService = require('../services/encounter');

describe('TravelService', () => {
  // Mock database
  const mockDb = {
    query: jest.fn(),
    pool: {
      connect: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTravelCost', () => {
    const settlementNode = {
      id: '1',
      name: 'Port Town',
      node_type: 'settlement',
      danger_level: 1
    };

    const dungeonNode = {
      id: '2',
      name: 'Crypt of Ancients',
      node_type: 'dungeon',
      danger_level: 3
    };

    const wildernessNode = {
      id: '3',
      name: 'Forest Trail',
      node_type: 'wilderness',
      danger_level: 2
    };

    test('settlement to settlement: standard cost', () => {
      const cost = TravelService.calculateTravelCost(settlementNode, settlementNode, 1);
      
      expect(cost).toHaveProperty('gold');
      expect(cost).toHaveProperty('rations');
      expect(cost).toHaveProperty('hours');
      expect(cost.terrainMultiplier).toBe(1.0);
      expect(cost.gold).toBeGreaterThan(0);
    });

    test('settlement to dungeon: increased cost (2x multiplier)', () => {
      const cost = TravelService.calculateTravelCost(settlementNode, dungeonNode, 1);
      
      expect(cost.terrainMultiplier).toBe(2.0);
      expect(cost.gold).toBeGreaterThan(15);
    });

    test('cost scales with party size', () => {
      const cost1 = TravelService.calculateTravelCost(settlementNode, settlementNode, 1);
      const cost4 = TravelService.calculateTravelCost(settlementNode, settlementNode, 4);
      
      expect(cost4.rations).toBeGreaterThanOrEqual(cost1.rations);
    });

    test('travel hours never negative', () => {
      const cost = TravelService.calculateTravelCost(settlementNode, settlementNode, 1);
      expect(cost.hours).toBeGreaterThan(0);
    });
  });

  describe('calculateEncounterChance', () => {
    const safeNode = {
      node_type: 'settlement',
      danger_level: 1
    };

    const dangerNode = {
      node_type: 'dungeon',
      danger_level: 5
    };

    test('safe route: low encounter chance', () => {
      const chance = TravelService.calculateEncounterChance(safeNode, safeNode);
      expect(chance).toBeLessThan(20);
    });

    test('dangerous route: high encounter chance', () => {
      const chance = TravelService.calculateEncounterChance(safeNode, dangerNode);
      expect(chance).toBeGreaterThan(50);
    });

    test('encounter chance capped at 100%', () => {
      const chance = TravelService.calculateEncounterChance(dangerNode, dangerNode);
      expect(chance).toBeLessThanOrEqual(100);
    });

    test('wilderness travel increases chance', () => {
      const safeWilderness = { ...safeNode, node_type: 'wilderness' };
      const chanceNormal = TravelService.calculateEncounterChance(safeNode, safeNode);
      const chanceWilderness = TravelService.calculateEncounterChance(safeWilderness, safeWilderness);
      
      expect(chanceWilderness).toBeGreaterThan(chanceNormal);
    });
  });

  describe('EncounterService', () => {
    test('generateRandomEncounter returns valid encounter object', () => {
      const encounter = EncounterService.generateRandomEncounter('Mountain', 3);
      
      expect(encounter).toHaveProperty('type');
      expect(encounter).toHaveProperty('difficulty');
      expect(encounter).toHaveProperty('terrain');
      expect(['combat', 'npc_meeting', 'treasure', 'hazard']).toContain(encounter.type);
    });

    test('combat encounter has enemies array', () => {
      const encounter = EncounterService.generateRandomEncounter('Desert', 5);
      
      if (encounter.type === 'combat') {
        expect(Array.isArray(encounter.enemies)).toBe(true);
        expect(encounter.enemies.length).toBeGreaterThan(0);
      }
    });

    test('NPC meeting has role and attitude', () => {
      for (let i = 0; i < 10; i++) {
        const encounter = EncounterService.generateRandomEncounter('Coast', 2);
        
        if (encounter.type === 'npc_meeting') {
          expect(encounter).toHaveProperty('npc_role');
          expect(encounter).toHaveProperty('npc_attitude');
          expect(['friendly', 'neutral', 'suspicious', 'hostile']).toContain(encounter.npc_attitude);
          break;
        }
      }
    });

    test('treasure encounter has rarity', () => {
      for (let i = 0; i < 10; i++) {
        const encounter = EncounterService.generateRandomEncounter('Forest', 4);
        
        if (encounter.type === 'treasure') {
          expect(encounter).toHaveProperty('rarity');
          break;
        }
      }
    });

    test('hazard encounter has hazard_type', () => {
      for (let i = 0; i < 10; i++) {
        const encounter = EncounterService.generateRandomEncounter('Mountain', 3);
        
        if (encounter.type === 'hazard') {
          expect(encounter).toHaveProperty('hazard_type');
          break;
        }
      }
    });
  });

  describe('assignRewards', () => {
    test('combat rewards scale with difficulty', () => {
      const combat1 = { type: 'combat', difficulty: 1 };
      const combat5 = { type: 'combat', difficulty: 5 };
      
      const rewards1 = EncounterService.assignRewards(combat1, 1);
      const rewards5 = EncounterService.assignRewards(combat5, 1);
      
      expect(rewards5.gold).toBeGreaterThan(rewards1.gold);
      expect(rewards5.experience).toBeGreaterThan(rewards1.experience);
    });

    test('treasure encounters give more gold', () => {
      const treasure = { type: 'treasure', difficulty: 3, rarity: 'rare' };
      const combat = { type: 'combat', difficulty: 3 };
      
      const treasureRewards = EncounterService.assignRewards(treasure, 1);
      const combatRewards = EncounterService.assignRewards(combat, 1);
      
      expect(treasureRewards.gold).toBeGreaterThan(combatRewards.gold);
    });

    test('hazard encounters give reduced rewards', () => {
      const hazard = { type: 'hazard', difficulty: 3 };
      const combat = { type: 'combat', difficulty: 3 };
      
      const hazardRewards = EncounterService.assignRewards(hazard, 1);
      const combatRewards = EncounterService.assignRewards(combat, 1);
      
      expect(hazardRewards.gold).toBeLessThan(combatRewards.gold);
    });

    test('rewards never negative', () => {
      const hazard = { type: 'hazard', difficulty: 1 };
      const rewards = EncounterService.assignRewards(hazard, 1);
      
      expect(rewards.gold).toBeGreaterThanOrEqual(0);
      expect(rewards.experience).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rest mechanics', () => {
    test('rest recovery calculation', () => {
      const character = {
        id: '1',
        hp: 30,
        max_hp: 100
      };

      // Mock database query
      mockDb.query.mockResolvedValueOnce({ rows: [character] });

      const result = TravelService.restAtLocation('1', {}, 8, mockDb);

      expect(result).toBeDefined();
    });
  });

  describe('Risk description', () => {
    test('risk descriptions match chance levels', () => {
      expect(TravelService._riskDescription(5)).toBe('Very Safe');
      expect(TravelService._riskDescription(20)).toBe('Safe');
      expect(TravelService._riskDescription(40)).toBe('Moderate Risk');
      expect(TravelService._riskDescription(60)).toBe('Dangerous');
      expect(TravelService._riskDescription(80)).toBe('Very Dangerous');
    });
  });

  describe('Distance calculation', () => {
    test('settlement to settlement distance reasonable', () => {
      const settlement = { node_type: 'settlement' };
      const distance = TravelService._calculateDistance(settlement, settlement);
      
      expect(distance).toBe(3);
    });

    test('dungeon distances are farthest', () => {
      const settlement = { node_type: 'settlement' };
      const dungeon = { node_type: 'dungeon' };
      
      const normalDist = TravelService._calculateDistance(settlement, settlement);
      const dungeonDist = TravelService._calculateDistance(settlement, dungeon);
      
      expect(dungeonDist).toBeGreaterThan(normalDist);
    });
  });

  describe('Travel time calculation', () => {
    test('travel time increases with multiplier', () => {
      const time1 = TravelService._calculateTravelHours(2, 1.0);
      const time2 = TravelService._calculateTravelHours(2, 1.5);
      const time3 = TravelService._calculateTravelHours(2, 2.0);
      
      expect(time1).toBeLessThan(time2);
      expect(time2).toBeLessThan(time3);
    });

    test('travel time always at least 1 hour', () => {
      const time = TravelService._calculateTravelHours(0.5, 0.5);
      expect(time).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('MapService', () => {
  const mockDb = {
    query: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location queries', () => {
    test('getAllLocations returns array', async () => {
      const locations = [
        { id: '1', name: 'Port Town', node_type: 'settlement', region: 'Coast' },
        { id: '2', name: 'Mountain Keep', node_type: 'settlement', region: 'Mountain' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: locations });

      const result = await MapService.getAllLocations({}, mockDb);
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('location filtering by region', async () => {
      const locations = [
        { id: '1', name: 'Port Town', node_type: 'settlement', region: 'Coast' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: locations });

      const result = await MapService.getAllLocations({ region: 'Coast' }, mockDb);
      
      expect(mockDb.query).toHaveBeenCalled();
      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('region');
    });

    test('location filtering by danger level', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await MapService.getAllLocations({ min_danger: 3, max_danger: 5 }, mockDb);
      
      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('danger_level');
    });
  });

  describe('Discovery tracking', () => {
    test('discoverLocation marks new location as discovered', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check if already discovered
        .mockResolvedValueOnce({ 
          rows: [{ id: '1', name: 'Port Town', node_type: 'settlement' }] 
        }); // Get location
      
      const result = await MapService.discoverLocation('char1', 'loc1', mockDb);
      
      expect(result).toBeDefined();
    });
  });
});
