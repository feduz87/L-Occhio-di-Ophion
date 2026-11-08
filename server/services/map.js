/**
 * Map Service
 * 
 * Manages:
 * - Location queries (all locations, details, discovered)
 * - Location discovery tracking
 * - Hotspot management (NPCs, chests, shrines within locations)
 * - Location state updates (weather, danger level adjustments)
 */

const db = require('../db/init');

class MapService {
  /**
   * Get all locations in the world
   * Optionally filtered by region, danger level, type
   */
  static async getAllLocations(filter = {}, db) {
    let query = 'SELECT * FROM map_nodes WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filter.region) {
      query += ` AND region = $${paramCount++}`;
      params.push(filter.region);
    }

    if (filter.node_type) {
      query += ` AND node_type = $${paramCount++}`;
      params.push(filter.node_type);
    }

    if (filter.min_danger !== undefined) {
      query += ` AND danger_level >= $${paramCount++}`;
      params.push(filter.min_danger);
    }

    if (filter.max_danger !== undefined) {
      query += ` AND danger_level <= $${paramCount++}`;
      params.push(filter.max_danger);
    }

    query += ' ORDER BY node_type, region, name';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get locations discovered by a character
   * Only returns locations the character has visited or learned about
   */
  static async getDiscoveredLocations(characterId, db) {
    const result = await db.query(
      `SELECT DISTINCT m.*, 
              cd.discovered_at,
              (SELECT COUNT(*) FROM travel_log tl 
               WHERE tl.character_id = $1 AND tl.destination_node_id = m.id) as visit_count
       FROM map_nodes m
       JOIN character_discovered_locations cd ON m.id = cd.node_id
       WHERE cd.character_id = $1
       ORDER BY cd.discovered_at DESC`,
      [characterId]
    );

    return result.rows;
  }

  /**
   * Get detailed information about a single location
   * Includes hotspots (NPCs, chests), current weather, threats
   */
  static async getLocationDetails(locationId, characterId = null, db) {
    // Get location
    const locResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [locationId]
    );

    if (locResult.rows.length === 0) {
      throw new Error('Location not found');
    }

    const location = locResult.rows[0];

    // Get hotspots (NPCs, items, etc)
    const hotspotsResult = await db.query(
      `SELECT hs.*, COUNT(npcs.id) as npc_count
       FROM hotspots hs
       LEFT JOIN npcs ON hs.id = npcs.hotspot_id
       WHERE hs.node_id = $1
       GROUP BY hs.id
       ORDER BY hs.hotspot_type, hs.name`,
      [locationId]
    );

    // Get loot containers (chests, corpses)
    const containersResult = await db.query(
      `SELECT lc.*, COUNT(cc.id) as item_count
       FROM loot_containers lc
       LEFT JOIN container_contents cc ON lc.id = cc.container_id
       WHERE lc.node_id = $1
       GROUP BY lc.id
       ORDER BY lc.container_type, lc.container_key`,
      [locationId]
    );

    // Check if character has discovered this location
    let isDiscovered = false;
    if (characterId) {
      const discResult = await db.query(
        `SELECT 1 FROM character_discovered_locations 
         WHERE character_id = $1 AND node_id = $2`,
        [characterId, locationId]
      );
      isDiscovered = discResult.rows.length > 0;
    }

