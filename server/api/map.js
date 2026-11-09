/**
 * Map API Routes
 * 
 * Endpoints for:
 * - Discovering and querying locations
 * - Getting location details (hotspots, containers)
 * - Tracking discovered locations
 */

import express from 'express';
import MapService from '../services/map.js';
import TravelService from '../services/travel.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/map/nodes
 * Get all available locations (optionally filtered)
 * 
 * Query Parameters:
 * - region: Filter by region (e.g., "Coast", "Mountain")
 * - node_type: Filter by type (e.g., "settlement", "dungeon", "wilderness")
 * - min_danger: Minimum danger level (1-10)
 * - max_danger: Maximum danger level (1-10)
 * 
 * Response: Array of map nodes
 */
router.get('/nodes', asyncHandler(async (req, res) => {
  const { region, node_type, min_danger, max_danger } = req.query;

  const filter = {};
  if (region) filter.region = region;
  if (node_type) filter.node_type = node_type;
  if (min_danger) filter.min_danger = parseInt(min_danger);
  if (max_danger) filter.max_danger = parseInt(max_danger);

  const locations = await MapService.getAllLocations(filter, req.db);

  res.json({
    success: true,
    count: locations.length,
    locations: locations
  });
}));

/**
 * GET /api/map/nodes/:id
 * Get detailed information about a specific location
 * 
 * Includes:
 * - Location metadata
 * - Hotspots (NPCs, environmental features)
 * - Loot containers
 * - Statistics
 * 
 * Response: Location details object
 */
router.get('/nodes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const characterId = req.user?.id; // Optional, for discovery tracking

  const details = await MapService.getLocationDetails(id, characterId, req.db);

  res.json({
    success: true,
    data: details
  });
}));

/**
 * GET /api/map/nodes/:id/hotspots
 * Get all hotspots (NPCs, items, environmental features) in a location
 * 
 * Response: Array of hotspots with details
 */
router.get('/nodes/:id/hotspots', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hotspots = await MapService.getLocationHotspots(id, req.db);

  res.json({
    success: true,
    count: hotspots.length,
    hotspots: hotspots
  });
}));

/**
 * GET /api/map/nodes/:id/npcs
 * Get all NPCs in a location
 * 
 * Response: Array of NPCs with details
 */
router.get('/nodes/:id/npcs', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const npcs = await MapService.getLocationNPCs(id, req.db);

  res.json({
    success: true,
    count: npcs.length,
    npcs: npcs
  });
}));

/**
 * GET /api/map/nodes/:id/containers
 * Get all loot containers in a location
 * 
 * Response: Array of containers (chests, corpses, etc)
 */
router.get('/nodes/:id/containers', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const details = await MapService.getLocationDetails(id, null, req.db);

  res.json({
    success: true,
    count: details.containers.length,
    containers: details.containers
  });
}));

/**
 * GET /api/map/nodes/:id/stats
 * Get statistics about a location (visitors, discovery rate)
 * 
 * Response: Stats object
 */
router.get('/nodes/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const stats = await MapService.getLocationStats(id, req.db);

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/map/nodes/:id/nearby
 * Get nearby locations for travel suggestions
 * 
 * Response: Array of nearby locations
 */
router.get('/nodes/:id/nearby', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const nearby = await MapService.getNearbyLocations(id, req.db);

  res.json({
    success: true,
    count: nearby.length,
    nearby: nearby
  });
}));

/**
 * GET /api/map/nodes/by-key/:key
 * Get location by node key (internal identifier)
 * 
 * Response: Location object
 */
router.get('/nodes/by-key/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;

  const location = await MapService.getLocationByKey(key, req.db);

  if (!location) {
    throw new AppError('Location not found', 404);
  }

  res.json({
    success: true,
    data: location
  });
}));

/**
 * GET /api/map/travel-info
 * Get travel information between two locations
 * 
 * Query Parameters:
 * - from: Origin location ID
 * - to: Destination location ID
 * - party_size: Number of party members (default 1)
 * 
 * Response: Travel cost, time, risk assessment
 */
router.get('/travel-info', asyncHandler(async (req, res) => {
  const { from, to, party_size = 1 } = req.query;

  if (!from || !to) {
    throw new AppError('Missing from/to parameters', 400);
  }

  const travelInfo = await TravelService.getTravelInfo(
    from,
    to,
    parseInt(party_size),
    req.db
  );

  res.json({
    success: true,
    data: travelInfo
  });
}));

/**
 * POST /api/map/discover
 * Mark a location as discovered for current user
 * 
 * Body: { location_id }
 * 
 * Response: Discovery result
 */
router.post('/discover', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { location_id } = req.body;

  if (!location_id) {
    throw new AppError('location_id required', 400);
  }

  const result = await MapService.discoverLocation(req.user.id, location_id, req.db);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/map/discovered
 * Get all locations discovered by current user
 * 
 * Response: Array of discovered locations
 */
router.get('/discovered', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const locations = await MapService.getDiscoveredLocations(req.user.id, req.db);

  res.json({
    success: true,
    count: locations.length,
    locations: locations
  });
}));

/**
 * GET /api/map/regions
 * Get all available regions
 * 
 * Response: Array of unique regions
 */
router.get('/regions', asyncHandler(async (req, res) => {
  const result = await req.db.query(
    `SELECT DISTINCT region FROM map_nodes ORDER BY region`
  );

  res.json({
    success: true,
    regions: result.rows.map(r => r.region)
  });
}));

/**
 * GET /api/map/summary
 * Get overview statistics of the world
 * 
 * Response: World stats (total locations, by type, etc)
 */
router.get('/summary', asyncHandler(async (req, res) => {
  const result = await req.db.query(
    `SELECT 
       COUNT(*) as total_locations,
       COUNT(CASE WHEN node_type = 'settlement' THEN 1 END) as settlements,
       COUNT(CASE WHEN node_type = 'dungeon' THEN 1 END) as dungeons,
       COUNT(CASE WHEN node_type = 'wilderness' THEN 1 END) as wilderness,
       AVG(danger_level) as average_danger,
       COUNT(DISTINCT region) as regions
     FROM map_nodes`
  );

  const stats = result.rows[0];

  res.json({
    success: true,
    stats: {
      total_locations: parseInt(stats.total_locations),
      by_type: {
        settlements: parseInt(stats.settlements),
        dungeons: parseInt(stats.dungeons),
        wilderness: parseInt(stats.wilderness)
      },
      average_danger: parseFloat(stats.average_danger || 0).toFixed(1),
      unique_regions: parseInt(stats.regions)
    }
  });
}));

export default router;
