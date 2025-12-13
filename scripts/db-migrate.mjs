#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting migration.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureMigrationsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
}

async function hasMigration(name) {
  const res = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  return res.rowCount > 0;
}

async function applyMigration(name, sql) {
  console.log(`Applying migration: ${name}`);
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`Migration failed: ${name}`);
    throw error;
  }
}

async function main() {
  await ensureMigrationsTable();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const alreadyApplied = await hasMigration(file);
    if (alreadyApplied) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // eslint-disable-next-line no-await-in-loop
    await applyMigration(file, sql);
  }

  await pool.end();
  console.log('Migration complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
