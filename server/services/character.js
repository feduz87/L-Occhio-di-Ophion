/**
 * Character Service - Business logic for character creation & management
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Validate heritage for a given race
 */
export function validateHeritage(race, heritage) {
  const validHeritages = {
    'Uomini': ['Sangue Antico', 'Discendenza delle Dune', 'Uomini del Nord'],
    'Elfi': ['Alti Elfi', 'Elfi Silvani', 'Cantori delle Coste'],
    'Nani': ['Barbalunga', 'Pugnodiferro', 'Esiliati delle Profondità'],
    'Mezzuomini': ['Pelopiedi', 'Gente dei Fiumi'],
    'Bruti': ['Bruti'],
    'Goblin': ['Goblin'],
    'Orchi': ['Orchi'],
  };

  if (!validHeritages[race]) {
    throw new Error(`Invalid race: ${race}`);
  }

  if (!validHeritages[race].includes(heritage)) {
    throw new Error(`Invalid heritage '${heritage}' for race '${race}'`);
  }
}

/**
 * Validate class
 */
export function validateClass(charClass) {
  const validClasses = ['Guerriero', 'Ramingo', 'Ladro', 'Sapiente', 'Guaritore'];
  if (!validClasses.includes(charClass)) {
    throw new Error(`Invalid class: ${charClass}`);
  }
}

/**
 * Validate character name
 */
export function validateName(name) {
  if (!name || name.trim().length === 0) {
    throw new Error('Character name cannot be empty');
  }
  if (name.length > 255) {
    throw new Error('Character name too long (max 255 characters)');
  }
}

/**
 * Generate ability scores using 4d6 drop lowest method
 * Returns array of 6 scores in order: STR, DEX, CON, INT, WIS, CHA
 */
export function generateAbilityScores() {
  const scores = [];

  for (let i = 0; i < 6; i++) {
    const rolls = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    // Sort descending and drop lowest
    rolls.sort((a, b) => b - a);
    const score = rolls[0] + rolls[1] + rolls[2]; // Sum of 3 highest
    scores.push(Math.max(3, Math.min(18, score))); // Clamp 3-18
  }

  return scores;
}

/**
 * Apply racial modifiers to ability scores
 */
export function applyRacialModifiers(scores, race, heritage) {
  const [str, dex, con, int, wis, cha] = scores;
  const modifiers = [0, 0, 0, 0, 0, 0]; // [STR, DEX, CON, INT, WIS, CHA]

  // Apply heritage-specific modifiers
  if (race === 'Uomini') {
    if (heritage === 'Sangue Antico') {
      modifiers[0] += 1; // +STR
      modifiers[2] += 1; // +CON
      modifiers[5] += 1; // +CHA
    } else if (heritage === 'Discendenza delle Dune') {
      modifiers[1] += 1; // +DEX
    } else if (heritage === 'Uomini del Nord') {
      modifiers[2] += 1; // +CON
    }
  } else if (race === 'Elfi') {
    modifiers[1] += 2; // +DEX universale
    if (heritage === 'Alti Elfi') {
      modifiers[3] += 1; // +INT
    } else if (heritage === 'Elfi Silvani') {
      modifiers[4] += 1; // +WIS
    } else if (heritage === 'Cantori delle Coste') {
      modifiers[4] += 1; // +WIS
    }
  } else if (race === 'Nani') {
    modifiers[2] += 1; // +CON universale
    if (heritage === 'Barbalunga') {
      modifiers[2] += 1; // +1 CON extra
    } else if (heritage === 'Pugnodiferro') {
      modifiers[0] += 1; // +STR
    }
  } else if (race === 'Mezzuomini') {
    modifiers[1] += 2; // +DEX universale
    if (heritage === 'Gente dei Fiumi') {
      modifiers[4] += 1; // +WIS
    }
  } else if (race === 'Bruti') {
    modifiers[0] += 2; // +STR
    modifiers[2] += 1; // +CON
  } else if (race === 'Goblin') {
    modifiers[1] += 2; // +DEX
  } else if (race === 'Orchi') {
    modifiers[0] += 1; // +STR
    modifiers[5] += 1; // +CHA (surprisingly)
  }

  return [
    Math.min(18, str + modifiers[0]),
    Math.min(18, dex + modifiers[1]),
    Math.min(18, con + modifiers[2]),
    Math.min(18, int + modifiers[3]),
    Math.min(18, wis + modifiers[4]),
    Math.min(18, cha + modifiers[5]),
  ];
}

/**
 * Calculate HP based on class and constitution
 */
export function calculateHP(charClass, constitutionModifier) {
  const baseHP = {
    'Guerriero': 10,
    'Ramingo': 10,
    'Ladro': 8,
    'Sapiente': 6,
    'Guaritore': 8,
  };

  const classHP = baseHP[charClass] || 8;
  const modifiedHP = Math.max(1, classHP + constitutionModifier);

  return modifiedHP;
}

