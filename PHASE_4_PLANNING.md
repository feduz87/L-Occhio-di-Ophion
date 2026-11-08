# 🎯 NEXT STEPS - Phase 4 (Save/Load System)

**Status:** Phase 3D Complete ✅  
**Current Progress:** 70% (36.5 / 52 hours)  
**Next Phase:** Phase 4 (Save/Load System) - 4-6 hours estimated  

---

## What's Ready Now

✅ **Full Gameplay Loop Implemented:**

```
Create Character → Explore World → Talk to NPCs → Accept Quests → Fight Enemies → Earn Loot
```

The game is fully playable for **one session**. Players can:
- Create a character with full customization
- Explore a 13-location world with travel mechanics
- Talk to 20+ NPCs with IA-powered dialogue
- Accept and complete quests with rewards
- Fight enemies with full combat system (turn-based, abilities, loot)

## What's Missing (Phase 4)

Players **cannot save their progress** between sessions. All progress is lost on page refresh.

### Phase 4 Requirements

1. **Combat State Persistence**
   - Save mid-battle state
   - Resume combat after disconnect
   - Auto-checkpoint on victory
   - Rollback on timeout

2. **Character Save/Load**
   - Full character snapshot on demand
   - Inventory state preservation
   - Experience & level tracking
   - Quest progress tracking

3. **Checkpoint System**
   - Auto-save after quest completion
   - Manual save at rest locations
   - Checkpoint listing & restore
   - Checkpoint versioning

4. **Cloud Sync (Optional)**
   - Export save to cloud
   - Import save from cloud
   - Multi-device restore
   - Conflict resolution

---

## Files to Create (Phase 4)

### Core Implementation (4 files)

```
server/db/09_schema_checkpoints.sql
  └─ Tables: checkpoints, checkpoint_data, save_backups
  └─ Views: active_checkpoints, checkpoint_timeline
  └─ Functions: create_checkpoint, load_checkpoint

server/services/checkpoint.js (15-20 KB)
  └─ 12 methods for checkpoint lifecycle
  └─ Methods: createCheckpoint, loadCheckpoint, listCheckpoints, deleteCheckpoint
  └─ Methods: exportCloud, importCloud, rollback

server/api/checkpoint.js (10-12 KB)
  └─ 12 REST endpoints
  └─ POST   /api/checkpoints              Create checkpoint
  └─ GET    /api/checkpoints              List checkpoints
  └─ GET    /api/checkpoints/:id          Load checkpoint
  └─ DELETE /api/checkpoints/:id          Delete checkpoint
  └─ POST   /api/checkpoints/:id/restore  Restore from checkpoint

server/db/seed-checkpoints.js (5 KB)
  └─ Default checkpoint templates
  └─ Example: Post-Quest checkpoint
```

### Testing (2 files)

```
server/services/checkpoint.test.js (12-15 KB)
  └─ 40+ unit tests
  └─ Test: Create checkpoint, Load checkpoint, List checkpoints
  └─ Test: Delete, Rollback, Conflict resolution

tests/checkpoint.integration.test.js (10-12 KB)
  └─ 20+ integration tests
  └─ Full save/load flow
  └─ Multi-checkpoint restoration
  └─ Cloud sync simulation
```

### Documentation (1 file)

```
PHASE_4_COMPLETE.md (15-20 KB)
  └─ Architecture overview
  └─ API reference
  └─ Cloud sync design
  └─ Testing checklist
```

---

## Database Design (Phase 4)

### Checkpoints Table

```sql
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  character_id UUID NOT NULL REFERENCES characters(id),
  checkpoint_type VARCHAR(50),  -- 'auto', 'manual', 'combat', 'post-quest'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- Full character state snapshot
CREATE TABLE checkpoint_data (
  id UUID PRIMARY KEY,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id),
  character_json JSONB,        -- Full character state
  inventory_json JSONB,        -- All items
  combat_state_json JSONB,     -- If in-combat
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cloud backup metadata
CREATE TABLE save_backups (
  id UUID PRIMARY KEY,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id),
  cloud_id TEXT,               -- Cloud storage reference
  cloud_provider VARCHAR(50),  -- 'aws', 'gcs', 'azure'
  backup_url TEXT,
  backup_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Service Methods (Phase 4)

### CheckpointService

```javascript
// Create & Manage Checkpoints
async createCheckpoint(characterId, type, description, db)
  └─ Snapshot full character state
  └─ Store in checkpoint_data
  └─ Return checkpoint ID

