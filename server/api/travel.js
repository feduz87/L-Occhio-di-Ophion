/**
 * Travel API Routes
 * 
 * Endpoints for:
 * - Initiating and completing travel
 * - Resting and recovering health
 * - Tracking travel history
 * - Checking current status
 */

import express from 'express';
import TravelService from '../services/travel.js';
import MapService from '../services/map.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/travel/initiate
 * Start travel from character's current location to destination
 * 
 * Body:
 * - character_id: Character initiating travel
 * - destination_id: Target location ID
 * 
 * Response: Travel details, cost deducted, encounter info
 */
router.post('/initiate', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { character_id, destination_id } = req.body;

  if (!character_id || !destination_id) {
    throw new AppError('character_id and destination_id required', 400);
  }

  // Verify character belongs to user
  const charResult = await req.db.query(
    'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
    [character_id, req.user.id]
  );

  if (charResult.rows.length === 0) {
    throw new AppError('Character not found or does not belong to user', 403);
  }

  const travel = await TravelService.initiateTravel(character_id, destination_id, req.db);

  res.status(201).json({
    success: true,
    data: travel
  });
}));

/**
 * GET /api/travel/:travel_id
 * Get details about a specific travel instance
 * 
 * Response: Travel log details
 */
router.get('/:travel_id', asyncHandler(async (req, res) => {
  const { travel_id } = req.params;

  const result = await req.db.query(
    `SELECT tl.*, m1.name as origin_name, m2.name as destination_name
     FROM travel_log tl
     JOIN map_nodes m1 ON tl.origin_node_id = m1.id
     JOIN map_nodes m2 ON tl.destination_node_id = m2.id
     WHERE tl.id = $1`,
    [travel_id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Travel not found', 404);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
}));

/**
 * GET /api/travel/character/:character_id/current
 * Get current travel status for a character
 * 
 * Returns current location and any active travel
 */
router.get('/character/:character_id/current', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { character_id } = req.params;

  // Verify character belongs to user
  const charResult = await req.db.query(
    'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
    [character_id, req.user.id]
  );

  if (charResult.rows.length === 0) {
    throw new AppError('Character not found', 403);
  }

  const status = await TravelService.getTravelStatus(character_id, req.db);

  res.json({
    success: true,
    data: status
  });
}));

/**
 * GET /api/travel/character/:character_id/history
 * Get travel history for a character
 * 
 * Query Parameters:
 * - limit: Maximum number of records (default 20, max 100)
 * 
 * Response: Array of travel log entries
 */
router.get('/character/:character_id/history', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { character_id } = req.params;
  const { limit = 20 } = req.query;

  // Verify character belongs to user
  const charResult = await req.db.query(
    'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
    [character_id, req.user.id]
  );

  if (charResult.rows.length === 0) {
    throw new AppError('Character not found', 403);
  }

  const safeLimit = Math.min(parseInt(limit), 100);
  const history = await TravelService.getTravelHistory(character_id, safeLimit, req.db);

  res.json({
    success: true,
    count: history.length,
    data: history
  });
}));

/**
 * GET /api/travel/character/:character_id/discovered
 * Get all locations discovered by character
 * 
 * Response: Array of discovered locations
 */
router.get('/character/:character_id/discovered', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { character_id } = req.params;

  // Verify character belongs to user
  const charResult = await req.db.query(
    'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
    [character_id, req.user.id]
  );

  if (charResult.rows.length === 0) {
    throw new AppError('Character not found', 403);
  }

  const locations = await TravelService.getDiscoveredLocations(character_id, req.db);

  res.json({
    success: true,
    count: locations.length,
    locations: locations
  });
}));

/**
 * POST /api/travel/rest
 * Rest at current location to recover health
 * 
 * Body:
 * - character_id: Character resting
 * - hours: Hours of rest (typically 8 for full rest)
 * 
 * Response: Health recovered, resources spent
 */
