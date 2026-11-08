/**
 * Seed World Map Nodes
 * 
 * Creates base world structure:
 * - 4 Settlements (safe havens, trading hubs)
 * - 3 Dungeons (dangerous exploration sites)
 * - 6 Wilderness areas (connecting routes, random encounters)
 * 
 * Total: 13 locations for Phase 3B exploration
 */

const db = require('./init');

const LOCATIONS = [
  // ============================================================================
  // SETTLEMENTS (Safe havens, trading hubs, quest givers)
  // ============================================================================
  
  {
    node_key: 'port-town',
    name: 'Port Town',
    description: 'A bustling coastal settlement where merchants gather. Salt spray mingles with the scent of exotic goods from distant lands. Taverns line the docks, and adventurers crowd the streets seeking fortune on the high seas or in nearby ruins.',
    region: 'Coast',
    node_type: 'settlement',
    weather_current: 'clear',
    danger_level: 1,
    background_art_path: '/img/locations/port-town.png'
  },
  
  {
    node_key: 'mountain-keep',
    name: 'Mountain Keep',
    description: 'A dwarven stronghold carved into living stone, deep within the peaks. The forges burn day and night, crafting weapons and armor of unparalleled quality. The halls echo with dwarven laughter and the ringing of hammers on anvils.',
    region: 'Mountain',
    node_type: 'settlement',
    weather_current: 'clear',
    danger_level: 2,
    background_art_path: '/img/locations/mountain-keep.png'
  },
  
  {
    node_key: 'forest-sanctuary',
    name: 'Forest Sanctuary',
    description: 'An ancient elven settlement hidden deep within the woods. Treehouse dwellings and natural structures blend seamlessly with the forest canopy. The air is filled with birdsong and the faint glow of magical lights woven between the branches.',
    region: 'Forest',
    node_type: 'settlement',
    weather_current: 'clear',
    danger_level: 2,
    background_art_path: '/img/locations/forest-sanctuary.png'
  },
  
  {
    node_key: 'desert-encampment',
    name: 'Desert Encampment',
    description: 'A temporary settlement of nomadic traders in the heart of the sand. Colorful tents and market stalls create a maze of exotic goods. The air shimmers with heat, and the traders eye you with the wariness of desert folk.',
    region: 'Desert',
    node_type: 'settlement',
    weather_current: 'clear',
    danger_level: 3,
    background_art_path: '/img/locations/desert-encampment.png'
  },

  // ============================================================================
  // DUNGEONS (Dangerous exploration sites with treasures)
  // ============================================================================
  
  {
    node_key: 'crypt-of-ancients',
    name: 'Crypt of Ancients',
    description: 'A crumbling burial site near Port Town, forgotten by time. Stone sarcophagi line the walls of the main chamber. Strange glyphs glow faintly in the darkness, and the air tastes of age and dust. The skeletal remains of previous adventurers serve as grim warnings.',
    region: 'Coast',
    node_type: 'dungeon',
    weather_current: 'clear',
    danger_level: 2,
    background_art_path: '/img/locations/crypt-of-ancients.png'
  },
  
  {
    node_key: 'dragons-hoard',
    name: "Dragon's Hoard",
    description: 'The legendary lair of an ancient dragon atop the highest mountain peak. Massive tunnels carved by dragon claws lead into the mountain. Piles of treasure glitter in the dim light filtering through cracks in the stone. The air is hot and smells of sulfur and gold.',
    region: 'Mountain',
    node_type: 'dungeon',
    weather_current: 'clear',
    danger_level: 5,
    background_art_path: '/img/locations/dragons-hoard.png'
  },
  
  {
    node_key: 'shadow-woods',
    name: 'Shadow Woods',
    description: 'A dark forest shrouded in perpetual twilight, where the canopy blocks out the sky. Twisted trees with gnarled branches create an maze-like terrain. Strange sounds echo through the darkness, and shadows seem to move of their own accord. The very air feels malevolent.',
    region: 'Forest',
    node_type: 'dungeon',
    weather_current: 'clear',
    danger_level: 3,
    background_art_path: '/img/locations/shadow-woods.png'
  },

  // ============================================================================
  // WILDERNESS (Connecting routes, random encounters, hidden discoveries)
  // ============================================================================
  
  {
    node_key: 'coastal-road',
    name: 'Coastal Road',
    description: 'A well-traveled path hugging the coastline, connecting Port Town to distant lands. Wildflowers bloom along the cliff edge, and the ocean spray cools the air. Merchants and adventurers regularly traverse this route, making it relatively safe during daylight hours.',
    region: 'Coast',
    node_type: 'wilderness',
    weather_current: 'clear',
    danger_level: 1,
    background_art_path: '/img/locations/coastal-road.png'
  },
  
  {
    node_key: 'mountain-pass',
    name: 'Mountain Pass',
    description: 'A narrow, winding path through the peaks connecting the mountains to lower lands. Snow clings to the shadowed cliffs despite the season. The wind howls through the pass, and loose rocks threaten to send unwary travelers tumbling. Weather here changes rapidly and dramatically.',
    region: 'Mountain',
    node_type: 'wilderness',
    weather_current: 'clear',
    danger_level: 2,
    background_art_path: '/img/locations/mountain-pass.png'
  },
  
  {
    node_key: 'forest-trail',
    name: 'Forest Trail',
    description: 'A narrow path winding through dense woodlands. Massive trees tower overhead, creating dappled shadows on the forest floor. Animal tracks crisscross the trail, and the sounds of the wild echo all around. Ancient ruins peek out from beneath centuries of moss and vines.',
    region: 'Forest',
    node_type: 'wilderness',
    weather_current: 'clear',
    danger_level: 2,
    background_art_path: '/img/locations/forest-trail.png'
  },
  
  {
    node_key: 'desert-path',
    name: 'Desert Path',
    description: 'A scorching route across endless sand and rock. The sun beats down mercilessly, turning the sand to glass in places. Mirages shimmer on the horizon, and the occasional water source marks where caravans stop to rest. Nomadic tribes use this path, and bandits occasionally haunt it.',
    region: 'Desert',
    node_type: 'wilderness',
    weather_current: 'clear',
    danger_level: 3,
    background_art_path: '/img/locations/desert-path.png'
  },
  
  {
    node_key: 'hidden-valley',
    name: 'Hidden Valley',
    description: 'A sheltered valley hidden between mountains and forests, rarely found by accident. Crystal-clear streams flow through meadows of wildflowers. Ancient stone monuments dot the landscape, their purpose unknown. The valley feels untouched by time, serene and eternal.',
    region: 'Mountain',
    node_type: 'wilderness',
    weather_current: 'clear',
    danger_level: 2,
    background_art_path: '/img/locations/hidden-valley.png'
  },
  
  {
    node_key: 'wildlands-frontier',
    name: 'Wildlands Frontier',
    description: 'The unexplored frontier beyond civilization, where few dare to venture. Untamed wilderness stretches in all directions. Strange creatures roam these lands, and ancient magic crackles in the air. Discovery awaits those brave or foolish enough to venture here.',
    region: 'Frontier',
    node_type: 'wilderness',
    weather_current: 'clear',
    danger_level: 4,
    background_art_path: '/img/locations/wildlands-frontier.png'
  }
];

