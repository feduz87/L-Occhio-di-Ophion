# L'Occhio di Ophion - API Reference

## Base URL

```
http://localhost:3000/api
```

## Authentication

### POST /auth/register

Create a new player account.

**Request:**
```json
{
  "username": "string (3-255 chars, unique)",
  "email": "string (unique)",
  "password": "string (min 8 chars)"
}
```

**Response (201):**
```json
{
  "user_id": "uuid",
  "username": "string",
  "email": "string",
  "created_at": "ISO-8601"
}
```

**Errors:**
- `400` — Username/email already exists
- `400` — Validation failed (password too short)

---

### POST /auth/login

Start a session.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "token": "jwt_token",
  "user": {
    "user_id": "uuid",
    "username": "string"
  },
  "expires_in": 86400
}
```

**Errors:**
- `401` — Invalid credentials
- `429` — Too many login attempts

---

### GET /auth/me

Get current authenticated user.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "user_id": "uuid",
  "username": "string",
  "email": "string",
  "created_at": "ISO-8601",
  "last_login": "ISO-8601"
}
```

---

## Characters

### POST /characters

Create a new character.

**Request:**
```json
{
  "name": "string (1-255 chars)",
  "heritage": "Sangue Antico|Discendenza delle Dune|Uomini del Nord",
  "race": "Uomini|Elfi|Nani|Mezzuomini|Bruti|Goblin|Orchi",
  "class": "Guerriero|Ramingo|Ladro|Sapiente|Guaritore"
}
```

**Response (201):**
```json
{
  "character_id": "uuid",
  "name": "string",
  "heritage": "string",
  "race": "string",
  "class": "string",
  "level": 1,
  "experience_points": 0,
  "hit_points": 10,
  "hit_points_max": 10,
  "armor_class": 10,
  "stats": {
    "strength": 10,
    "dexterity": 10,
    "constitution": 10,
    "intelligence": 10,
    "wisdom": 10,
    "charisma": 10
  },
  "resources": {
    "gold": 0,
    "rations": 5,
    "willpower_slots": 3
  },
  "created_at": "ISO-8601"
}
```

**Errors:**
- `400` — Name already exists for this user
- `400` — Invalid race/class combination
- `422` — Invalid heritage value

---

### GET /characters

List all characters for authenticated user.

**Response (200):**
```json
{
  "characters": [
    {
      "character_id": "uuid",
      "name": "string",
      "race": "string",
      "class": "string",
      "level": 5,
      "created_at": "ISO-8601"
    }
  ]
}
```

---

### GET /characters/:character_id

Get character details.

**Response (200):**
```json
{
  "character_id": "uuid",
  "name": "string",
  "heritage": "string",
  "race": "string",
  "class": "string",
  "level": 5,
  "experience_points": 1500,
  "masteries_points": 2,
  "hit_points": 35,
  "hit_points_max": 40,
  "armor_class": 15,
  "stats": { ... },
  "resources": { ... },
  "current_node": {
    "node_id": "uuid",
    "name": "string",
    "description": "string"
  },
  "party": [
    {
      "npc_id": "uuid",
      "name": "string",
      "affinity": 75,
      "relationship": "amico"
    }
  ],
  "updated_at": "ISO-8601"
}
```

---

## Game World

### GET /map/nodes

List all discovered map nodes.

**Query Params:**
- `region` (optional) — Filter by region

**Response (200):**
```json
{
  "nodes": [
    {
      "node_id": "uuid",
      "name": "string",
      "region": "string",
      "node_type": "settlement",
      "danger_level": 2,
      "discovered": true,
      "visited_count": 3
    }
  ]
}
```

---

### GET /map/nodes/:node_id

Get node details with hotspots.

