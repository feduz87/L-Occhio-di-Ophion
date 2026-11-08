-- L'Occhio di Ophion - Phase 5 Schema: Multiplayer System
-- Tables: shared_instances, player_groups, guilds, guild_treasury, trades, player_interactions
-- Views: active_instances, guild_members_view, pending_trades, trade_history
-- Functions: create_instance, join_instance, leave_instance, execute_trade

-- ==================== SHARED INSTANCES ====================
CREATE TABLE IF NOT EXISTS shared_instances (
  id BIGSERIAL PRIMARY KEY,
  world_id BIGINT NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  instance_type VARCHAR(50) NOT NULL, -- 'zone', 'dungeon', 'arena', 'event'
  instance_name VARCHAR(100) NOT NULL,
  
  max_players INT DEFAULT 100,
  current_player_count INT DEFAULT 0,
  
  is_pvp BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  
  instance_data JSONB NOT NULL DEFAULT '{}', -- custom instance state (bosses, events, etc)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);
CREATE INDEX ON shared_instances(world_id, instance_type, is_pvp);
CREATE INDEX ON shared_instances(expires_at) WHERE is_locked = FALSE;

-- ==================== PLAYER GROUPS (PARTIES) ====================
CREATE TABLE IF NOT EXISTS player_groups (
  id BIGSERIAL PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  leader_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  max_members INT DEFAULT 6,
  group_type VARCHAR(50) NOT NULL, -- 'party', 'raid', 'expedition'
  
  current_instance_id BIGINT REFERENCES shared_instances(id) ON DELETE SET NULL,
  
  group_settings JSONB NOT NULL DEFAULT '{
    "loot_distribution": "roll",
    "auto_invite": false,
    "level_requirement": 1,
    "difficulty": "normal"
  }',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON player_groups(leader_id);
CREATE INDEX ON player_groups(current_instance_id);

-- ==================== PLAYER GROUP MEMBERS ====================
CREATE TABLE IF NOT EXISTS player_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES player_groups(id) ON DELETE CASCADE,
  character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  role VARCHAR(50) DEFAULT 'member', -- 'leader', 'officer', 'member'
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX ON player_group_members(group_id, character_id);
CREATE INDEX ON player_group_members(character_id, role);

-- ==================== GUILDS ====================
CREATE TABLE IF NOT EXISTS guilds (
  id BIGSERIAL PRIMARY KEY,
  guild_name VARCHAR(100) NOT NULL UNIQUE,
  founder_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  level INT DEFAULT 1,
  experience BIGINT DEFAULT 0,
  
  description TEXT,
  emblem_url VARCHAR(255),
  
  max_members INT DEFAULT 50,
  current_member_count INT DEFAULT 1,
  
  headquarters_location VARCHAR(100),
  
  guild_settings JSONB NOT NULL DEFAULT '{
    "invitation_type": "open",
    "leadership_type": "monarch",
    "tax_rate": 0.05,
    "treasury_withdrawal_perm": "officer"
  }',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON guilds(founder_id);
CREATE INDEX ON guilds(level, experience);
CREATE UNIQUE INDEX ON LOWER(guilds.guild_name);