router.post('/rest', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { character_id, hours = 8 } = req.body;

  if (!character_id) {
    throw new AppError('character_id required', 400);
  }

  // Verify character belongs to user
  const charResult = await req.db.query(
    'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
    [character_id, req.user.id]
  );

  if (charResult.rows.length === 0) {
    throw new AppError('Character not found', 403);
  }

  // Get current location
  const locResult = await req.db.query(
    `SELECT cl.current_node_id, m.name
     FROM character_locations cl
     JOIN map_nodes m ON cl.current_node_id = m.id
     WHERE cl.character_id = $1`,
    [character_id]
  );

  if (locResult.rows.length === 0) {
    throw new AppError('Character location not found', 404);
  }

  const location = locResult.rows[0];

  const result = await TravelService.restAtLocation(character_id, location, hours, req.db);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/travel/info
 * Get travel information between two locations
 * 
 * Query Parameters:
 * - from: Origin location ID
 * - to: Destination location ID
 * - party_size: Party size (default 1)
 * 
 * Response: Travel cost, time, risk, distance
 */
router.get('/info', asyncHandler(async (req, res) => {
  const { from, to, party_size = 1 } = req.query;

  if (!from || !to) {
    throw new AppError('from and to parameters required', 400);
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
 * GET /api/travel/costs/calculator
 * Calculate travel costs for various routes
 * 
 * Useful for UI route planning
 * 
 * Query Parameters:
 * - origin_id: Starting location
 * - party_size: Party size
 * 
 * Response: Cost matrix for travel to nearby locations
 */
router.get('/costs/calculator', asyncHandler(async (req, res) => {
  const { origin_id, party_size = 1 } = req.query;

  if (!origin_id) {
    throw new AppError('origin_id required', 400);
  }

  // Get origin location
  const originResult = await req.db.query(
    'SELECT * FROM map_nodes WHERE id = $1',
    [origin_id]
  );

  if (originResult.rows.length === 0) {
    throw new AppError('Origin location not found', 404);
  }

  const origin = originResult.rows[0];

  // Get all nearby locations
  const nearby = await req.db.query(
    `SELECT * FROM map_nodes WHERE id != $1 ORDER BY region`,
    [origin_id]
  );

  // Calculate costs to each location
  const routes = nearby.rows.map(dest => {
    const costs = TravelService.calculateTravelCost(origin, dest, parseInt(party_size));
    return {
      destination: {
        id: dest.id,
        name: dest.name,
        type: dest.node_type,
        region: dest.region,
        danger: dest.danger_level
      },
      cost: costs
    };
  });

  res.json({
    success: true,
    origin: {
      id: origin.id,
      name: origin.name
    },
    party_size: parseInt(party_size),
    routes: routes
  });
}));

/**
 * GET /api/travel/statistics
 * Get overall travel statistics
 * 
 * Response: Total journeys, most visited locations, etc
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const result = await req.db.query(
    `SELECT 
       COUNT(*) as total_journeys,
       COUNT(DISTINCT origin_node_id) as unique_origins,
       COUNT(DISTINCT destination_node_id) as unique_destinations,
       SUM(cost_gold) as total_gold_spent,
       SUM(cost_rations) as total_rations_spent,
       AVG(duration_hours) as average_travel_time,
       SUM(CASE WHEN encounter_triggered THEN 1 ELSE 0 END) as encounters_experienced
     FROM travel_log
     WHERE character_id IN (SELECT id FROM characters WHERE user_id = $1)`,
    [req.user.id]
  );

  const stats = result.rows[0];

  res.json({
    success: true,
    stats: {
      total_journeys: parseInt(stats.total_journeys) || 0,
      unique_origins: parseInt(stats.unique_origins) || 0,
      unique_destinations: parseInt(stats.unique_destinations) || 0,
      total_gold_spent: parseInt(stats.total_gold_spent) || 0,
      total_rations_spent: parseInt(stats.total_rations_spent) || 0,
      average_travel_time: parseFloat(stats.average_travel_time || 0).toFixed(1),
      encounters_experienced: parseInt(stats.encounters_experienced) || 0
    }
  });
}));

export default router;