**Response (200):**
```json
{
  "node_id": "uuid",
  "name": "Moli del Porto",
  "description": "string",
  "background_art": "url",
  "region": "Litorale",
  "node_type": "settlement",
  "weather": "clear",
  "danger_level": 2,
  "hotspots": [
    {
      "hotspot_id": "uuid",
      "name": "Taverniere",
      "hotspot_type": "npc",
      "npc": {
        "npc_id": "uuid",
        "name": "Karn",
        "race": "Nani",
        "role": "merchant",
        "affinity": 15
      }
    },
    {
      "hotspot_id": "uuid",
      "name": "Forziere Arrugginito",
      "hotspot_type": "chest",
      "opened": false
    }
  ]
}
```

---

### POST /map/move/:node_id

Move character to a different node.

**Request:**
```json
{
  "character_id": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Moved to Moli del Porto",
  "current_node": { ... },
  "travel_cost": {
    "hours_passed": 6,
    "rations_consumed": 1
  },
  "resources": {
    "rations": 4,
    "fatigue_level": 1
  }
}
```

**Errors:**
- `402` — Insufficient rations
- `423` — Character in combat (cannot move)

---

## Dialogue & NPCs

### POST /dialogue/send

Send message to NPC.

**Request:**
```json
{
  "character_id": "uuid",
  "npc_id": "uuid",
  "message": "string"
}
```

**Response (200):**
```json
{
  "dialogue_round": 3,
  "npc_message": "Aye, what brings ye to me forge?",
  "internal_thought": "[IA reasoning - not shown to player]",
  "system_action": "nessuna",
  "affinity_change": 2,
  "new_affinity": 17,
  "relationship_updated": "neutrale",
  "dialogue_history": [
    { "role": "player", "message": "..." },
    { "role": "npc", "message": "..." }
  ]
}
```

**Errors:**
- `404` — NPC not in current node
- `429` — Dialogue cooldown (wait 5 seconds)
- `503` — IA service unavailable

---

### POST /dialogue/special_action

Trigger special NPC interaction.

**Request:**
```json
{
  "character_id": "uuid",
  "npc_id": "uuid",
  "action": "apri_inventario_negozio|proponi_commissione|assegna_quest|unisciti_party"
}
```

**Response (200):**
```json
{
  "action": "apri_inventario_negozio",
  "shop_inventory": [
    {
      "item_id": "uuid",
      "name": "Longsword",
      "price": 150,
      "quantity": 2,
      "rarity": "uncommon"
    }
  ]
}
```

---

## Inventory & Items

### GET /inventory

Get player character's inventory.

**Query Params:**
- `character_id` (required)

**Response (200):**
```json
{
  "character_id": "uuid",
  "gold": 250,
  "rations": 4,
  "encumbrance": 45,
  "encumbrance_max": 100,
  "slots": [
    {
      "slot_id": "uuid",
      "item": {
        "item_id": "uuid",
        "name": "Greatsword",
        "item_type": "weapon",
        "rarity": "uncommon"
      },
      "quantity": 1,
      "equipped": true,
      "condition": 95
    },
    {
      "slot_id": "uuid",
      "item": {
        "item_id": "uuid",
        "name": "Healing Potion",
        "item_type": "consumable"
      },
      "quantity": 3,
      "equipped": false
    }
  ]
}
```

---

### POST /inventory/use

Use a consumable item.

**Request:**
```json
{
  "character_id": "uuid",
  "item_id": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Used Healing Potion",
  "effect": {
    "type": "heal",
    "value": 20
  },
  "hit_points": 38,
  "hit_points_max": 40,
  "inventory": { ... }
}
```

---

## Combat

### POST /combat/start

Initiate an encounter.

**Request:**
```json
{
  "character_id": "uuid",
  "enemy_ids": ["uuid", "uuid"],
  "encounter_type": "ambush|duel|group_combat"
}
```

