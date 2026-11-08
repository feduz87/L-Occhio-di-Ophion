/**
 * Database Seeding Script
 * Populates initial game data (items, NPCs, map nodes)
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with initial data...');

    // ========== WEAPONS ==========
    console.log('📋 Seeding weapons...');
    const longswordId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [longswordId, 'longsword', 'Longsword', 'A classic straight-bladed sword, perfect for warriors', 'weapon', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, damage_die, damage_modifier, gem_slots, durability_max, weight, requires_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [longswordId, 'd8', 0, 0, 100, 3, 13]
    );

    const shortswordId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [shortswordId, 'shortsword', 'Shortsword', 'A quick and nimble blade, favored by rogues', 'weapon', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, damage_die, damage_modifier, gem_slots, durability_max, weight, requires_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [shortswordId, 'd6', 0, 0, 80, 2, 10]
    );

    const daggerId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [daggerId, 'dagger', 'Dagger', 'A small sharp blade, useful for finishing blows', 'weapon', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, damage_die, damage_modifier, gem_slots, durability_max, weight, requires_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [daggerId, 'd4', 0, 0, 60, 1, 8]
    );

    const longbowId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [longbowId, 'longbow', 'Longbow', 'A powerful ranged weapon, requires strength to draw', 'weapon', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, damage_die, damage_modifier, gem_slots, durability_max, weight, requires_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [longbowId, 'd8', 0, 0, 90, 2, 15]
    );

    const maceId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [maceId, 'mace', 'Mace', 'A blunt weapon favored by divine casters', 'weapon', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, damage_die, damage_modifier, gem_slots, durability_max, weight, requires_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [maceId, 'd6', 0, 0, 120, 4, 13]
    );

    const quarterstaffId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [quarterstaffId, 'quarterstaff', 'Quarterstaff', 'A versatile wooden staff, used by scholars and warriors alike', 'weapon', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, damage_die, damage_modifier, gem_slots, durability_max, weight, requires_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [quarterstaffId, 'd6', 0, 0, 80, 4, 10]
    );

    // ========== ARMOR ==========
    console.log('🛡️  Seeding armor...');
    const leatherArmorId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [leatherArmorId, 'armor_leather', 'Leather Armor', 'Light protective armor made of cured leather', 'armor', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, armor_bonus, armor_type, durability_max, weight)
       VALUES ($1, $2, $3, $4, $5)`,
      [leatherArmorId, 1, 'light', 100, 10]
    );

    const woodShieldId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [woodShieldId, 'shield_wood', 'Wooden Shield', 'A sturdy wooden shield for defense', 'armor', 'common']
    );
    await pool.query(
      `INSERT INTO equipment_stats (item_id, armor_bonus, armor_type, durability_max, weight)
       VALUES ($1, $2, $3, $4, $5)`,
      [woodShieldId, 2, 'light', 80, 6]
    );

    // ========== CONSUMABLES ==========
    console.log('🧪 Seeding consumables...');
    const healingPotionId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity, lore_secret)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        healingPotionId,
        'potion_healing',
        'Healing Potion',
        'A simple vial of red liquid that smells of herbs',
        'consumable',
        'common',
        'Made by alchemists from the rare Thornflower, these potions have saved countless lives',
      ]
    );
    await pool.query(
      `INSERT INTO consumables_stats (item_id, consumable_type, effect, buff_duration_turns, spoilage_days)
       VALUES ($1, $2, $3, $4, $5)`,
      [healingPotionId, 'potion', JSON.stringify({ type: 'heal', value: 20 }), 0, 90]
    );

    // ========== INGREDIENTS ==========
    console.log('📦 Seeding ingredients...');
    const ironOreId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ironOreId, 'ore_iron', 'Iron Ore', 'Raw iron ore from the depths of the earth', 'ingredient', 'common']
    );
    await pool.query(
      `INSERT INTO crafting_ingredients (item_id, ingredient_type, tier, crafting_affinity, stat_boost)
       VALUES ($1, $2, $3, $4, $5)`,
      [ironOreId, 'ore', 1, 'forge', JSON.stringify({})]
    );

    // ========== SPECIAL ITEMS ==========
    console.log('✨ Seeding special items...');
    const spellbookId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [spellbookId, 'spellbook_starter', 'Apprentice Spellbook', 'A worn spellbook containing basic cantrips', 'artifact', 'common']
    );

    const holySymbolId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [holySymbolId, 'holy_symbol', 'Holy Symbol', 'A sacred symbol that grants divine power', 'artifact', 'common']
    );

    const healingKitId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [healingKitId, 'healing_kit', 'Healing Kit', 'A collection of bandages, herbs, and tools for treating wounds', 'tool', 'common']
    );

    const lockPicksId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [lockPicksId, 'lock_picks', 'Lock Picks', 'A set of fine tools for opening locks', 'tool', 'uncommon']
    );

    // ========== ARROWS ==========
    console.log('🎯 Seeding arrows...');
    const arrowBundleId = uuidv4();
    await pool.query(
      `INSERT INTO items_base (id, item_key, name, description_base, item_type, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [arrowBundleId, 'arrow_bundle', 'Bundle of Arrows', 'Twenty arrows for your bow', 'ammunition', 'common']
    );

    console.log('✅ Item seeding complete!');
    console.log('🎉 Database seeding successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
