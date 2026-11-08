import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const pool = new Pool(dbConfig);

async function initializeDatabase() {
  try {
    console.log('🗄️  Initializing L\'Occhio di Ophion database...');

    // Read all schema files in order
    const schemaFiles = [
      '01_schema_core.sql',
      '02_schema_world.sql',
      '03_schema_combat.sql',
      '04_schema_quests.sql',
      '05_schema_ia.sql',
    ];

    for (const file of schemaFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Schema file not found: ${filePath}`);
        process.exit(1);
      }

      console.log(`📄 Executing: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await pool.query(sql);
      console.log(`✅ ${file} completed`);
    }

    console.log('✅ Database initialization successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