**Response (200):**
```json
{
  "encounter_id": "uuid",
  "status": "active",
  "round": 1,
  "initiative_order": [
    { "combatant_id": "uuid", "name": "Karn", "initiative": 18 },
    { "combatant_id": "uuid", "name": "Player", "initiative": 12 }
  ],
  "combatants": [
    {
      "combatant_id": "uuid",
      "name": "Player",
      "hp": 40,
      "hp_max": 40,
      "position": "melee",
      "ac": 15
    },
    {
      "combatant_id": "uuid",
      "name": "Orc Warrior",
      "hp": 25,
      "hp_max": 25,
      "position": "melee",
      "ac": 14
    }
  ],
  "current_turn": "uuid"
}
```

---

### POST /combat/action

Execute a combat action.

**Request:**
```json
{
  "encounter_id": "uuid",
  "combatant_id": "uuid",
  "action_type": "attack|dodge|cast_spell|use_item|command_ally",
  "target_id": "uuid",
  "spell_or_weapon": "Longsword|Healing Spell"
}
```

**Response (200):**
```json
{
  "action": "attack",
  "attacker": "Player",
  "target": "Orc Warrior",
  "d20_roll": 15,
  "vs_ac": 14,
  "hit": true,
  "damage_roll": "1d8+3",
  "damage": 9,
  "target_hp_remaining": 16,
  "combat_log_entry": {
    "round": 1,
    "description": "Player strikes true with Longsword, dealing 9 damage!"
  },
  "next_turn": {
    "combatant_id": "uuid",
    "name": "Orc Warrior"
  }
}
```

**Errors:**
- `403` — Not this combatant's turn
- `402` — Insufficient willpower slots (magic)
- `400` — Invalid target

---

### GET /combat/:encounter_id

Get current combat state.

**Response (200):**
```json
{
  "encounter_id": "uuid",
  "status": "active",
  "round": 3,
  "current_turn": "uuid",
  "combatants": [ ... ],
  "combat_log": [
    { "round": 1, "action": "..." },
    { "round": 2, "action": "..." }
  ]
}
```

---

### POST /combat/:encounter_id/end

End combat (surrender, flee, victory).

**Request:**
```json
{
  "encounter_id": "uuid",
  "result": "victory|defeat|fled"
}
```

**Response (200):**
```json
{
  "encounter_id": "uuid",
  "result": "victory",
  "xp_earned": 150,
  "loot": [
    {
      "item_id": "uuid",
      "name": "Iron Ore",
      "quantity": 3
    }
  ],
  "character_updated": {
    "level": 2,
    "experience_points": 750
  }
}
```

---

## Quests

### GET /quests/active

Get active quests for character.

**Query Params:**
- `character_id` (required)

**Response (200):**
```json
{
  "quests": [
    {
      "quest_id": "uuid",
      "title": "Recover the Stolen Amulet",
      "given_by": "Merchant Karn",
      "status": "active",
      "objective": "Find the amulet in the Ruins of Keth",
      "deadline": "ISO-8601",
      "reward": {
        "xp": 200,
        "gold": 100,
        "items": [ ... ]
      },
      "progress": {
        "items_collected": 0,
        "enemies_defeated": 3
      }
    }
  ]
}
```

---

### POST /quests/:quest_id/complete

Mark quest as complete.

**Request:**
```json
{
  "character_id": "uuid",
  "quest_id": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Quest completed!",
  "quest_id": "uuid",
  "rewards": {
    "xp": 200,
    "gold": 100,
    "items": [ ... ]
  },
  "character_updated": {
    "level": 3,
    "gold": 350,
    "experience_points": 1050
  }
}
```

---

## Health Check

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "ISO-8601"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error code",
  "message": "Human-readable message",
  "status": 400
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200  | OK |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (missing/invalid token) |
| 402  | Payment Required (insufficient resources) |
| 403  | Forbidden (not authorized for this action) |
| 404  | Not Found |
| 429  | Too Many Requests (rate limited) |
| 500  | Internal Server Error |
| 503  | Service Unavailable (IA service down) |

---

*Last Updated: 2026-11-08*