/**
 * Calculate AC based on class and dexterity
 */
export function calculateAC(charClass, dexterityModifier) {
  // Base AC without armor
  const baseAC = {
    'Guerriero': 10, // Can wear armor
    'Ramingo': 11,
    'Ladro': 11,
    'Sapiente': 10,
    'Guaritore': 10,
  };

  const classAC = baseAC[charClass] || 10;
  const ac = classAC + dexterityModifier;

  return Math.max(8, ac); // Minimum AC 8
}

/**
 * Get starting equipment for a class
 */
export function getStartingEquipment(charClass) {
  const equipment = {
    'Guerriero': [
      { item_key: 'longsword', quantity: 1 },
      { item_key: 'shield_wood', quantity: 1 },
      { item_key: 'armor_leather', quantity: 1 },
    ],
    'Ramingo': [
      { item_key: 'shortsword', quantity: 2 },
      { item_key: 'longbow', quantity: 1 },
      { item_key: 'arrow_bundle', quantity: 20 },
      { item_key: 'armor_leather', quantity: 1 },
    ],
    'Ladro': [
      { item_key: 'shortsword', quantity: 1 },
      { item_key: 'dagger', quantity: 2 },
      { item_key: 'lock_picks', quantity: 1 },
      { item_key: 'armor_leather', quantity: 1 },
    ],
    'Sapiente': [
      { item_key: 'quarterstaff', quantity: 1 },
      { item_key: 'spellbook_starter', quantity: 1 },
    ],
    'Guaritore': [
      { item_key: 'mace', quantity: 1 },
      { item_key: 'holy_symbol', quantity: 1 },
      { item_key: 'healing_kit', quantity: 1 },
    ],
  };

  return equipment[charClass] || [];
}

/**
 * Get starting gold for a class
 */
export function getStartingGold(charClass) {
  const gold = {
    'Guerriero': 50,
    'Ramingo': 40,
    'Ladro': 60,
    'Sapiente': 30,
    'Guaritore': 40,
  };

  return gold[charClass] || 40;
}

/**
 * Calculate ability modifiers from scores
 */
export function calculateModifiers(scores) {
  return scores.map(score => Math.floor((score - 10) / 2));
}

/**
 * Create character in database
 */