    return {
      location: location,
      discovered: isDiscovered,
      hotspots: hotspotsResult.rows,
      containers: containersResult.rows,
      stats: {
        total_hotspots: hotspotsResult.rows.length,
        total_npcs: hotspotsResult.rows.reduce((sum, h) => sum + (h.npc_count || 0), 0),
        total_containers: containersResult.rows.length,
        items_available: containersResult.rows.reduce((sum, c) => sum + (c.item_count || 0), 0)
      }
    };
  }

  /**
   * Mark a location as discovered for a character
   * Triggered when character first visits or learns about a location
   */
  static async discoverLocation(characterId, locationId, db) {
    const discResult = await db.query(
      `SELECT 1 FROM character_discovered_locations
       WHERE character_id = $1 AND node_id = $2`,
      [characterId, locationId]
    );

    if (discResult.rows.length > 0) {
      return { discovered: false, message: 'Already discovered' };
    }

    // Check location exists
    const locResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [locationId]
    );

    if (locResult.rows.length === 0) {
      throw new Error('Location not found');
    }

    const location = locResult.rows[0];

    // Record discovery
    await db.query(
      `INSERT INTO character_discovered_locations (character_id, node_id)
       VALUES ($1, $2)`,
      [characterId, locationId]
    );

    return {
      discovered: true,
      location: location,
      message: `Discovered ${location.name}!`
    };
  }

  /**
   * Get all hotspots in a location (NPCs, items, environmental)
   */
  static async getLocationHotspots(locationId, db) {
    const result = await db.query(
      `SELECT hs.*, 
              COUNT(DISTINCT npcs.id) as npc_count,
              array_agg(DISTINCT npcs.name) as npc_names
       FROM hotspots hs
       LEFT JOIN npcs ON hs.id = npcs.hotspot_id
       WHERE hs.node_id = $1
       GROUP BY hs.id
       ORDER BY hs.position_y, hs.position_x`,
      [locationId]
    );

    return result.rows;
  }

  /**
   * Get NPCs at a location
   */
  static async getLocationNPCs(locationId, db) {
    const result = await db.query(
      `SELECT npcs.*, hs.name as hotspot_name, hs.position_x, hs.position_y
       FROM npcs
       JOIN hotspots hs ON npcs.hotspot_id = hs.id
       WHERE hs.node_id = $1
       ORDER BY hs.position_y, hs.position_x`,
      [locationId]
    );

    return result.rows;
  }

  /**
   * Create a new hotspot in a location
   * Used for dynamic event spawning
   */
  static async createHotspot(locationId, hotshotData, db) {
    const result = await db.query(
      `INSERT INTO hotspots (node_id, hotspot_key, name, hotspot_type, description, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        locationId,
        hotshotData.hotspot_key,
        hotshotData.name,
        hotshotData.hotspot_type,
        hotshotData.description,
        hotshotData.position_x || 0,
        hotshotData.position_y || 0
      ]
    );

    return result.rows[0];
  }

  /**
   * Get loot container contents
   */
  static async getContainerContents(containerId, db) {
    const result = await db.query(
      `SELECT cc.*, ib.item_key, ib.name as item_name, ib.rarity
       FROM container_contents cc
       JOIN items_base ib ON cc.item_id = ib.id
       WHERE cc.container_id = $1`,
      [containerId]
    );

    return result.rows;
  }

  /**
   * Open/loot a container
   * Transfer items to character inventory
   */
  static async openContainer(containerId, characterId, db) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Get container contents
      const contentsResult = await client.query(
        `SELECT cc.*, ib.item_key
         FROM container_contents cc
         JOIN items_base ib ON cc.item_id = ib.id
         WHERE cc.container_id = $1`,
        [containerId]
      );

      if (contentsResult.rows.length === 0) {
        throw new Error('Container is empty');
      }

      const items = contentsResult.rows;

      // Add items to character inventory
      for (const item of items) {
        await client.query(
          `INSERT INTO character_inventory (character_id, item_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (character_id, item_id) DO UPDATE
           SET quantity = quantity + $3`,
          [characterId, item.item_id, item.quantity]
        );
      }

      // Mark container as opened
      await client.query(
        'UPDATE loot_containers SET opened = true WHERE id = $1',
        [containerId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        items_looted: items.length,
        items: items
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update location state (weather, active hazards, etc)
   */
  static async updateLocationState(locationId, updates, db) {
    const allowedFields = ['weather_current', 'danger_level'];
    const setParts = [];
    const values = [locationId];
    let paramCount = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      setParts.push(`${key} = $${paramCount++}`);
      values.push(value);
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update');
    }

    const query = `
      UPDATE map_nodes 
      SET ${setParts.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get location statistics (visitors, discoveries rate)
   */
  static async getLocationStats(locationId, db) {
    // Count visitors
    const visitorsResult = await db.query(
      `SELECT COUNT(DISTINCT character_id) as unique_visitors,
              COUNT(*) as total_visits,
              MAX(departed_at) as last_visited
       FROM travel_log
       WHERE destination_node_id = $1`,
      [locationId]
    );

    const visitors = visitorsResult.rows[0];

    // Count discoveries
    const discoveriesResult = await db.query(
      `SELECT COUNT(*) as discoveries_count,
              MIN(discovered_at) as first_discovered,
              MAX(discovered_at) as last_discovered
       FROM character_discovered_locations
       WHERE node_id = $1`,
      [locationId]
    );

    const discoveries = discoveriesResult.rows[0];

    // Location details for context
    const locResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [locationId]
    );

    if (locResult.rows.length === 0) {
      throw new Error('Location not found');
    }

    return {
      location: locResult.rows[0],
      visits: {
        unique_visitors: parseInt(visitors.unique_visitors) || 0,
        total_visits: parseInt(visitors.total_visits) || 0,
        last_visited: visitors.last_visited
      },
      discoveries: {
        count: parseInt(discoveries.discoveries_count) || 0,
        first_discovered: discoveries.first_discovered,
        last_discovered: discoveries.last_discovered
      }
    };
  }

  /**
   * Get adjacent/nearby locations
   * Useful for travel suggestions
   */
  static async getNearbyLocations(locationId, db) {
    // Get the reference location
    const refResult = await db.query(
      'SELECT region FROM map_nodes WHERE id = $1',
      [locationId]
    );

    if (refResult.rows.length === 0) {
      throw new Error('Location not found');
    }

    const region = refResult.rows[0].region;

    // Get other locations in same or adjacent regions
    const result = await db.query(
      `SELECT * FROM map_nodes 
       WHERE id != $1 AND region = $2
       ORDER BY node_type DESC, name
       LIMIT 10`,
      [locationId, region]
    );

    return result.rows;
  }

  /**
   * Get location by key (for seeding/testing)
   */
  static async getLocationByKey(nodeKey, db) {
    const result = await db.query(
      'SELECT * FROM map_nodes WHERE node_key = $1',
      [nodeKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get travel information for route planning
   * Shows optimal path between locations
   */
  static async calculateOptimalRoute(startLocationId, endLocationId, db) {
    // Simplified version: direct route
    // In production, could implement Dijkstra's algorithm for true optimal path
    
    const startResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [startLocationId]
    );

    const endResult = await db.query(
      'SELECT * FROM map_nodes WHERE id = $1',
      [endLocationId]
    );

    if (startResult.rows.length === 0 || endResult.rows.length === 0) {
      throw new Error('Location not found');
    }

    return {
      start: startResult.rows[0],
      end: endResult.rows[0],
      path: [startResult.rows[0], endResult.rows[0]],
      is_direct: true,
      waypoints: []
    };
  }
}

module.exports = MapService;
