import { query as dbQuery } from '../db/index.js';

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
}

export async function listTemplates(userId: string): Promise<EmailTemplate[]> {
  const r = await dbQuery<EmailTemplate>(
    `SELECT id, user_id, name, subject, body_html, created_at
     FROM email_templates WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function getTemplate(userId: string, id: string): Promise<EmailTemplate | null> {
  const r = await dbQuery<EmailTemplate>(
    'SELECT id, user_id, name, subject, body_html, created_at FROM email_templates WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return r.rows[0] || null;
}

export async function createTemplate(
  userId: string,
  data: { name: string; subject: string; body_html: string }
): Promise<EmailTemplate> {
  const r = await dbQuery<EmailTemplate>(
    `INSERT INTO email_templates (user_id, name, subject, body_html)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, subject, body_html, created_at`,
    [userId, data.name, data.subject, data.body_html]
  );
  return r.rows[0];
}

export async function updateTemplate(
  userId: string,
  id: string,
  data: { name?: string; subject?: string; body_html?: string }
): Promise<EmailTemplate | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (data.name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.subject !== undefined) {
    updates.push(`subject = $${idx++}`);
    values.push(data.subject);
  }
  if (data.body_html !== undefined) {
    updates.push(`body_html = $${idx++}`);
    values.push(data.body_html);
  }
  if (updates.length === 0) return getTemplate(userId, id);
  values.push(id, userId);
  const r = await dbQuery<EmailTemplate>(
    `UPDATE email_templates SET ${updates.join(', ')}
     WHERE id = $${idx} AND user_id = $${idx + 1}
     RETURNING id, user_id, name, subject, body_html, created_at`,
    values
  );
  return r.rows[0] || null;
}

export async function deleteTemplate(userId: string, id: string): Promise<boolean> {
  const r = await dbQuery(
    'DELETE FROM email_templates WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return r.rowCount !== null && r.rowCount > 0;
}
