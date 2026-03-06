import { query as dbQuery } from '../db/index.js';

export interface FilterRule {
  id: string;
  user_id: string;
  name: string;
  match_from: string | null;
  match_to: string | null;
  match_subject: string | null;
  match_has_attachment: boolean;
  action_move: string | null;
  action_mark_read: boolean;
  action_add_label: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export async function listRules(userId: string): Promise<FilterRule[]> {
  const r = await dbQuery<FilterRule>(
    `SELECT * FROM filter_rules WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [userId]
  );
  return r.rows;
}

export async function createRule(
  userId: string,
  data: Partial<{
    name: string;
    match_from: string;
    match_to: string;
    match_subject: string;
    match_has_attachment: boolean;
    action_move: string;
    action_mark_read: boolean;
    action_add_label: string;
    is_active: boolean;
    sort_order: number;
  }>
): Promise<FilterRule> {
  const r = await dbQuery<FilterRule>(
    `INSERT INTO filter_rules (
      user_id, name, match_from, match_to, match_subject, match_has_attachment,
      action_move, action_mark_read, action_add_label, is_active, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      userId,
      data.name || 'Rule',
      data.match_from || null,
      data.match_to || null,
      data.match_subject || null,
      data.match_has_attachment ?? false,
      data.action_move || null,
      data.action_mark_read ?? false,
      data.action_add_label || null,
      data.is_active ?? true,
      data.sort_order ?? 0,
    ]
  );
  return r.rows[0];
}

export async function updateRule(userId: string, id: string, data: Partial<FilterRule>): Promise<FilterRule | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  const allowed = [
    'name', 'match_from', 'match_to', 'match_subject', 'match_has_attachment',
    'action_move', 'action_mark_read', 'action_add_label', 'is_active', 'sort_order',
  ];
  for (const key of allowed) {
    const v = (data as Record<string, unknown>)[key];
    if (v !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(v);
    }
  }
  if (updates.length === 0) {
    const r = await dbQuery<FilterRule>('SELECT * FROM filter_rules WHERE id = $1 AND user_id = $2', [id, userId]);
    return r.rows[0] || null;
  }
  values.push(id, userId);
  const r = await dbQuery<FilterRule>(
    `UPDATE filter_rules SET ${updates.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    values
  );
  return r.rows[0] || null;
}

export async function deleteRule(userId: string, id: string): Promise<boolean> {
  const r = await dbQuery('DELETE FROM filter_rules WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return (r.rowCount ?? 0) > 0;
}
