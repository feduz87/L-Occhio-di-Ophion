# Phase 5: Multiplayer System - Quick Reference

## 🎯 What's New

### Shared Instances
Players can now join shared zones, dungeons, and PvP arenas. Each instance tracks participants and can have custom data.

```bash
# Create instance (admin only)
POST /api/multiplayer/instances
{
  "world_id": 1,
  "instance_type": "dungeon",
  "instance_name": "Dragon's Lair",
  "max_players": 50,
  "is_pvp": false
}

# Join instance
POST /api/multiplayer/instances/1/join

# List instances
GET /api/multiplayer/instances?world_id=1&type=dungeon
```

### Player Groups (Parties)
Form groups for coordinated play with loot distribution settings.

```bash
# Create group
POST /api/multiplayer/groups
{
  "group_name": "Dragon Slayers",
  "group_type": "party"
}

# Join group
POST /api/multiplayer/groups/1/join

# Get my groups
GET /api/multiplayer/my-groups
```

### Guild System
Create guilds with treasury, member ranks, and audit logging.

```bash
# Create guild
POST /api/multiplayer/guilds
{
  "guild_name": "Eternal Knights",
  "description": "Elite warrior guild"
}

# Join guild
POST /api/multiplayer/guilds/1/join

# Deposit gold
POST /api/multiplayer/guilds/1/deposit
{
  "amount": 5000
}

# Withdraw (officer+)
POST /api/multiplayer/guilds/1/withdraw
{
  "amount": 1000
}

# Get treasury
GET /api/multiplayer/guilds/1/treasury

# View logs
GET /api/multiplayer/guilds/1/logs
```

### Trading System
Atomic item & currency trading between players.

```bash
# Initiate trade
POST /api/multiplayer/trades
{
  "target_id": 42,
  "items": [{"item_id": 1, "quantity": 2}],
  "gold": 1500
}

# Add counter-offer
POST /api/multiplayer/trades/1/offer
{
  "items": [{"item_id": 3, "quantity": 1}],
  "gold": 500
}

# Accept trade
POST /api/multiplayer/trades/1/accept

# Get pending trades
GET /api/multiplayer/trades/pending

# Get history
GET /api/multiplayer/trades/history
```

### PvP Rankings
Competitive leaderboard with MMR system.

```bash
# Get leaderboard
GET /api/multiplayer/pvp/leaderboard?limit=100

# Get my stats
GET /api/multiplayer/pvp/stats
```

### Social System
Friends & blocking.

```bash
# Send friend request
POST /api/multiplayer/friends/42

# Block player
POST /api/multiplayer/block/99

# Get friends
GET /api/multiplayer/friends
```

---

## 📊 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `shared_instances` | Zones/dungeons/arenas | id, world_id, instance_type, current_player_count |
| `player_groups` | Parties/raids | id, leader_id, group_name, max_members |
| `player_group_members` | Group participants | group_id, character_id, role |
| `guilds` | Guild master | id, guild_name, founder_id, level |
| `guild_members` | Guild participants | guild_id, character_id, rank |
| `guild_treasury` | Guild bank | guild_id, gold_amount, inventory_items |
| `guild_logs` | Audit trail | guild_id, actor_id, action_type |
| `trades` | Item exchanges | initiator_id, target_id, status |
| `pvp_rankings` | Leaderboard data | character_id, mmr, arena_rank |
| `player_interactions` | Friends/blocks | initiator_id, target_id, type |
| `instance_participants` | Active players | instance_id, character_id, is_active |

---

## 🔐 Permission Model

### Guild Ranks
```
Founder
  ├── Can: Disband guild, manage all
  
Officer
  ├── Can: Withdraw treasury, manage members, edit logs
  
Member
  ├── Can: Deposit treasury, view guild, contribute
  
Recruit
  ├── Can: View guild info only
```

### Trading Rules
```
1. Both players must accept
2. Items locked until trade completes
3. Auto-cancel after 1 hour
4. Full audit trail maintained
```

---

## 🧪 Testing

### Run Unit Tests
```bash
npm test -- multiplayer.test.js
```

### Run Integration Tests
```bash
npm test -- multiplayer.integration.test.js
```