export async function createCharacter(db, userId, characterData) {
  // Validate input
  validateName(characterData.name);
  validateClass(characterData.class);
  validateHeritage(characterData.race, characterData.heritage);

  // Check for duplicate character name for this user
  const existingChar = await db.query(
    'SELECT id FROM characters WHERE user_id = $1 AND name = $2',
    [userId, characterData.name]
  );

  if (existingChar.rows.length > 0) {
    throw new Error(`Character name '${characterData.name}' already exists for this user`);
  }

  // Generate ability scores
  const rawScores = generateAbilityScores();
  const scores = applyRacialModifiers(rawScores, characterData.race, characterData.heritage);
  const modifiers = calculateModifiers(scores);

  // Calculate derived stats
  const hp = calculateHP(characterData.class, modifiers[2]); // CON modifier
  const ac = calculateAC(characterData.class, modifiers[1]); // DEX modifier

  // Character ID
  const characterId = uuidv4();

  try {
    // Start transaction
    await db.query('BEGIN');

    // Insert character
    await db.query(
      `INSERT INTO characters (id, user_id, name, heritage, race, class, level, experience_points, masteries_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [characterId, userId, characterData.name, characterData.heritage, characterData.race, characterData.class, 1, 0, 0]
    );

    // Insert character stats
    await db.query(
      `INSERT INTO character_stats (character_id, strength, dexterity, constitution, intelligence, wisdom, charisma, hit_points, hit_points_max, armor_class, initiative_bonus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        characterId,
        scores[0], // STR
        scores[1], // DEX
        scores[2], // CON
        scores[3], // INT
        scores[4], // WIS
        scores[5], // CHA
        hp,
        hp,
        ac,
        modifiers[1], // DEX modifier for initiative
      ]
    );

    // Insert character resources
    const startingGold = getStartingGold(characterData.class);
    await db.query(
      `INSERT INTO character_resources (character_id, gold, rations, encumbrance, encumbrance_max, fatigue_level, willpower_slots, willpower_slots_max)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [characterId, startingGold, 5, 0, 100, 0, 3, 3]
    );

    // Insert character status
    await db.query(
      `INSERT INTO character_status (character_id, health_state, condition_flags, diseases)
       VALUES ($1, $2, $3, $4)`,
      [characterId, 'illeso', '{}', '{}']
    );

    // Add starting equipment to inventory
    const startingEquipment = getStartingEquipment(characterData.class);
    for (const equipItem of startingEquipment) {
      // Get item ID by key
      const itemResult = await db.query(
        'SELECT id FROM items_base WHERE item_key = $1',
        [equipItem.item_key]
      );

      if (itemResult.rows.length > 0) {
        const itemId = itemResult.rows[0].id;
        await db.query(
          `INSERT INTO inventory_slots (character_id, item_id, quantity, equipped)
           VALUES ($1, $2, $3, $4)`,
          [characterId, itemId, equipItem.quantity, false]
        );
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    return {
      character_id: characterId,
      name: characterData.name,
      heritage: characterData.heritage,
      race: characterData.race,
      class: characterData.class,
      level: 1,
      experience_points: 0,
      masteries_points: 0,
      hit_points: hp,
      hit_points_max: hp,
      armor_class: ac,
      stats: {
        strength: scores[0],
        dexterity: scores[1],
        constitution: scores[2],
        intelligence: scores[3],
        wisdom: scores[4],
        charisma: scores[5],
      },
      modifiers: {
        strength: modifiers[0],
        dexterity: modifiers[1],
        constitution: modifiers[2],
        intelligence: modifiers[3],
        wisdom: modifiers[4],
        charisma: modifiers[5],
      },
      resources: {
        gold: startingGold,
        rations: 5,
        willpower_slots: 3,
        willpower_slots_max: 3,
      },
    };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

/**
 * Get character by ID with all components
 */
export async function getCharacterById(db, characterId, userId) {
  // Get main character
  const charResult = await db.query(
    `SELECT c.*, 
            cs.strength, cs.dexterity, cs.constitution, cs.intelligence, cs.wisdom, cs.charisma,
            cs.hit_points, cs.hit_points_max, cs.armor_class, cs.initiative_bonus,
            cr.gold, cr.rations, cr.encumbrance, cr.encumbrance_max, cr.fatigue_level,
            cr.willpower_slots, cr.willpower_slots_max
     FROM characters c
     LEFT JOIN character_stats cs ON c.id = cs.character_id
     LEFT JOIN character_resources cr ON c.id = cr.character_id
     WHERE c.id = $1 AND c.user_id = $2`,
    [characterId, userId]
  );

  if (charResult.rows.length === 0) {
    throw new Error('Character not found');
  }

  const char = charResult.rows[0];

  // Calculate modifiers
  const modifiers = {
    strength: Math.floor((char.strength - 10) / 2),
    dexterity: Math.floor((char.dexterity - 10) / 2),
    constitution: Math.floor((char.constitution - 10) / 2),
    intelligence: Math.floor((char.intelligence - 10) / 2),
    wisdom: Math.floor((char.wisdom - 10) / 2),
    charisma: Math.floor((char.charisma - 10) / 2),
  };

  // Get inventory
  const inventoryResult = await db.query(
    `SELECT inv.*, ib.name, ib.description_base, ib.item_type, ib.rarity
     FROM inventory_slots inv
     LEFT JOIN items_base ib ON inv.item_id = ib.id
     WHERE inv.character_id = $1
     ORDER BY inv.created_at`,
    [characterId]
  );

  return {
    character_id: char.id,
    name: char.name,
    heritage: char.heritage,
    race: char.race,
    class: char.class,
    level: char.level,
    experience_points: char.experience_points,
    masteries_points: char.masteries_points,
    hit_points: char.hit_points,
    hit_points_max: char.hit_points_max,
    armor_class: char.armor_class,
    stats: {
      strength: char.strength,
      dexterity: char.dexterity,
      constitution: char.constitution,
      intelligence: char.intelligence,
      wisdom: char.wisdom,
      charisma: char.charisma,
    },
    modifiers,
    resources: {
      gold: char.gold,
      rations: char.rations,
      encumbrance: char.encumbrance,
      encumbrance_max: char.encumbrance_max,
      fatigue_level: char.fatigue_level,
      willpower_slots: char.willpower_slots,
      willpower_slots_max: char.willpower_slots_max,
    },
    inventory: inventoryResult.rows.map(row => ({
      slot_id: row.id,
      item: {
        item_id: row.item_id,
        name: row.name,
        item_type: row.item_type,
        rarity: row.rarity,
      },
      quantity: row.quantity,
      equipped: row.equipped,
      condition: row.condition_percent,
    })),
    created_at: char.created_at,
    updated_at: char.updated_at,
  };
}

/**
 * List characters for a user
 */
export async function listCharactersByUser(db, userId) {
  const result = await db.query(
    `SELECT c.id, c.name, c.heritage, c.race, c.class, c.level, c.experience_points, c.created_at
     FROM characters c
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );

  return result.rows;
}
