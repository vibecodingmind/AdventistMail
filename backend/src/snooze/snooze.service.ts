import { query as dbQuery } from '../db/index.js';

export interface SnoozedEmail {
  id: string;
  user_id: string;
  message_uid: number;
  folder: string;
  mailbox: string | null;
  snooze_until: string;
  created_at: string;
}

export async function snoozeMessage(
  userId: string,
  messageUid: number,
  folder: string,
  snoozeUntil: Date,
  mailbox?: string
): Promise<SnoozedEmail> {
  await dbQuery(
    `DELETE FROM snoozed_emails WHERE user_id = $1 AND message_uid = $2 AND folder = $3 AND (mailbox IS NOT DISTINCT FROM $4)`,
    [userId, messageUid, folder, mailbox || null]
  );
  const r = await dbQuery<SnoozedEmail>(
    `INSERT INTO snoozed_emails (user_id, message_uid, folder, mailbox, snooze_until)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, message_uid, folder, mailbox, snooze_until, created_at`,
    [userId, messageUid, folder, mailbox || null, snoozeUntil]
  );
  return r.rows[0];
}

export async function unsnoozeMessage(
  userId: string,
  messageUid: number,
  folder: string,
  mailbox?: string
): Promise<boolean> {
  const r = await dbQuery(
    'DELETE FROM snoozed_emails WHERE user_id = $1 AND message_uid = $2 AND folder = $3 AND (mailbox IS NOT DISTINCT FROM $4) RETURNING id',
    [userId, messageUid, folder, mailbox || null]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function getSnoozedUids(
  userId: string,
  folder: string,
  mailbox?: string | null
): Promise<Set<number>> {
  const r = await dbQuery<{ message_uid: number }>(
    `SELECT message_uid FROM snoozed_emails
     WHERE user_id = $1 AND folder = $2 AND (mailbox IS NOT DISTINCT FROM $3) AND snooze_until > NOW()`,
    [userId, folder, mailbox ?? null]
  );
  return new Set(r.rows.map((x) => x.message_uid));
}