async loadCheckpoint(checkpointId, userId, db)
  └─ Verify user ownership
  └─ Restore character state
  └─ Restore inventory
  └─ Resume combat if applicable

async listCheckpoints(characterId, limit, offset, db)
  └─ List all checkpoints for character
  └─ Sort by created_at DESC
  └─ Include metadata

async deleteCheckpoint(checkpointId, userId, db)
  └─ Verify ownership
  └─ Delete checkpoint_data
  └─ Delete cloud backup
  └─ Cascade cleanup

// Auto-Save
async autoCreateCheckpoint(characterId, type, db)
  └─ Create after quest completion
  └─ Create after combat victory
  └─ Auto-cleanup old checkpoints (keep last 10)

// Cloud Sync
async exportCheckpoint(checkpointId, userId, provider, db)
  └─ Serialize checkpoint to JSON
  └─ Upload to cloud storage
  └─ Store backup metadata

async importCheckpoint(cloudId, userId, db)
  └─ Download from cloud storage
  └─ Validate checksum
  └─ Create local checkpoint

async rollback(checkpointId, targetCheckpointId, userId, db)
  └─ Revert to previous checkpoint
  └─ Log rollback event
  └─ Notify user
```

---

## API Reference (Phase 4)

### Checkpoint Endpoints

```bash
# Create manual checkpoint
POST /api/checkpoints
{
  "characterId": "char-1",
  "description": "Before dragon fight",
  "type": "manual"
}
→ { success: true, checkpointId: "checkpoint-123" }

# List checkpoints
GET /api/checkpoints?characterId=char-1&limit=20
→ { 
    success: true, 
    count: 5,
    data: [
      {
        id: "checkpoint-1",
        created_at: "2026-11-09T01:35:00Z",
        type: "auto",
        description: "After quest 'Goblin King'"
      }
    ]
  }

# Load checkpoint
POST /api/checkpoints/checkpoint-123/restore
→ {
    success: true,
    character: { ... full state ... }
  }

# Delete checkpoint
DELETE /api/checkpoints/checkpoint-123
→ { success: true }

# Cloud export
POST /api/checkpoints/checkpoint-123/export
{ "provider": "gcs" }
→ { success: true, cloudId: "gs://bucket/checkpoint-123" }

