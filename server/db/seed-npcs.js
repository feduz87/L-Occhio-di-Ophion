/**
 * Seed NPCs into database
 * 
 * Creates 20+ NPCs across locations with:
 * - Unique personalities and roles
 * - Starting affinity values
 * - Dialogue seeds
 * - Recruitment costs (for companions)
 * - Starting inventory
 */

const db = require('./init');

const NPCS = [
  // ============================================================================
  // MERCHANTS (5) - Buy and sell items
  // ============================================================================
  
  {
    name: 'Grimbeard Ironforge',
    race: 'dwarf',
    role: 'armorer',
    personality: { temperament: 'gruff', intelligence: 11, charisma: 9, honesty: 9 },
    dialogue_seed: 'Looking for quality armor? I forge the finest in the realm.',
    initial_affinity: 0,
    is_recruitable: false,
    location_key: 'mountain-keep', // Will resolve to hotspot
    hotspot_name: 'Armorer\'s Forge',
    inventory: [
      { item_key: 'iron_sword', quantity: 3 },
      { item_key: 'steel_armor', quantity: 2 },
      { item_key: 'shield', quantity: 4 }
    ]
  },

  {
    name: 'Lyria Moonwhisper',
    race: 'elf',
    role: 'healer',
    personality: { temperament: 'compassionate', intelligence: 13, charisma: 12, wisdom: 14 },
    dialogue_seed: 'Welcome, traveler. Let me tend to your wounds.',
    initial_affinity: 10, // Naturally friendly
    is_recruitable: false,
    location_key: 'forest-sanctuary',
    hotspot_name: 'Healing Sanctuary',
    inventory: [
      { item_key: 'healing_potion', quantity: 10 },
      { item_key: 'antidote', quantity: 5 },
      { item_key: 'cure_disease', quantity: 3 }
    ]
  },

  {
    name: 'Rajah Al-Zahara',
    race: 'human',
    role: 'merchant',
    personality: { temperament: 'cunning', intelligence: 13, charisma: 14, deception: 11 },
    dialogue_seed: 'Ah, a customer! I have goods you won\'t find anywhere else.',
    initial_affinity: 5,
    is_recruitable: false,
    location_key: 'desert-encampment',
    hotspot_name: 'Merchant\'s Tent',
    inventory: [
      { item_key: 'spice', quantity: 20 },
      { item_key: 'silk', quantity: 15 },
      { item_key: 'exotic_gem', quantity: 5 }
    ]
  },

  {
    name: 'Thorne Redmoon',
    race: 'human',
    role: 'tavern_keeper',
    personality: { temperament: 'jovial', intelligence: 10, charisma: 13, insight: 11 },
    dialogue_seed: 'Welcome to the Crimson Sail! What\'ll you have?',
    initial_affinity: 15, // Likes adventurers
    is_recruitable: false,
    location_key: 'port-town',
    hotspot_name: 'Crimson Sail Tavern',
    inventory: [
      { item_key: 'ale', quantity: 50 },
      { item_key: 'wine', quantity: 30 },
      { item_key: 'mead', quantity: 20 }
    ]
  },

  {
    name: 'Shade Nightbark',
    race: 'elf',
    role: 'alchemist',
    personality: { temperament: 'mysterious', intelligence: 15, charisma: 8, arcana: 14 },
    dialogue_seed: 'Interested in rare ingredients? I deal with... unusual things.',
    initial_affinity: -5, // Distrustful of strangers
    is_recruitable: false,
    location_key: 'shadow-woods',
    hotspot_name: 'Twisted Hut',
    inventory: [
      { item_key: 'rare_herb', quantity: 8 },
      { item_key: 'dragon_scale', quantity: 2 },
      { item_key: 'moonstone', quantity: 4 }
    ]
  },

  // ============================================================================
  // QUEST GIVERS (5) - Assign quests
  // ============================================================================
  
  {
    name: 'Governor Aldric',
    race: 'human',
    role: 'quest_giver',
    personality: { temperament: 'authoritative', intelligence: 13, charisma: 13, leadership: 14 },
    dialogue_seed: 'We have work for capable adventurers. Are you interested?',
    initial_affinity: 10,
    is_recruitable: false,
    location_key: 'port-town',
    hotspot_name: 'Governor\'s Estate'
  },

  {
    name: 'Elder Silverleaf',
    race: 'elf',
    role: 'quest_giver',
    personality: { temperament: 'wise', intelligence: 15, charisma: 12, insight: 15 },
    dialogue_seed: 'The forest speaks of dangers. Will you help us?',
    initial_affinity: 5,
    is_recruitable: false,
    location_key: 'forest-sanctuary',
    hotspot_name: 'Elder Grove'
  },

  {
    name: 'Caravan Master Khalid',
    race: 'human',
    role: 'quest_giver',
    personality: { temperament: 'practical', intelligence: 11, charisma: 11, insight: 10 },
    dialogue_seed: 'I need trustworthy folks to escort my goods. Interested?',
    initial_affinity: 0,
    is_recruitable: false,
    location_key: 'desert-encampment',
    hotspot_name: 'Caravan Hub'
  },

  {
    name: 'Stonehelm Deepdelver',
    race: 'dwarf',
    role: 'quest_giver',
    personality: { temperament: 'stern', intelligence: 12, charisma: 9, leadership: 11 },
    dialogue_seed: 'The mines need clearing. Beast infestation, ye see.',
    initial_affinity: 5,
    is_recruitable: false,
    location_key: 'mountain-keep',
    hotspot_name: 'Foreman\'s Office'
  },

  {
    name: 'Abbot Ceros',
    race: 'human',
    role: 'quest_giver',
    personality: { temperament: 'holy', intelligence: 14, charisma: 12, insight: 13 },
    dialogue_seed: 'This sanctuary has been blessed by the gods. Help us maintain it.',
    initial_affinity: 20, // Holy aura
    is_recruitable: false,
    location_key: 'hidden-valley',
    hotspot_name: 'Holy Monastery'
  },

  // ============================================================================
  // COMPANIONS (5) - Can be recruited to party
  // ============================================================================
  
  {
    name: 'Elara Swiftbow',
    race: 'elf',
    role: 'ranger',
    personality: { temperament: 'independent', intelligence: 12, charisma: 11, survival: 14 },
    dialogue_seed: 'I track monsters through these woods. Care to join me?',
    initial_affinity: 5,
    is_recruitable: true,
    recruitment_cost: 100, // Gold to recruit
    location_key: 'forest-trail',
    hotspot_name: 'Ranger Camp',
    inventory: [
      { item_key: 'bow', quantity: 1 },
      { item_key: 'arrow', quantity: 30 }
    ]
  },

  {
    name: 'Krag Skullcrusher',
    race: 'orc',
    role: 'warrior',
    personality: { temperament: 'brutal', intelligence: 8, charisma: 7, strength: 16 },
    dialogue_seed: 'Me strong. You need strong? Krag help.',
    initial_affinity: 0,
    is_recruitable: true,
    recruitment_cost: 150,
    location_key: 'mountain-keep',
    hotspot_name: 'Warrior\'s Hall',
    inventory: [
      { item_key: 'great_axe', quantity: 1 },
      { item_key: 'battle_armor', quantity: 1 }
    ]
  },

  {
    name: 'Astraea Starlight',
    race: 'elf',
    role: 'mage',
    personality: { temperament: 'intellectual', intelligence: 16, charisma: 10, arcana: 16 },
    dialogue_seed: 'Magic flows through everything. Join me in study?',
    initial_affinity: 10,
    is_recruitable: true,
    recruitment_cost: 200,
    location_key: 'forest-sanctuary',
    hotspot_name: 'Magical Tower',
    inventory: [
      { item_key: 'staff', quantity: 1 },
      { item_key: 'spellbook', quantity: 1 }
    ]
  },

  {
    name: 'Ravil Shadowstep',
    race: 'human',
    role: 'rogue',
    personality: { temperament: 'cunning', intelligence: 13, charisma: 12, stealth: 15 },
    dialogue_seed: 'Looking for someone who can... handle situations quietly?',
    initial_affinity: -10, // Mistrusts authority
    is_recruitable: true,
    recruitment_cost: 180,
    location_key: 'port-town',
    hotspot_name: 'Thieves Alley',
    inventory: [
      { item_key: 'dagger', quantity: 2 },
      { item_key: 'lockpick', quantity: 5 }
    ]
  },

  {
    name: 'Brother Radiance',
    race: 'human',
    role: 'cleric',
    personality: { temperament: 'devoted', intelligence: 12, charisma: 14, insight: 14 },
    dialogue_seed: 'The divine calls us to aid those in need. Will you answer?',
    initial_affinity: 25, // Holy blessing
    is_recruitable: true,
    recruitment_cost: 120,
    location_key: 'hidden-valley',
    hotspot_name: 'Holy Temple',
    inventory: [
      { item_key: 'holy_symbol', quantity: 1 },
      { item_key: 'mace', quantity: 1 }
    ]
  },

  // ============================================================================
  // NEUTRAL/MYSTERIOUS (5) - Plot hooks and information
  // ============================================================================
  
  {
    name: 'Wanderer',
    race: 'human',
    role: 'mysterious_traveler',
    personality: { temperament: 'enigmatic', intelligence: 14, charisma: 11, insight: 13 },
    dialogue_seed: 'The roads go ever on... and sometimes they meet again.',
    initial_affinity: 0,
    is_recruitable: false,
    location_key: 'wildlands-frontier',
    hotspot_name: 'Remote Camp'
  },

  {
    name: 'Old Marim',
    race: 'human',
    role: 'hermit',
    personality: { temperament: 'wise', intelligence: 14, charisma: 9, insight: 15 },
    dialogue_seed: 'Few find this place. Fewer still understand what they find.',
    initial_affinity: 5,
    is_recruitable: false,
    location_key: 'hidden-valley',
    hotspot_name: 'Hermit\'s Cave'
  },

  {
    name: 'Melody Swiftfinger',
    race: 'halfling',
    role: 'bard',
    personality: { temperament: 'cheerful', intelligence: 11, charisma: 15, performance: 14 },
    dialogue_seed: 'Care to hear a tale? Or perhaps create one together?',
    initial_affinity: 15, // Likeable personality
    is_recruitable: false,
    location_key: 'coastal-road',
    hotspot_name: 'Musician\'s Rest'
  },

  {
    name: 'Silas the Silent',
    race: 'human',
    role: 'information_broker',
    personality: { temperament: 'cold', intelligence: 15, charisma: 10, deception: 14 },
    dialogue_seed: 'Information is currency. What are you worth?',
    initial_affinity: -5, // Transactional
    is_recruitable: false,
    location_key: 'shadow-woods',
    hotspot_name: 'Hidden Booth'
  },

  {
    name: 'Admiral Blackwater',
    race: 'human',
    role: 'retired_adventurer',
    personality: { temperament: 'grizzled', intelligence: 11, charisma: 12, insight: 12 },
    dialogue_seed: 'Aye, I\'ve sailed the seven seas and seen wonders. Ask away.',
    initial_affinity: 10,
    is_recruitable: false,
    location_key: 'port-town',
    hotspot_name: 'Old Sailor\'s Bar'
  }
];

