/**
 * Travel Service
 * 
 * Manages:
 * - Travel cost calculation (gold, rations, time)
 * - Travel time estimation with weather/terrain modifiers
 * - Encounter generation during travel
 * - Rest and recovery mechanics
 * - Location transitions and arrival handling
 */

import pool from '../db/pool.js';
import { generateNarrative } from './gemini.js';

class TravelService {
  /**
   * Calculate travel cost (gold, rations, time)
   * 
   * Base formula: distance × party_size × terrain_multiplier
   * - Safe roads: 1.0x (clear travel)
   * - Wilderness: 1.5x (more supplies needed)
   * - Dungeons: 2.0x (dangerous, more preparation)
   * 
   * Cost in gold: 5 per hour of travel
   * Cost in rations: 1 per day of travel per party member
   */
  static calculateTravelCost(originNode, destinationNode, partySize) {
    // Base distance calculation (simplified: 1-10 relative units)
    const baseDistance = this._calculateDistance(originNode, destinationNode);
    
    // Terrain multiplier
    let terrainMultiplier = 1.0;
    if (originNode.node_type === 'dungeon' || destinationNode.node_type === 'dungeon') {
      terrainMultiplier = 2.0;
    } else if (originNode.node_type === 'wilderness' || destinationNode.node_type === 'wilderness') {
      terrainMultiplier = 1.5;
    }
    
    // Calculate travel time (hours)
    const travelHours = this._calculateTravelHours(baseDistance, terrainMultiplier);
    
    // Calculate costs
    const goldCost = Math.ceil(travelHours * 5); // 5 gold per hour
    const rationCost = Math.ceil((travelHours / 24) * partySize); // 1 ration per 24h per member
    
    return {
      gold: goldCost,
      rations: rationCost,
      hours: travelHours,
      distance: baseDistance,
      terrainMultiplier
    };
  }

  /**
   * Simplified distance calculation based on location pairing
   * In production, could use Euclidean distance with (x, y) coordinates
   */
  static _calculateDistance(from, to) {
    // Quick reference: settlement-to-settlement = 3, settlement-to-wilderness = 2, etc
    if (from.node_type === 'settlement' && to.node_type === 'settlement') return 3;
    if (from.node_type === 'wilderness' && to.node_type === 'wilderness') return 2;
    if (from.node_type === 'dungeon') return 4; // Dungeons are harder to reach
    if (to.node_type === 'dungeon') return 4;
    return 2; // Default: settlement ↔ wilderness
  }

  /**
   * Calculate travel time in hours
   * Base speed: 24 miles per day = 1 mile per hour = 1 unit per hour
   * Weather and terrain modify this
   */
  static _calculateTravelHours(distance, terrainMultiplier) {
    // Base: 2 hours per unit distance
    const baseHours = distance * 2;
    
    // Terrain modifier slows travel
    return Math.ceil(baseHours * terrainMultiplier);
  }

  /**
   * Calculate encounter probability during travel
   * Higher danger level + wilderness = higher encounter chance
   * Safe roads through settlements = low encounter chance
   */
  static calculateEncounterChance(originNode, destinationNode) {
    let chance = 0;
    
    // Danger from destination
    const dangerLevel = destinationNode.danger_level || 1;
    chance += dangerLevel * 5; // 5% per danger level
    
    // Danger from terrain type
    if (originNode.node_type === 'wilderness' || destinationNode.node_type === 'wilderness') {
      chance += 20; // +20% if wilderness travel
    }
    if (originNode.node_type === 'dungeon' || destinationNode.node_type === 'dungeon') {
      chance += 50; // +50% if near dungeon
    }
    
    // Safe roads reduce chance
    if (originNode.node_type === 'settlement' && destinationNode.node_type === 'settlement') {
      chance = Math.max(5, chance - 20); // -20% but minimum 5%
    }
    
    return Math.min(100, chance); // Cap at 100%
  }