### Coverage Report
```bash
npm test -- --coverage
```

---

## 🚀 API Response Examples

### Create Guild Success
```json
{
  "success": true,
  "guild_id": 42,
  "message": "Guild created"
}
```

### List Instances
```json
{
  "success": true,
  "count": 3,
  "instances": [
    {
      "id": 1,
      "instance_type": "zone",
      "instance_name": "Starter Area",
      "actual_players": 15,
      "max_players": 100,
      "is_pvp": false
    }
  ]
}
```

### Get PvP Stats
```json
{
  "success": true,
  "stats": {
    "character_id": 1,
    "arena_rank": 342,
    "mmr": 1850,
    "total_wins": 25,
    "total_losses": 8,
    "total_matches": 33,
    "win_rate": 75.76,
    "current_streak": 3,
    "best_streak": 7
  }
}
```

---

## ⚙️ Configuration

### Guild Settings
```javascript
{
  "invitation_type": "open" | "invite_only",
  "leadership_type": "monarch" | "council",
  "tax_rate": 0.05, // 5% on deposits
  "treasury_withdrawal_perm": "officer" // min rank
}
```

### Group Settings
```javascript
{
  "loot_distribution": "roll" | "need_before_greed" | "leader",
  "auto_invite": true | false,
  "level_requirement": 1,
  "difficulty": "normal" | "hard" | "extreme"
}
```

---

## 🎮 Example Workflows

### Creating a Guild & Inviting Members
```
1. POST /api/multiplayer/guilds (create)
2. Share guild_id with friends
3. Friends POST /api/multiplayer/guilds/:id/join
4. Leader can POST /api/multiplayer/guilds/:id/deposit (gold)
5. Officer can POST /api/multiplayer/guilds/:id/withdraw (for events)
```

### Trading Items Between Players
```
1. Player A: POST /api/multiplayer/trades (target: B, items: [sword])
2. Player B: POST /api/multiplayer/trades/:id/offer (items: [shield])
3. Both: POST /api/multiplayer/trades/:id/accept
4. Server: execute_trade() function runs atomically
5. Both receive: GET /api/multiplayer/trades/history
```

### Joining a Dungeon Group
```
1. Leader: POST /api/multiplayer/groups (create party)
2. Get: POST /api/multiplayer/groups/:id/join
3. All: POST /api/multiplayer/instances/:dungeon_id/join
4. Leader: Sets loot rules in group_settings
5. After: GET /api/multiplayer/my-groups
```

### Climbing PvP Ranks
```
1. Auto-initialized on first login
2. JOIN /api/multiplayer/pvp/arenas (TBD - needs WebSocket)
3. WIN: +25 MMR, -20 MMR on loss
4. Check: GET /api/multiplayer/pvp/leaderboard
5. Grind: Repeat until #1!
```

---

## 🛠️ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Guild name already exists" | Duplicate guild name | Choose unique name |
| "Instance is full" | Max players reached | Try another instance |
| "Insufficient permissions" | Need officer+ rank | Ask guild leader to promote |
| "Insufficient gold" | Not enough currency | Earn more through combat |
| "Active trade already exists" | Trading with same person | Cancel first trade |
| "Not authorized" | Missing JWT token | Login first |

---

## 📈 Performance Tips

1. **Cache guild details** (60s TTL) for frequently accessed guilds
2. **Batch leaderboard queries** - sort by MMR, limit 100
3. **Clean up expired trades** every hour
4. **Index on character_id + is_active** for fast participant lookups
5. **Use JSONB for flexible guild settings** - no schema migrations

---

## 🔗 Related Files

- [PHASE_5_COMPLETE.md](PHASE_5_COMPLETE.md) - Full documentation
- [server/services/multiplayer.js](server/services/multiplayer.js) - Service code
- [server/services/guild.js](server/services/guild.js) - Guild logic
- [server/services/trade.js](server/services/trade.js) - Trading logic
- [server/api/multiplayer.js](server/api/multiplayer.js) - API endpoints
- [server/db/10_schema_multiplayer.sql](server/db/10_schema_multiplayer.sql) - Database

---

**Last Updated**: 2025-11-09  
**Status**: Production Ready ✅