/**
 * Seed NPCs into database
 */
async function seedNPCs() {
  try {
    console.log('🎭 Seeding NPCs...');
    
    let created = 0;
    let skipped = 0;

    for (const npcData of NPCS) {
      try {
        // Get location
        const locResult = await db.query(
          'SELECT id FROM map_nodes WHERE node_key = $1',
          [npcData.location_key]
        );

        if (locResult.rows.length === 0) {
          console.log(`  ⏭️  ${npcData.name} - location not found (${npcData.location_key})`);
          skipped++;
          continue;
        }

        const locationId = locResult.rows[0].id;

        // Create or get hotspot
        const hotspotResult = await db.query(
          `INSERT INTO hotspots (node_id, hotspot_key, name, hotspot_type, position_x, position_y)
           VALUES ($1, $2, $3, 'npc', 0, 0)
           ON CONFLICT (node_id, hotspot_key) DO UPDATE SET name = $3
           RETURNING id`,
          [locationId, npcData.name.toLowerCase().replace(/\s+/g, '_'), npcData.hotspot_name]
        );

        const hotspotId = hotspotResult.rows[0].id;

        // Check if NPC already exists
        const existingNPC = await db.query(
          'SELECT id FROM npcs WHERE hotspot_id = $1 AND name = $2',
          [hotspotId, npcData.name]
        );

        if (existingNPC.rows.length > 0) {
          console.log(`  ⏭️  ${npcData.name} - already exists`);
          skipped++;
          continue;
        }

        // Create NPC
        const npcResult = await db.query(
          `INSERT INTO npcs 
           (hotspot_id, name, race, role, personality, dialogue_seed, initial_affinity, is_recruitable, recruitment_cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            hotspotId,
            npcData.name,
            npcData.race,
            npcData.role,
            JSON.stringify(npcData.personality),
            npcData.dialogue_seed,
            npcData.initial_affinity,
            npcData.is_recruitable,
            npcData.recruitment_cost || 0
          ]
        );

        const npcId = npcResult.rows[0].id;

        // Create NPC state
        await db.query(
          `INSERT INTO npc_state (npc_id, current_affinity, relationship_type)
           VALUES ($1, $2, 'neutral')`,
          [npcId, npcData.initial_affinity]
        );

        // Add inventory
        if (npcData.inventory && npcData.inventory.length > 0) {
          for (const invItem of npcData.inventory) {
            // Get item ID by key
            const itemResult = await db.query(
              'SELECT id FROM items_base WHERE item_key = $1',
              [invItem.item_key]
            );

            if (itemResult.rows.length > 0) {
              await db.query(
                `INSERT INTO npc_inventory (npc_id, item_id, quantity)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (npc_id, item_id) DO UPDATE SET quantity = $3`,
                [npcId, itemResult.rows[0].id, invItem.quantity]
              );
            }
          }
        }

        console.log(`  ✅ ${npcData.name} (${npcData.role}) - ${npcData.location_key}`);
        created++;
      } catch (err) {
        console.error(`  ❌ Failed to seed ${npcData.name}: ${err.message}`);
      }
    }

    console.log(`\n📊 NPC Seeding complete: ${created} created, ${skipped} skipped\n`);
    return { created, skipped };
  } catch (err) {
    console.error('Fatal error during NPC seeding:', err);
    throw err;
  }
}

// Export for use by seed.js
module.exports = seedNPCs;

// Allow running directly
if (require.main === module) {
  seedNPCs()
    .then(() => {
      console.log('✅ NPC seeding completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