  /**
   * Initiate travel from one location to another
   * 
   * Steps:
   * 1. Validate destination exists and is discovered
   * 2. Check character has enough resources
   * 3. Deduct costs from character inventory
   * 4. Create travel_log entry
   * 5. Check for encounter
   * 6. Set travel state
   */
  static async initiateTravel(characterId, destinationId, db) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current character location and status
      const charResult = await client.query(
        `SELECT c.id, c.gold, c.hp, c.max_hp, cl.current_node_id, m1.node_type as current_type
         FROM characters c
         LEFT JOIN character_locations cl ON c.id = cl.character_id
         LEFT JOIN map_nodes m1 ON cl.current_node_id = m1.id
         WHERE c.id = $1`,
        [characterId]
      );

      if (charResult.rows.length === 0) {
        throw new Error('Character not found');
      }

      const character = charResult.rows[0];
      const originNodeId = character.current_node_id;

      // Get destination node details
      const destResult = await client.query(
        'SELECT * FROM map_nodes WHERE id = $1',
        [destinationId]
      );

      if (destResult.rows.length === 0) {
        throw new Error('Destination not found');
      }

      const destinationNode = destResult.rows[0];

      // Get origin node details
      const originResult = await client.query(
        'SELECT * FROM map_nodes WHERE id = $1',
        [originNodeId]
      );

      const originNode = originResult.rows.length > 0 
        ? originResult.rows[0] 
        : { node_type: 'settlement', danger_level: 1 };

      // Calculate costs
      const partySize = 1; // TODO: fetch actual party size
      const costs = this.calculateTravelCost(originNode, destinationNode, partySize);

      // Check resources
      if (character.gold < costs.gold) {
        throw new Error(`Insufficient gold: need ${costs.gold}, have ${character.gold}`);
      }

      // Deduct gold (rations handled separately in Phase 3C inventory)
      await client.query(
        'UPDATE characters SET gold = gold - $1 WHERE id = $2',
        [costs.gold, characterId]
      );

      // Calculate encounter chance
      const encounterChance = this.calculateEncounterChance(originNode, destinationNode);
      const encounterTriggered = Math.random() * 100 < encounterChance;

      // Calculate actual travel time (in-game, not wall-clock)
      // For now, immediate arrival for demo purposes
      // In production, this could be scheduled with websocket updates
      const actualDurationHours = costs.hours;

      // Create travel_log entry
      const travelResult = await client.query(
        `INSERT INTO travel_log 
         (character_id, origin_node_id, destination_node_id, departed_at, arrived_at, duration_hours, cost_gold, encounter_triggered)
         VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '1 minute', $4, $5, $6)
         RETURNING id, cost_gold`,
        [characterId, originNodeId, destinationId, actualDurationHours, costs.gold, encounterTriggered]
      );

      const travelLogId = travelResult.rows[0].id;

      // Generate encounter if needed
      let encounter = null;
      if (encounterTriggered) {
        encounter = await this.generateEncounter(
          originNode, 
          destinationNode, 
          travelLogId, 
          character,
          client
        );
      }

      // Update character location to destination
      await client.query(
        `INSERT INTO character_locations (character_id, current_node_id, arrival_time)
         VALUES ($1, $2, NOW())
         ON CONFLICT (character_id) DO UPDATE
         SET current_node_id = $2, arrival_time = NOW()`,
        [characterId, destinationId]
      );

