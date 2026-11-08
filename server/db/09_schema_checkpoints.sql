/**
 * Phase 4: Checkpoint & Save System Schema
 * 
 * Tables:
 * - checkpoints: Checkpoint metadata
 * - checkpoint_data: Full character state snapshots
 * - save_backups: Cloud storage references
 * 
 * Views:
 * - active_checkpoints: Recent checkpoints per character
 * - checkpoint_timeline: Historical checkpoints
 * 
 * Functions:
 * - create_checkpoint: Create new checkpoint
 * - load_checkpoint: Restore from checkpoint
 */

-- ============================================================================
-- CHECKPOINTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  checkpoint_type VARCHAR(50) NOT NULL CHECK (checkpoint_type IN ('auto', 'manual', 'combat', 'post-quest')),
  description TEXT,
  
  is_active BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP,
  expires_at TIMESTAMP,
  
  CONSTRAINT valid_checkpoint_time CHECK (created_at <= last_accessed OR last_accessed IS NULL)
);

CREATE INDEX idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX idx_checkpoints_character_id ON checkpoints(character_id);
CREATE INDEX idx_checkpoints_created_at ON checkpoints(created_at DESC);
CREATE INDEX idx_checkpoints_is_active ON checkpoints(is_active);

-- ============================================================================
-- CHECKPOINT DATA TABLE (Full State Snapshot)
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  
  -- Full character state as JSON
  character_json JSONB NOT NULL,
  
  -- Inventory items
  inventory_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- In-combat state (if applicable)
  combat_state_json JSONB DEFAULT NULL,
  
  -- Quest progress snapshot
  quests_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- NPC affinity snapshot
  npc_affinity_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  state_size_bytes INTEGER,
  checksum TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_checksum_length CHECK (LENGTH(checksum) = 64)  -- SHA-256 hex
);

CREATE INDEX idx_checkpoint_data_checkpoint_id ON checkpoint_data(checkpoint_id);
CREATE INDEX idx_checkpoint_data_created_at ON checkpoint_data(created_at DESC);

-- ============================================================================
-- SAVE BACKUPS TABLE (Cloud Storage Metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS save_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  
  -- Cloud storage provider
  cloud_provider VARCHAR(50) NOT NULL CHECK (cloud_provider IN ('gcs', 'aws', 's3', 'azure')),
  
  -- Cloud reference ID
  cloud_id TEXT NOT NULL,
  backup_url TEXT,
  
  -- Metadata
  backup_size_bytes INTEGER,
  backup_checksum TEXT,
  
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'syncing')),
  last_sync_at TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_cloud_id CHECK (LENGTH(cloud_id) > 0)
);

CREATE INDEX idx_save_backups_checkpoint_id ON save_backups(checkpoint_id);
CREATE INDEX idx_save_backups_cloud_provider ON save_backups(cloud_provider);
CREATE INDEX idx_save_backups_sync_status ON save_backups(sync_status);

-- ============================================================================
-- AUTO-SAVE CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_save_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  
  -- Auto-save triggers
  save_on_quest_complete BOOLEAN DEFAULT TRUE,
  save_on_combat_victory BOOLEAN DEFAULT TRUE,
  save_on_level_up BOOLEAN DEFAULT TRUE,
  save_on_npc_affinity_milestone BOOLEAN DEFAULT FALSE,
  
  -- Checkpoint retention
  max_checkpoints INTEGER DEFAULT 20 CHECK (max_checkpoints > 0 AND max_checkpoints <= 100),
  auto_delete_older_than_days INTEGER DEFAULT 30,
  
  -- Cloud sync
  enable_cloud_sync BOOLEAN DEFAULT FALSE,
  cloud_provider VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auto_save_config_character_id ON auto_save_config(character_id);

-- ============================================================================
-- CHECKPOINT ROLLBACK HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoint_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  
  from_checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE SET NULL,
  to_checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE SET NULL,
  
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('user-initiated', 'conflict-resolution', 'timeout-recovery', 'manual-restore')),
  rollback_details JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkpoint_rollbacks_character_id ON checkpoint_rollbacks(character_id);
