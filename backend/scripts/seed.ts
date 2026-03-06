/**
 * Seed script: creates initial super_admin user for development.
 * Run: npx tsx scripts/seed.ts
 *
 * Creates user: admin@church.org / admin123
 * (Change password after first login)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/db/index.js';

async function seed() {
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

  console.log(`Created/updated admin user: ${email}`);
  console.log('Password: admin123 (change after first login)');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
