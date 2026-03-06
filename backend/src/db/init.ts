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

  // Migration: organizations table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        requested_email VARCHAR(255) NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mailbox_id UUID REFERENCES mailboxes(id),
        is_verified BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    `);
  } catch {
    // Table might already exist
  }

  // Migration: organization_id on audit_logs
  try {
    await pool.query(`
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
    `);
  } catch {
    // Column might already exist - try without FK
    try {
      await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID`);
    } catch {
      // Ignore
    }
  }

  // Migration: organization_members table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'org_member',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        invited_by UUID REFERENCES users(id),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: organization_invites table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: organization_email_requests table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_email_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        requested_email VARCHAR(255) NOT NULL,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        mailbox_id UUID REFERENCES mailboxes(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: user_signatures table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_signatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: organization_signatures table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_signatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: email_templates table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body_html TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: filter_rules table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS filter_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        match_from VARCHAR(255),
        match_to VARCHAR(255),
        match_subject VARCHAR(255),
        match_has_attachment BOOLEAN DEFAULT false,
        action_move VARCHAR(100),
        action_mark_read BOOLEAN DEFAULT false,
        action_add_label VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: scheduled_emails table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_addr VARCHAR(255) NOT NULL,
        to_addrs TEXT[] NOT NULL,
        cc_addrs TEXT[],
        bcc_addrs TEXT[],
        subject VARCHAR(500) NOT NULL,
        html_body TEXT,
        text_body TEXT,
        send_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: security_alerts table (login from new device/location)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: allowed_domains table (admin domain management)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allowed_domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: snoozed_emails table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS snoozed_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_uid INT NOT NULL,
        folder VARCHAR(100) NOT NULL,
        mailbox VARCHAR(255),
        snooze_until TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: org branding columns
  try {
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#047857'`);
  } catch {
    // Columns might already exist
  }

  // Migration: webhooks table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        url VARCHAR(1000) NOT NULL,
        events TEXT[] NOT NULL,
        secret VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: password policy (password_min_length, etc. - store in app config or users)
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ`);
  } catch {
    // Column might already exist
  }

  // Migration: known_devices for security alerts (avoid alerting every login)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS known_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_hash VARCHAR(64) NOT NULL,
        last_seen_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, device_hash)
      )
    `);
  } catch {
    // Table might already exist
  }

  // Migration: scheduled_email_attachments (store attachment refs for scheduled emails)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_email_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduled_email_id UUID NOT NULL REFERENCES scheduled_emails(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        content_base64 TEXT NOT NULL,
        content_type VARCHAR(100) DEFAULT 'application/octet-stream'
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
