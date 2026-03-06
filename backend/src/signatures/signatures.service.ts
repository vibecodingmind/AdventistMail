import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';

export interface Signature {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
}

export async function getUserSignatures(userId: string): Promise<Signature[]> {
  const result = await query<{ id: string; name: string; content: string; is_default: boolean }>(
    `SELECT id, name, content, is_default FROM user_signatures WHERE user_id = $1 ORDER BY is_default DESC, name`,
    [userId]
  );
  return result.rows;
}

export async function createUserSignature(
  userId: string,
  name: string,
  content: string,
  isDefault?: boolean
): Promise<Signature> {
  if (isDefault) {
    await query('UPDATE user_signatures SET is_default = false WHERE user_id = $1', [userId]);
  }
  const id = uuidv4();
  await query(
    `INSERT INTO user_signatures (id, user_id, name, content, is_default) VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, name, content, !!isDefault]
  );
  return { id, name, content, is_default: !!isDefault };
}

export async function updateUserSignature(
  userId: string,
  signatureId: string,
  updates: { name?: string; content?: string; is_default?: boolean }
): Promise<boolean> {
  if (updates.is_default) {
    await query('UPDATE user_signatures SET is_default = false WHERE user_id = $1', [userId]);
  }
  const cols: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (updates.name !== undefined) { cols.push(`name = $${i++}`); vals.push(updates.name); }
  if (updates.content !== undefined) { cols.push(`content = $${i++}`); vals.push(updates.content); }
  if (updates.is_default !== undefined) { cols.push(`is_default = $${i++}`); vals.push(updates.is_default); }
  if (cols.length === 0) return true;
  vals.push(signatureId, userId);
  const result = await query(
    `UPDATE user_signatures SET ${cols.join(', ')} WHERE id = $${i} AND user_id = $${i + 1}`,
    vals
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteUserSignature(userId: string, signatureId: string): Promise<boolean> {
  const result = await query('DELETE FROM user_signatures WHERE id = $1 AND user_id = $2', [signatureId, userId]);
  return (result.rowCount ?? 0) > 0;
}