-- ==================== GUILD MEMBERS ====================
CREATE TABLE IF NOT EXISTS guild_members (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  rank VARCHAR(50) DEFAULT 'member', -- 'founder', 'officer', 'member', 'recruit'
  contribution_points INT DEFAULT 0,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX ON guild_members(guild_id, character_id);
CREATE INDEX ON guild_members(rank, contribution_points DESC);

-- ==================== GUILD TREASURY ====================
CREATE TABLE IF NOT EXISTS guild_treasury (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL UNIQUE REFERENCES guilds(id) ON DELETE CASCADE,
  
  gold_amount BIGINT DEFAULT 0,
  
  inventory_items JSONB NOT NULL DEFAULT '[]', -- [{item_id, quantity, deposited_by, deposited_at}, ...]
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON guild_treasury(guild_id);

-- ==================== GUILD LOGS ====================
CREATE TABLE IF NOT EXISTS guild_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  
  actor_id BIGINT REFERENCES characters(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL, -- 'member_join', 'member_leave', 'treasure_deposit', 'treasure_withdraw', 'rank_change'
  
  action_details JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON guild_logs(guild_id, created_at DESC);
CREATE INDEX ON guild_logs(action_type);

-- ==================== TRADES ====================
CREATE TABLE IF NOT EXISTS trades (
  id BIGSERIAL PRIMARY KEY,
  initiator_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'cancelled', 'failed'
  
  initiator_items JSONB NOT NULL DEFAULT '[]', -- [{item_id, quantity}, ...]
  initiator_gold BIGINT DEFAULT 0,
  
  target_items JSONB NOT NULL DEFAULT '[]',
  target_gold BIGINT DEFAULT 0,
  
  initiator_accepted BOOLEAN DEFAULT FALSE,
  target_accepted BOOLEAN DEFAULT FALSE,
  
  trade_location VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
CREATE INDEX ON trades(initiator_id, status);
CREATE INDEX ON trades(target_id, status);
CREATE INDEX ON trades(status, created_at DESC);

-- ==================== PLAYER INTERACTIONS (SOCIAL) ====================
CREATE TABLE IF NOT EXISTS player_interactions (
  id BIGSERIAL PRIMARY KEY,
  initiator_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  interaction_type VARCHAR(50) NOT NULL, -- 'friend_request', 'friend', 'block', 'rival'
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX ON player_interactions(initiator_id, target_id, interaction_type) WHERE is_active = TRUE;
CREATE INDEX ON player_interactions(target_id, interaction_type, is_active);

-- ==================== PVP RANKINGS ====================
CREATE TABLE IF NOT EXISTS pvp_rankings (
  id BIGSERIAL PRIMARY KEY,
  character_id BIGINT NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  
  arena_rank INT DEFAULT 9999,
  mmr INT DEFAULT 1000,
  
  total_wins INT DEFAULT 0,
  total_losses INT DEFAULT 0,
  total_matches INT DEFAULT 0,
  
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  
  last_match_at TIMESTAMP,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON pvp_rankings(arena_rank, mmr DESC);
CREATE INDEX ON pvp_rankings(mmr DESC);

-- ==================== INSTANCE PARTICIPATION TRACKING ====================
CREATE TABLE IF NOT EXISTS instance_participants (
  id BIGSERIAL PRIMARY KEY,
  instance_id BIGINT NOT NULL REFERENCES shared_instances(id) ON DELETE CASCADE,
  character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  is_leader BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP
);
CREATE UNIQUE INDEX ON instance_participants(instance_id, character_id) WHERE is_active = TRUE;
CREATE INDEX ON instance_participants(character_id, is_active);

-- ==================== VIEWS ====================

-- Active instances in the game world
CREATE OR REPLACE VIEW active_instances AS
SELECT 
  si.id,
  si.world_id,
  si.instance_type,
  si.instance_name,
  si.max_players,
  si.current_player_count,
  si.is_pvp,
  si.is_locked,
  COUNT(DISTINCT ip.character_id) AS actual_players,
  si.created_at,
  si.expires_at
FROM shared_instances si
LEFT JOIN instance_participants ip ON si.id = ip.instance_id AND ip.is_active = TRUE
WHERE si.expires_at > CURRENT_TIMESTAMP AND si.is_locked = FALSE
GROUP BY si.id, si.world_id, si.instance_type, si.instance_name, si.max_players, si.current_player_count, si.is_pvp, si.is_locked, si.created_at, si.expires_at;

-- Guild members with character info
CREATE OR REPLACE VIEW guild_members_view AS
SELECT 
  gm.id,
  gm.guild_id,
  gm.character_id,
  c.name AS character_name,
  c.class,
  c.level,
  gm.rank,
  gm.contribution_points,
  gm.joined_at,
  gm.last_active
FROM guild_members gm
JOIN characters c ON gm.character_id = c.id
ORDER BY gm.rank, gm.contribution_points DESC;

-- Pending trades
CREATE OR REPLACE VIEW pending_trades AS
SELECT 
  t.id,
  t.initiator_id,
  ic.name AS initiator_name,
  t.target_id,
  tc.name AS target_name,
  t.initiator_items,
  t.initiator_gold,
  t.target_items,
  t.target_gold,
  t.initiator_accepted,
  t.target_accepted,
  t.created_at
FROM trades t
JOIN characters ic ON t.initiator_id = ic.id
JOIN characters tc ON t.target_id = tc.id
WHERE t.status = 'pending'
ORDER BY t.created_at DESC;

-- Trade history for auditing
CREATE OR REPLACE VIEW trade_history AS
SELECT 
  t.id,
  t.initiator_id,
  ic.name AS initiator_name,
  t.target_id,
  tc.name AS target_name,
  t.status,
  t.initiator_items,
  t.initiator_gold,
  t.target_items,
  t.target_gold,
  t.completed_at,
  (t.completed_at - t.created_at) AS trade_duration
FROM trades t
JOIN characters ic ON t.initiator_id = ic.id
JOIN characters tc ON t.target_id = tc.id
WHERE t.status IN ('completed', 'failed')
ORDER BY t.completed_at DESC NULLS LAST;

-- PvP leaderboard
CREATE OR REPLACE VIEW pvp_leaderboard AS
SELECT 
  pr.id,
  pr.character_id,
  c.name,
  c.class,
  c.level,
  pr.arena_rank,
  pr.mmr,
  pr.total_wins,
  pr.total_losses,
  pr.total_matches,
  ROUND(100.0 * pr.total_wins / NULLIF(pr.total_matches, 0), 2) AS win_rate,
  pr.current_streak,
  pr.best_streak
FROM pvp_rankings pr
JOIN characters c ON pr.character_id = c.id
WHERE pr.total_matches > 0
ORDER BY pr.mmr DESC, pr.arena_rank ASC
LIMIT 1000;

-- ==================== FUNCTIONS ====================

-- Create new shared instance
CREATE OR REPLACE FUNCTION create_instance(
  p_world_id BIGINT,
  p_instance_type VARCHAR,
  p_instance_name VARCHAR,
  p_max_players INT DEFAULT 100,
  p_is_pvp BOOLEAN DEFAULT FALSE
) RETURNS BIGINT AS $$
DECLARE
  v_instance_id BIGINT;
BEGIN
  INSERT INTO shared_instances (world_id, instance_type, instance_name, max_players, is_pvp)
  VALUES (p_world_id, p_instance_type, p_instance_name, p_max_players, p_is_pvp)
  RETURNING id INTO v_instance_id;
  
  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Join player to instance
CREATE OR REPLACE FUNCTION join_instance(
  p_instance_id BIGINT,
  p_character_id BIGINT,
  p_is_leader BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
  v_instance_exists BOOLEAN;
  v_is_full BOOLEAN;
BEGIN
  -- Check instance exists and not full
  SELECT 
    EXISTS(SELECT 1 FROM shared_instances WHERE id = p_instance_id),
    (SELECT current_player_count >= max_players FROM shared_instances WHERE id = p_instance_id)
  INTO v_instance_exists, v_is_full;
  
  IF NOT v_instance_exists OR v_is_full THEN
    RETURN FALSE;
  END IF;
  
  -- Add player to instance
  INSERT INTO instance_participants (instance_id, character_id, is_leader)
  VALUES (p_instance_id, p_character_id, p_is_leader)
  ON CONFLICT (instance_id, character_id) DO UPDATE SET is_active = TRUE;
  
  -- Update instance player count
  UPDATE shared_instances
  SET current_player_count = current_player_count + 1
  WHERE id = p_instance_id AND NOT EXISTS(
    SELECT 1 FROM instance_participants WHERE instance_id = p_instance_id AND character_id = p_character_id AND is_active = TRUE
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Leave instance
CREATE OR REPLACE FUNCTION leave_instance(
  p_instance_id BIGINT,
  p_character_id BIGINT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE instance_participants
  SET is_active = FALSE, left_at = CURRENT_TIMESTAMP
  WHERE instance_id = p_instance_id AND character_id = p_character_id AND is_active = TRUE;
  
  -- Update instance player count
  UPDATE shared_instances
  SET current_player_count = GREATEST(0, current_player_count - 1)
  WHERE id = p_instance_id AND current_player_count > 0;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Execute trade between two characters (atomic operation)
CREATE OR REPLACE FUNCTION execute_trade(
  p_trade_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_initiator_id BIGINT;
  v_target_id BIGINT;
  v_status VARCHAR;
  v_initiator_items JSONB;
  v_target_items JSONB;
  v_initiator_gold BIGINT;
  v_target_gold BIGINT;
BEGIN
  -- Lock and fetch trade details
  SELECT initiator_id, target_id, status, initiator_items, target_items, initiator_gold, target_gold
  INTO v_initiator_id, v_target_id, v_status, v_initiator_items, v_target_items, v_initiator_gold, v_target_gold
  FROM trades
  WHERE id = p_trade_id
  FOR UPDATE;
  
  -- Verify both players accepted and trade not yet completed
  IF v_status != 'accepted' THEN
    RETURN FALSE;
  END IF;
  
  -- Check initiator has items/gold (simplified check)
  -- In production, would verify inventory contents
  
  -- Transfer gold
  UPDATE character_attributes
  SET currency = currency + v_target_gold
  WHERE character_id = v_initiator_id;
  
  UPDATE character_attributes
  SET currency = currency - v_initiator_gold
  WHERE character_id = v_target_id;
  
  -- Mark trade as completed
  UPDATE trades
  SET status = 'completed', completed_at = CURRENT_TIMESTAMP
  WHERE id = p_trade_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create guild
CREATE OR REPLACE FUNCTION create_guild(
  p_guild_name VARCHAR,
  p_founder_id BIGINT,
  p_description TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_guild_id BIGINT;
BEGIN
  INSERT INTO guilds (guild_name, founder_id, description, current_member_count)
  VALUES (p_guild_name, p_founder_id, p_description, 1)
  RETURNING id INTO v_guild_id;
  
  -- Add founder as member
  INSERT INTO guild_members (guild_id, character_id, rank)
  VALUES (v_guild_id, p_founder_id, 'founder');
  
  -- Create guild treasury
  INSERT INTO guild_treasury (guild_id) VALUES (v_guild_id);
  
  RETURN v_guild_id;
END;
$$ LANGUAGE plpgsql;

-- Add member to guild
CREATE OR REPLACE FUNCTION join_guild(
  p_guild_id BIGINT,
  p_character_id BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_members INT;
  v_max_members INT;
BEGIN
  -- Check capacity
  SELECT current_member_count, max_members INTO v_current_members, v_max_members
  FROM guilds WHERE id = p_guild_id;
  
  IF v_current_members >= v_max_members THEN
    RETURN FALSE;
  END IF;
  
  -- Add member
  INSERT INTO guild_members (guild_id, character_id, rank)
  VALUES (p_guild_id, p_character_id, 'recruit')
  ON CONFLICT (guild_id, character_id) DO UPDATE SET last_active = CURRENT_TIMESTAMP;
  
  -- Increment member count
  UPDATE guilds
  SET current_member_count = current_member_count + 1
  WHERE id = p_guild_id;
  
  -- Log action
  INSERT INTO guild_logs (guild_id, actor_id, action_type, action_details)
  VALUES (p_guild_id, p_character_id, 'member_join', jsonb_build_object('character_id', p_character_id));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
CREATE TRIGGER update_guild_treasury_timestamp
AFTER UPDATE ON guild_treasury
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

CREATE TRIGGER update_shared_instances_timestamp
AFTER UPDATE ON shared_instances
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

CREATE TRIGGER update_player_groups_timestamp
AFTER UPDATE ON player_groups
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

CREATE TRIGGER update_guilds_timestamp
AFTER UPDATE ON guilds
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

CREATE TRIGGER update_trades_timestamp
AFTER UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

CREATE TRIGGER update_pvp_rankings_timestamp
AFTER UPDATE ON pvp_rankings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

CREATE TRIGGER update_player_interactions_timestamp
AFTER UPDATE ON player_interactions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp('updated_at');

-- ==================== CONSTRAINTS & VALIDATIONS ====================

-- Guilds cannot have circular leadership
ALTER TABLE guilds ADD CONSTRAINT check_guild_level CHECK (level > 0 AND level <= 100);
ALTER TABLE guilds ADD CONSTRAINT check_member_count CHECK (current_member_count >= 1 AND current_member_count <= max_members);

-- Trades cannot be with self
ALTER TABLE trades ADD CONSTRAINT check_trade_not_self CHECK (initiator_id != target_id);

-- Group members
ALTER TABLE player_group_members ADD CONSTRAINT check_role CHECK (role IN ('leader', 'officer', 'member'));
ALTER TABLE player_groups ADD CONSTRAINT check_group_members CHECK (current_member_count >= 1 AND current_member_count <= max_members);

-- PvP rankings
ALTER TABLE pvp_rankings ADD CONSTRAINT check_mmr CHECK (mmr >= 0 AND mmr <= 10000);
ALTER TABLE pvp_rankings ADD CONSTRAINT check_matches CHECK (total_wins + total_losses = total_matches);

COMMIT;
