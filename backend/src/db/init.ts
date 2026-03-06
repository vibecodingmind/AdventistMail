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

  // Migration: storage_plans table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        bytes_limit BIGINT,
        price_label VARCHAR(50) DEFAULT 'Free',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: users storage columns
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_plan_id UUID REFERENCES storage_plans(id)
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0
    `);
  } catch {
    // Columns might already exist
  }

  // Migration: storage_upgrade_requests table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_upgrade_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_plan_id UUID REFERENCES storage_plans(id),
        requested_plan_id UUID NOT NULL REFERENCES storage_plans(id),
        status VARCHAR(20) DEFAULT 'pending',
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  console.log('Database schema initialized');

  // Seed storage plans
  try {
    await seedStoragePlans();
  } catch (err) {
    console.warn('Storage plans seed skipped:', (err as Error).message);
  }

  // Seed test accounts (for Railway/deployment)
  try {
    await seedTestAccounts();
  } catch (err) {
    console.warn('Seed skipped:', (err as Error).message);
  }
}

async function seedStoragePlans(): Promise<void> {
  const plans = [
    { name: 'Free', bytes_limit: 500 * 1024 * 1024, price_label: 'Free' },       // 500 MB
    { name: 'Standard', bytes_limit: 5 * 1024 * 1024 * 1024, price_label: 'Standard' },  // 5 GB
    { name: 'Premium', bytes_limit: 25 * 1024 * 1024 * 1024, price_label: 'Premium' },  // 25 GB
    { name: 'Unlimited', bytes_limit: null, price_label: 'Admin only' },
  ];
  for (const p of plans) {
    await pool.query(
      `INSERT INTO storage_plans (name, bytes_limit, price_label)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET bytes_limit = $2, price_label = $3`,
      [p.name, p.bytes_limit, p.price_label]
    );
  }
  console.log('Storage plans ready: Free (500MB), Standard (5GB), Premium (25GB), Unlimited');
}

async function seedTestAccounts(): Promise<void> {
  const accounts = [
    { email: 'superadmin@church.org', displayName: 'Super Admin',  role: 'super_admin', password: 'superadmin123' },
    { email: 'admin@church.org',      displayName: 'Admin User',    role: 'admin',       password: 'admin123'      },
    { email: 'user@church.org',       displayName: 'Test User',     role: 'user',        password: 'user1234'      },
  ];

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $5, role = $4, is_verified = true`,
      [id, account.email, account.displayName, account.role, passwordHash]
    );
    console.log(`Test account ready: ${account.email} / ${account.password} (${account.role})`);
  }
}
