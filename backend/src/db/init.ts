import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initDatabase(): Promise<void> {
  // schema.sql is copied to dist/db/ during build
  const schemaPath = join(__dirname, 'schema.sql');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}. Ensure build copies src/db/schema.sql to dist/db/`);
  }
  const schema = readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);

  // Migration: add password_hash if missing
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);
  } catch {
    // Column might already exist
  }

  console.log('Database schema initialized');

  // Seed default admin user if not exists (for Railway/deployment)
  try {
    await seedAdminUser();
  } catch (err) {
    console.warn('Admin seed skipped:', (err as Error).message);
  }
}

async function seedAdminUser(): Promise<void> {
  const email = 'admin@church.org';
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  await pool.query(
    `INSERT INTO users (id, email, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET password_hash = $5, role = $4`,
    [id, email, 'System Admin', 'super_admin', passwordHash]
  );
  console.log('Admin user ready: admin@church.org (change password after first login)');
}
