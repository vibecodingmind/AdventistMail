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

  // Migration: add is_verified for signup flow (admin must verify new signups)
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true
    `);
    await pool.query(`UPDATE users SET is_verified = true WHERE is_verified IS NULL`);
  } catch {
    // Column might already exist
  }

  // Migration: add google_id for Google OAuth
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)
    `);
  } catch {
    // Column might already exist
  }

  // Migration: email_requests table for church email assignment flow
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_email VARCHAR(255) NOT NULL,
        church_name VARCHAR(255),
        purpose TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: password_reset_tokens table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
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
    `INSERT INTO users (id, email, display_name, role, password_hash, is_verified)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET password_hash = $5, role = $4, is_verified = true`,
    [id, email, 'System Admin', 'super_admin', passwordHash]
  );
  console.log('Admin user ready: admin@church.org (change password after first login)');
}