/**
 * Seed locations into database
 */
async function seedLocations() {
  try {
    console.log('🗺️  Seeding world map locations...');
    
    let created = 0;
    let skipped = 0;

    for (const location of LOCATIONS) {
      try {
        // Check if already exists
        const existing = await db.query(
          'SELECT id FROM map_nodes WHERE node_key = $1',
          [location.node_key]
        );

        if (existing.rows.length > 0) {
          console.log(`  ⏭️  ${location.name} (${location.node_key}) - already exists`);
          skipped++;
          continue;
        }

        // Insert location
        const result = await db.query(
          `INSERT INTO map_nodes 
           (node_key, name, description, region, node_type, weather_current, danger_level, background_art_path)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            location.node_key,
            location.name,
            location.description,
            location.region,
            location.node_type,
            location.weather_current,
            location.danger_level,
            location.background_art_path
          ]
        );

        console.log(`  ✅ ${location.name} (${location.node_key})`);
        created++;
      } catch (err) {
        console.error(`  ❌ Failed to seed ${location.node_key}: ${err.message}`);
      }
    }

    console.log(`\n📊 Seeding complete: ${created} created, ${skipped} skipped\n`);
    return { created, skipped };
  } catch (err) {
    console.error('Fatal error during seeding:', err);
    throw err;
  }
}

// Export for use by seed.js
module.exports = seedLocations;

// Allow running directly
if (require.main === module) {
  seedLocations()
    .then(() => {
      console.log('✅ Location seeding completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