CREATE INDEX idx_checkpoint_rollbacks_created_at ON checkpoint_rollbacks(created_at DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Active Checkpoints (Recent per Character)
CREATE OR REPLACE VIEW active_checkpoints AS
SELECT 
  c.id,
  c.character_id,
  c.user_id,
  c.checkpoint_type,
  c.description,
  c.created_at,
  c.last_accessed,
  cd.state_size_bytes,
  CASE WHEN sb.id IS NOT NULL THEN sb.sync_status ELSE 'local' END as backup_status,
  ROW_NUMBER() OVER (PARTITION BY c.character_id ORDER BY c.created_at DESC) as checkpoint_rank
FROM checkpoints c
LEFT JOIN checkpoint_data cd ON c.id = cd.checkpoint_id
LEFT JOIN save_backups sb ON c.id = sb.checkpoint_id
WHERE c.is_active = TRUE
  OR c.created_at > NOW() - INTERVAL '30 days'
ORDER BY c.character_id, c.created_at DESC;

-- View: Checkpoint Timeline (Full History)
CREATE OR REPLACE VIEW checkpoint_timeline AS
SELECT 
  c.id,
  c.character_id,
  c.user_id,
  c.checkpoint_type,
  c.description,
  c.created_at,
  cd.state_size_bytes,
  sb.cloud_provider,
  sb.sync_status,
  LAG(c.created_at) OVER (PARTITION BY c.character_id ORDER BY c.created_at) as previous_checkpoint_time,
  EXTRACT(EPOCH FROM (c.created_at - LAG(c.created_at) OVER (PARTITION BY c.character_id ORDER BY c.created_at))) as seconds_since_last_checkpoint
FROM checkpoints c
LEFT JOIN checkpoint_data cd ON c.id = cd.checkpoint_id
LEFT JOIN save_backups sb ON c.id = sb.checkpoint_id
ORDER BY c.character_id, c.created_at DESC;

-- View: Cloud Sync Status
CREATE OR REPLACE VIEW cloud_sync_status AS
SELECT 
  c.character_id,
  c.user_id,
  COUNT(*) as total_checkpoints,
  COUNT(CASE WHEN sb.id IS NOT NULL THEN 1 END) as backed_up_checkpoints,
  COUNT(CASE WHEN sb.sync_status = 'synced' THEN 1 END) as fully_synced,
  COUNT(CASE WHEN sb.sync_status = 'failed' THEN 1 END) as failed_syncs,
  MAX(c.created_at) as latest_checkpoint,
  SUM(cd.state_size_bytes) as total_backup_size_bytes
FROM checkpoints c
LEFT JOIN checkpoint_data cd ON c.id = cd.checkpoint_id
LEFT JOIN save_backups sb ON c.id = sb.checkpoint_id
GROUP BY c.character_id, c.user_id;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Create Checkpoint
-- Creates full character state snapshot
CREATE OR REPLACE FUNCTION create_checkpoint(
  p_user_id UUID,
  p_character_id UUID,
  p_checkpoint_type VARCHAR,
  p_description TEXT,
  p_character_json JSONB,
  p_inventory_json JSONB DEFAULT '[]'::jsonb,
  p_combat_state_json JSONB DEFAULT NULL,
  p_quests_json JSONB DEFAULT '{}'::jsonb,
  p_npc_affinity_json JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_checkpoint_id UUID;
  v_checksum TEXT;
  v_state_size_bytes INTEGER;
BEGIN
  -- Validate user & character ownership
  PERFORM 1 FROM users u 
  WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  PERFORM 1 FROM characters c 
  WHERE c.id = p_character_id AND c.user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found or unauthorized: %', p_character_id;
  END IF;

  -- Create checkpoint record
  INSERT INTO checkpoints (user_id, character_id, checkpoint_type, description)
  VALUES (p_user_id, p_character_id, p_checkpoint_type, p_description)
  RETURNING id INTO v_checkpoint_id;

  -- Calculate checksum and size
  v_checksum := encode(digest(
    p_character_json::text ||
    p_inventory_json::text ||
    COALESCE(p_combat_state_json::text, '') ||
    p_quests_json::text ||
    p_npc_affinity_json::text,
    'sha256'
  ), 'hex');
  
  v_state_size_bytes := octet_length(
    p_character_json::text ||
    p_inventory_json::text ||
    COALESCE(p_combat_state_json::text, '') ||
    p_quests_json::text ||
    p_npc_affinity_json::text
  );

  -- Insert state snapshot
  INSERT INTO checkpoint_data (
    checkpoint_id,
    character_json,
    inventory_json,
    combat_state_json,
    quests_json,
    npc_affinity_json,
    checksum,
    state_size_bytes
  ) VALUES (
    v_checkpoint_id,
    p_character_json,
    p_inventory_json,
    p_combat_state_json,
    p_quests_json,
    p_npc_affinity_json,
    v_checksum,
    v_state_size_bytes
  );

  -- Clean up old checkpoints (keep max 20 by default)
  DELETE FROM checkpoints
  WHERE character_id = p_character_id
    AND id NOT IN (
      SELECT id FROM checkpoints
      WHERE character_id = p_character_id
      ORDER BY created_at DESC
      LIMIT 20
    )
    AND created_at < NOW() - INTERVAL '30 days';

  RETURN v_checkpoint_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Load Checkpoint
-- Restore full character state from checkpoint
CREATE OR REPLACE FUNCTION load_checkpoint(
  p_checkpoint_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  checkpoint_id UUID,
  character_json JSONB,
  inventory_json JSONB,
  combat_state_json JSONB,
  quests_json JSONB,
  npc_affinity_json JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  -- Verify ownership
  PERFORM 1 FROM checkpoints c
  WHERE c.id = p_checkpoint_id
    AND c.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint not found or unauthorized: %', p_checkpoint_id;
  END IF;

  -- Update last accessed
  UPDATE checkpoints
  SET last_accessed = NOW()
  WHERE id = p_checkpoint_id;

  -- Return state
  RETURN QUERY
  SELECT 
    cd.checkpoint_id,
    cd.character_json,
    cd.inventory_json,
    cd.combat_state_json,
    cd.quests_json,
    cd.npc_affinity_json,
    cd.created_at
  FROM checkpoint_data cd
  WHERE cd.checkpoint_id = p_checkpoint_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Verify Checkpoint Integrity
-- Check for data corruption (checksum validation)
CREATE OR REPLACE FUNCTION verify_checkpoint_integrity(
  p_checkpoint_id UUID
) RETURNS TABLE (
  is_valid BOOLEAN,
  expected_checksum TEXT,
  calculated_checksum TEXT
) AS $$
DECLARE
  v_expected_checksum TEXT;
  v_calculated_checksum TEXT;
BEGIN
  SELECT checksum INTO v_expected_checksum
  FROM checkpoint_data
  WHERE checkpoint_id = p_checkpoint_id;

  IF v_expected_checksum IS NULL THEN
    RAISE EXCEPTION 'Checkpoint data not found: %', p_checkpoint_id;
  END IF;

  SELECT encode(digest(
    character_json::text ||
    inventory_json::text ||
    COALESCE(combat_state_json::text, '') ||
    quests_json::text ||
    npc_affinity_json::text,
    'sha256'
  ), 'hex') INTO v_calculated_checksum
  FROM checkpoint_data
  WHERE checkpoint_id = p_checkpoint_id;

  RETURN QUERY
  SELECT 
    v_expected_checksum = v_calculated_checksum as is_valid,
    v_expected_checksum,
    v_calculated_checksum;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update save_backups.updated_at
CREATE OR REPLACE FUNCTION update_save_backups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_save_backups_update_timestamp
BEFORE UPDATE ON save_backups
FOR EACH ROW
EXECUTE FUNCTION update_save_backups_timestamp();

-- Auto-update auto_save_config.updated_at
CREATE OR REPLACE FUNCTION update_auto_save_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_save_config_update_timestamp
BEFORE UPDATE ON auto_save_config
FOR EACH ROW
EXECUTE FUNCTION update_auto_save_config_timestamp();

-- ============================================================================
-- GRANTS (For application user - adjust as needed)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE ON checkpoints TO app_user;
-- GRANT SELECT, INSERT ON checkpoint_data TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON save_backups TO app_user;
-- GRANT SELECT, INSERT ON auto_save_config TO app_user;
-- GRANT SELECT, INSERT ON checkpoint_rollbacks TO app_user;
-- GRANT SELECT ON active_checkpoints TO app_user;
-- GRANT SELECT ON checkpoint_timeline TO app_user;
-- GRANT SELECT ON cloud_sync_status TO app_user;
-- GRANT EXECUTE ON FUNCTION create_checkpoint TO app_user;
-- GRANT EXECUTE ON FUNCTION load_checkpoint TO app_user;
-- GRANT EXECUTE ON FUNCTION verify_checkpoint_integrity TO app_user;