# Cloud import
POST /api/checkpoints/import
{ "cloudId": "gs://bucket/checkpoint-123" }
→ { success: true, checkpointId: "checkpoint-456" }
```

---

## Implementation Roadmap (Phase 4)

### Task 1: Schema (30 min)
- Create `09_schema_checkpoints.sql`
- 3 tables + 2 views + 2 functions
- All constraints & indexes

### Task 2: Service (60 min)
- Create `checkpoint.js` service
- 12 methods for checkpoint lifecycle
- Server-side state serialization

### Task 3: API Endpoints (45 min)
- Create `checkpoint.js` routes
- 12 REST endpoints
- Full input validation

### Task 4: Cloud Sync (45 min)
- Google Cloud Storage integration
- AWS S3 adapter (optional)
- Conflict resolution logic

### Task 5: Testing (45 min)
- 40+ unit tests
- 20+ integration tests
- Cloud sync mocking

### Task 6: Auto-Save (30 min)
- Quest completion hook
- Combat victory hook
- Checkpoint cleanup scheduler

### Task 7: Documentation (20 min)
- PHASE_4_COMPLETE.md
- API reference
- Troubleshooting guide

**Total Estimated Time:** 4.5-5.5 hours

---

## Testing Strategy (Phase 4)

### Unit Tests (40+ tests)

```javascript
describe('CheckpointService', () => {
  // Create & Save
  it('should create checkpoint with full state')
  it('should serialize character to JSON')
  it('should serialize inventory items')
  it('should capture combat state if in-battle')
  
  // Load & Restore
  it('should load checkpoint by ID')
  it('should restore character state')
  it('should restore inventory from snapshot')
  it('should resume combat if applicable')
  it('should verify user ownership')
  
  // List & Delete
  it('should list checkpoints for character')
  it('should sort by created_at DESC')
  it('should delete checkpoint')
  it('should cascade cleanup related data')
  
  // Cloud Sync
  it('should export checkpoint to cloud')
  it('should import checkpoint from cloud')
  it('should validate checksum')
  it('should detect conflicts')
  
  // Auto-Save
  it('should auto-checkpoint after quest')
  it('should auto-checkpoint after combat')
  it('should cleanup old checkpoints (keep 10)')
  it('should handle checkpoint failures gracefully')
});
```

### Integration Tests (20+ tests)

```javascript
describe('Checkpoint System Integration', () => {
  it('should complete full save/restore cycle')
  it('should handle multiple simultaneous checkpoints')
  it('should preserve quest progress across restore')
  it('should preserve combat state across restore')
  it('should rollback to previous checkpoint')
  it('should export/import from cloud')
  it('should resolve concurrent save conflicts')
});
```

---

## Performance Requirements (Phase 4)

| Operation | Target Latency | P99 |
|-----------|---|---|
| Create checkpoint | 200-300ms | 500ms |
| Load checkpoint | 150-250ms | 400ms |
| List checkpoints | 50-100ms | 200ms |
| Delete checkpoint | 100-150ms | 300ms |
| Export to cloud | 1-2s | 5s |
| Import from cloud | 1-2s | 5s |

---

## Known Limitations (Phase 4)

### Scope (Will Implement)
- ✅ Character state persistence
- ✅ Inventory preservation
- ✅ Combat state checkpoint
- ✅ Quest progress tracking
- ✅ Cloud backup (basic)

### Out of Scope (Phase 5+)
- ⏳ Multi-device cloud sync (Phase 5)
- ⏳ Real-time multiplayer saves (Phase 5)
- ⏳ Time-machine checkpoint versioning (Phase 6)
- ⏳ Automatic cloud backup (Phase 6)

---

## Deployment Notes (Phase 4)

### Database Migration

```sql
-- 1. Create new checkpoint schema
psql -U user -d db < server/db/09_schema_checkpoints.sql

-- 2. Create backup of current database
pg_dump -U user db > db_backup_2026-11-09.sql

-- 3. Seed checkpoint templates
node server/db/seed-checkpoints.js

-- 4. Verify
SELECT COUNT(*) FROM checkpoints;  -- Should be 0 (empty)
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'checkpoint%';
```

### Environment Variables

```env
# Cloud Storage
CLOUD_PROVIDER=gcs                    # 'gcs', 'aws', 'azure'
GCS_BUCKET=ophion-saves               # Google Cloud Storage bucket
AWS_S3_BUCKET=ophion-saves            # AWS S3 bucket
CHECKPOINT_AUTO_BACKUP=true
CHECKPOINT_CLEANUP_INTERVAL=3600      # 1 hour
CHECKPOINT_MAX_PER_CHARACTER=20
```

### Monitoring

- Alert if checkpoint creation > 1000ms
- Monitor checkpoint storage usage (quota)
- Track cloud sync failures
- Alert on checksum mismatches

---

## Ready to Start? ✅

**All prerequisites for Phase 4 are complete:**

✅ Database schema patterns proven (7 schemas done)  
✅ Service architecture established  
✅ Testing framework in place  
✅ API standards documented  
✅ Security model validated  
✅ Performance baseline set  

**Next Developer Can:**
1. Copy Phase 4 plan from this file
2. Start with Task 1 (schema)
3. Follow 7-task breakdown
4. Use prior phases as templates
5. Run tests continuously
6. Deploy with confidence

---

**Time to Phase 4 Completion: ~4-6 hours**  
**Estimated Project Completion: 80-85% (42-44 / 52 hours)**

