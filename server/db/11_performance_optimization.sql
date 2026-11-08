-- L'Occhio di Ophion - Performance Optimization
-- Indexes, query tuning, and performance enhancements

-- ==================== CRITICAL INDEXES ====================

-- Character lookups
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_class_level ON characters(class, level DESC);
CREATE INDEX IF NOT EXISTS idx_characters_is_online ON characters(is_online) WHERE is_online = TRUE;

-- Inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_character_id ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON inventory(item_type) INCLUDE (character_id, quantity);

-- Quest system
CREATE INDEX IF NOT EXISTS idx_quests_character_id ON quests(character_id);
CREATE INDEX IF NOT EXISTS idx_quests_status_created ON quests(character_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest_id ON quest_objectives(quest_id);
CREATE INDEX IF NOT EXISTS idx_npc_quest_hooks_npc_id ON npc_quest_hooks(npc_id);

-- Combat system
CREATE INDEX IF NOT EXISTS idx_combat_encounters_character_id ON combat_encounters(character_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_status ON combat_encounters(status) INCLUDE (character_id, created_at);
CREATE INDEX IF NOT EXISTS idx_combat_actions_encounter_id ON combat_actions(encounter_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_enemies_level ON enemies(level) INCLUDE (difficulty, loot_tier);

-- Checkpoints & save system
CREATE INDEX IF NOT EXISTS idx_checkpoints_character_id ON checkpoints(character_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_is_active ON checkpoints(character_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_data_checksum ON checkpoint_data(checksum);

-- Multiplayer system
CREATE INDEX IF NOT EXISTS idx_shared_instances_world_type ON shared_instances(world_id, instance_type);
CREATE INDEX IF NOT EXISTS idx_shared_instances_expiry ON shared_instances(expires_at) WHERE is_locked = FALSE;
CREATE INDEX IF NOT EXISTS idx_player_groups_leader ON player_groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_guilds_name_lower ON guilds(LOWER(guild_name));
CREATE INDEX IF NOT EXISTS idx_guild_members_rank ON guild_members(guild_id, rank) INCLUDE (character_id, contribution_points);
CREATE INDEX IF NOT EXISTS idx_trades_status_created ON trades(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_rankings_mmr ON pvp_rankings(mmr DESC, arena_rank ASC);

-- NPC & Travel
CREATE INDEX IF NOT EXISTS idx_npcs_location ON npcs(location_id);
CREATE INDEX IF NOT EXISTS idx_affinity_character_npc ON npc_affinity(character_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_travel_routes_from_to ON travel_routes(from_location, to_location);

-- Session tracking
CREATE INDEX IF NOT EXISTS idx_character_attributes_character_id ON character_attributes(character_id) WHERE character_id IS NOT NULL;

-- ==================== COMPOSITE INDEXES ====================

-- Hot path: Character progression
CREATE INDEX IF NOT EXISTS idx_character_progression ON characters(user_id, class, level, experience DESC);

-- Hot path: Quest completion
CREATE INDEX IF NOT EXISTS idx_quest_completion ON quests(character_id, quest_id, status) INCLUDE (completed_at, rewards);

-- Hot path: Combat resolution
CREATE INDEX IF NOT EXISTS idx_combat_resolution ON combat_encounters(character_id, status, created_at DESC) INCLUDE (enemy_ids, outcome);

-- Hot path: Multiplayer discovery
CREATE INDEX IF NOT EXISTS idx_instance_discovery ON shared_instances(world_id, instance_type, is_pvp) INCLUDE (current_player_count, max_players);

-- Hot path: Guild operations
CREATE INDEX IF NOT EXISTS idx_guild_operations ON guild_members(guild_id, character_id, rank);

-- ==================== PARTIAL INDEXES ====================

-- Active characters only
CREATE INDEX IF NOT EXISTS idx_active_characters ON characters(level DESC, experience DESC) WHERE is_online = TRUE;

-- Pending trades only
CREATE INDEX IF NOT EXISTS idx_pending_trades_initiator ON trades(initiator_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_trades_target ON trades(target_id) WHERE status = 'pending';

-- Active instances only
CREATE INDEX IF NOT EXISTS idx_active_instances_filtered ON shared_instances(world_id, instance_type) 
  WHERE expires_at > CURRENT_TIMESTAMP AND is_locked = FALSE;

-- Recent checkpoints
CREATE INDEX IF NOT EXISTS idx_recent_checkpoints ON checkpoints(character_id, created_at DESC) 
  WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ==================== QUERY OPTIMIZATION ====================

-- Analyze tables to update statistics
ANALYZE characters;
ANALYZE inventory;
ANALYZE quests;
ANALYZE combat_encounters;
ANALYZE combat_actions;
ANALYZE checkpoints;
ANALYZE guilds;
ANALYZE guild_members;
ANALYZE trades;
ANALYZE pvp_rankings;
ANALYZE npcs;
ANALYZE npc_affinity;
ANALYZE player_groups;
ANALYZE shared_instances;

-- ==================== MATERIALIZED VIEWS FOR CACHING ====================

-- Character stats (refresh every 60 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_character_stats AS
SELECT 
  c.id,
  c.name,
  c.class,
  c.level,
  c.experience,
  ca.health,
  ca.mana,
  ca.armor_class,
  ca.currency,
  COUNT(DISTINCT i.id) as inventory_count,
  COUNT(DISTINCT q.id) as active_quests,
  AVG(na.affinity) as avg_npc_affinity
FROM characters c
LEFT JOIN character_attributes ca ON c.id = ca.character_id
LEFT JOIN inventory i ON c.id = i.character_id
LEFT JOIN quests q ON c.id = q.character_id AND q.status IN ('active', 'in_progress')
LEFT JOIN npc_affinity na ON c.id = na.character_id
GROUP BY c.id, c.name, c.class, c.level, c.experience, ca.health, ca.mana, ca.armor_class, ca.currency;

CREATE INDEX ON mv_character_stats(level DESC, experience DESC);
CREATE INDEX ON mv_character_stats(class);

-- Guild stats (refresh every 60 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_guild_stats AS
SELECT 
  g.id,
  g.guild_name,
  g.level,
  g.experience,
  COUNT(gm.id) as member_count,
  gt.gold_amount as treasury_gold,
  COUNT(DISTINCT gl.id) as total_actions,
  MAX(gl.created_at) as last_activity
FROM guilds g
LEFT JOIN guild_members gm ON g.id = gm.guild_id
LEFT JOIN guild_treasury gt ON g.id = gt.guild_id
LEFT JOIN guild_logs gl ON g.id = gl.guild_id
GROUP BY g.id, g.guild_name, g.level, g.experience, gt.gold_amount;

CREATE INDEX ON mv_guild_stats(level DESC, member_count DESC);

-- Combat statistics (refresh every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_combat_stats AS
SELECT 
  c.id,
  c.name,
  COUNT(DISTINCT ce.id) as total_combats,
  SUM(CASE WHEN ce.outcome = 'victory' THEN 1 ELSE 0 END) as wins,
  SUM(CASE WHEN ce.outcome = 'defeat' THEN 1 ELSE 0 END) as losses,
  ROUND(100.0 * SUM(CASE WHEN ce.outcome = 'victory' THEN 1 ELSE 0 END) / 
        NULLIF(COUNT(DISTINCT ce.id), 0), 2) as win_rate,
  AVG(ca.damage_dealt) as avg_damage,
  MAX(ca.damage_dealt) as max_damage
FROM characters c
LEFT JOIN combat_encounters ce ON c.id = ce.character_id
LEFT JOIN combat_actions ca ON ce.id = ca.encounter_id AND ca.actor_id = c.id
GROUP BY c.id, c.name;

CREATE INDEX ON mv_combat_stats(win_rate DESC, total_combats DESC);

-- ==================== PERFORMANCE MONITORING ====================

-- View for slow queries
CREATE VIEW IF NOT EXISTS v_slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time,
  ROUND(100.0 * total_time / SUM(total_time) OVER (), 2) as pct_total
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_time DESC
LIMIT 50;

-- ==================== CONNECTION POOLING CONFIG ====================

-- Recommended PostgreSQL settings in postgresql.conf:
-- max_connections = 200
-- shared_buffers = 256MB (25% of RAM)
-- effective_cache_size = 1GB (50% of RAM)
-- work_mem = 10MB
-- maintenance_work_mem = 64MB
-- random_page_cost = 1.1 (for SSD)
-- effective_io_concurrency = 200 (for SSD)

-- ==================== TABLE MAINTENANCE ====================

-- Vacuum analyze (run weekly)
-- VACUUM ANALYZE;

-- Reindex (run monthly)
-- REINDEX INDEX CONCURRENTLY idx_characters_user_id;

-- ==================== EXPLAIN PLAN EXAMPLES ====================

-- Character lookup (should use index)
-- EXPLAIN ANALYZE SELECT * FROM characters WHERE user_id = 1;

-- Quest query (should use composite index)
-- EXPLAIN ANALYZE 
-- SELECT * FROM quests 
-- WHERE character_id = 1 AND status IN ('active', 'in_progress')
-- ORDER BY created_at DESC;

-- Combat resolution (should use multiple indexes)
-- EXPLAIN ANALYZE
-- SELECT ce.*, COUNT(ca.id) as action_count
-- FROM combat_encounters ce
-- LEFT JOIN combat_actions ca ON ce.id = ca.encounter_id
-- WHERE ce.character_id = 1 AND ce.status = 'active'
-- GROUP BY ce.id
-- ORDER BY ce.created_at DESC;

-- ==================== GRANT PERMISSIONS ====================

-- Create read-only user for monitoring
-- CREATE USER app_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE ophion TO app_readonly;
-- GRANT USAGE ON SCHEMA public TO app_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- Create application user with limited permissions
-- CREATE USER app_user WITH PASSWORD 'app_password';
-- GRANT CONNECT ON DATABASE ophion TO app_user;
-- GRANT USAGE ON SCHEMA public TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ==================== COMPLETION ====================

COMMIT;

-- Run this script with:
-- psql -U postgres -d ophion -f 11_performance_optimization.sql

-- Verify indexes:
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- Check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