      // Discover location if new
      await client.query(
        `INSERT INTO character_discovered_locations (character_id, node_id)
         VALUES ($1, $2)
         ON CONFLICT (character_id, node_id) DO NOTHING`,
        [characterId, destinationId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        travelLogId,
        destination: destinationNode,
        costGold: costs.gold,
        costRations: costs.rations,
        duration: costs.hours,
        encounter: encounter
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Generate random encounter during travel
   * 
   * Types:
   * - combat (30%): enemy creatures, difficulty scaled
   * - npc_meeting (30%): friendly/neutral NPC encounter
   * - treasure (20%): loot discovery
   * - hazard (20%): environmental challenge or damage
   */
  static async generateEncounter(originNode, destinationNode, travelLogId, character, client) {
    const rand = Math.random();
    let encounterType, difficulty;

    // Determine encounter type (30/30/20/20 distribution)
    if (rand < 0.30) {
      encounterType = 'combat';
      difficulty = Math.min(10, Math.max(1, destinationNode.danger_level));
    } else if (rand < 0.60) {
      encounterType = 'npc_meeting';
      difficulty = Math.max(1, destinationNode.danger_level - 1);
    } else if (rand < 0.80) {
      encounterType = 'treasure';
      difficulty = Math.min(5, destinationNode.danger_level);
    } else {
      encounterType = 'hazard';
      difficulty = destinationNode.danger_level;
    }

    // Calculate rewards
    const rewards = this._calculateRewards(encounterType, difficulty, character.level || 1);

    // Generate description via Gemini
    let description = await this._generateEncounterDescription(
      encounterType,
      originNode,
      destinationNode,
      difficulty
    );

    // Create encounter record
    const encounterResult = await client.query(
      `INSERT INTO encounters 
       (travel_log_id, encounter_type, difficulty, description, rewards)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [travelLogId, encounterType, difficulty, description, JSON.stringify(rewards)]
    );

    return {
      id: encounterResult.rows[0].id,
      type: encounterType,
      difficulty,
      description,
      rewards
    };
  }

  /**
   * Generate encounter description using Gemini
   */
  static async _generateEncounterDescription(type, originNode, destinationNode, difficulty) {
    const context = {
      type,
      from: originNode.name,
      to: destinationNode.name,
      difficulty: `Level ${difficulty}`,
      terrain: originNode.region
    };

    try {
      const description = await generateNarrative(
        `Generate a brief, immersive description of a ${type} encounter while traveling from ${originNode.name} to ${destinationNode.name}. 
         This is a ${difficulty}/10 difficulty encounter in ${originNode.region} terrain.
         Keep it to 2-3 sentences, focus on atmosphere and immediate action.`,
        context
      );
      return description;
    } catch (err) {
      // Fallback descriptions
      const fallbacks = {
        combat: `You hear a low growl in the darkness. Shadows move in the ${originNode.region}...`,
        npc_meeting: `A traveler approaches from the direction of ${destinationNode.name}, calling out to you.`,
        treasure: `Something glints in the distance—an object half-buried in the earth catches your eye.`,
        hazard: `The terrain becomes treacherous. A ${originNode.region === 'Mountain' ? 'rockslide' : 'sudden storm'} approaches!`
      };
      return fallbacks[type] || fallbacks.combat;
    }
  }

  /**
   * Calculate rewards for encounter completion
   * 
   * Gold: difficulty × 10-20 (e.g., difficulty 3 = 30-60 gold)
   * Experience: difficulty × 25-50
   * Loot: 30% chance per difficulty level
   */
  static _calculateRewards(type, difficulty, partyLevel) {
    const baseGold = difficulty * (10 + Math.random() * 10);
    const baseExp = difficulty * (25 + Math.random() * 25);
    
    let rewards = {
      gold: Math.ceil(baseGold),
      experience: Math.ceil(baseExp),
      loot: null
    };

    // Treasure encounters yield more
    if (type === 'treasure') {
      rewards.gold = Math.ceil(baseGold * 2);
      rewards.loot = true;
    }

    // Hazard encounters yield less
    if (type === 'hazard') {
      rewards.gold = Math.ceil(baseGold * 0.5);
      rewards.experience = Math.ceil(baseExp * 0.75);
    }

    return rewards;
  }

  /**
   * Rest at current location to recover health
   * 
   * Recovery rates:
   * - HP: 1/4 max per 8-hour rest
   * - Willpower: 1/4 max per 8-hour rest
   * - Fatigue: decreases 1 per hour rest
   * 
   * Cost: 1 ration per 8-hour rest
   */
  static async restAtLocation(characterId, location, hoursOfRest, db) {
    const result = await db.query(
      `SELECT id, hp, max_hp FROM characters WHERE id = $1`,
      [characterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Character not found');
    }

    const character = result.rows[0];
    
    // Calculate recovery
    const restCycles = Math.floor(hoursOfRest / 8);
    const hpRecovered = Math.ceil((character.max_hp / 4) * restCycles);
    const rationCost = restCycles;

    // Update character
    const newHp = Math.min(character.max_hp, character.hp + hpRecovered);
    
    await db.query(
      `UPDATE characters 
       SET hp = $1, updated_at = NOW()
       WHERE id = $2`,
      [newHp, characterId]
    );

    return {
      hpRecovered: hpRecovered,
      newHp: newHp,
      rationsCost: rationCost,
      hoursUsed: hoursOfRest
    };
  }

  /**
   * Get travel information between two locations
   * Useful for route planning UI
   */
  static async getTravelInfo(originId, destinationId, partySize = 1, db) {
    const originResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [originId]
    );

    const destResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [destinationId]
    );

    if (originResult.rows.length === 0 || destResult.rows.length === 0) {
      throw new Error('Location not found');
    }

    const origin = originResult.rows[0];
    const destination = destResult.rows[0];

    const costs = this.calculateTravelCost(origin, destination, partySize);
    const encounterChance = this.calculateEncounterChance(origin, destination);

    return {
      from: {
        id: origin.id,
        name: origin.name,
        type: origin.node_type,
        danger: origin.danger_level
      },
      to: {
        id: destination.id,
        name: destination.name,
        type: destination.node_type,
        danger: destination.danger_level
      },
      distance: costs.distance,
      cost: {
        gold: costs.gold,
        rations: costs.rations
      },
      duration: {
        hours: costs.hours,
        days: (costs.hours / 24).toFixed(1)
      },
      terrain: {
        from: origin.region,
        to: destination.region,
        multiplier: costs.terrainMultiplier
      },
      risk: {
        encounterChance: encounterChance,
        difficulty: destination.danger_level,
        description: this._riskDescription(encounterChance)
      }
    };
  }

  /**
   * Describe risk level in human terms
   */
  static _riskDescription(chance) {
    if (chance < 10) return 'Very Safe';
    if (chance < 30) return 'Safe';
    if (chance < 50) return 'Moderate Risk';
    if (chance < 70) return 'Dangerous';
    return 'Very Dangerous';
  }

  /**
   * Get discovered locations for a character
   */
  static async getDiscoveredLocations(characterId, db) {
    const result = await db.query(
      `SELECT DISTINCT m.*
       FROM map_nodes m
       JOIN character_discovered_locations cd ON m.id = cd.node_id
       WHERE cd.character_id = $1
       ORDER BY m.node_type, m.name`,
      [characterId]
    );

    return result.rows;
  }

  /**
   * Get travel history for a character
   */
  static async getTravelHistory(characterId, limit = 20, db) {
    const result = await db.query(
      `SELECT tl.*, m1.name as origin_name, m2.name as destination_name
       FROM travel_log tl
       JOIN map_nodes m1 ON tl.origin_node_id = m1.id
       JOIN map_nodes m2 ON tl.destination_node_id = m2.id
       WHERE tl.character_id = $1
       ORDER BY tl.departed_at DESC
       LIMIT $2`,
      [characterId, limit]
    );

    return result.rows;
  }

  /**
   * Get current travel status
   */
  static async getTravelStatus(characterId, db) {
    // Get current location
    const locResult = await db.query(
      `SELECT cl.current_node_id, m.name, m.node_type, m.description
       FROM character_locations cl
       JOIN map_nodes m ON cl.current_node_id = m.id
       WHERE cl.character_id = $1`,
      [characterId]
    );

    if (locResult.rows.length === 0) {
      return null;
    }

    const location = locResult.rows[0];

    // Check for active travel
    const travelResult = await db.query(
      `SELECT tl.*, m.name as destination_name
       FROM travel_log tl
       JOIN map_nodes m ON tl.destination_node_id = m.id
       WHERE tl.character_id = $1
       AND tl.arrived_at > NOW()
       ORDER BY tl.departed_at DESC
       LIMIT 1`,
      [characterId]
    );

    return {
      current_location: location,
      active_travel: travelResult.rows.length > 0 ? travelResult.rows[0] : null
    };
  }
}

export default TravelService;
