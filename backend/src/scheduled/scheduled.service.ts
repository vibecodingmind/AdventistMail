import { query as dbQuery } from '../db/index.js';
import { sendMail } from '../common/zimbra/index.js';
import { getImapCredentials } from '../common/redis.js';

export interface ScheduledEmail {
  id: string;
  user_id: string;
  from_addr: string;
  to_addrs: string[];
  cc_addrs: string[] | null;
  bcc_addrs: string[] | null;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  send_at: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export async function listScheduled(userId: string): Promise<ScheduledEmail[]> {
  const r = await dbQuery<ScheduledEmail & { to_addrs: string }>(
    `SELECT id, user_id, from_addr, to_addrs, cc_addrs, bcc_addrs, subject, html_body, text_body,
            send_at, status, sent_at, created_at
     FROM scheduled_emails
     WHERE user_id = $1 AND status = 'pending' AND send_at > NOW()
     ORDER BY send_at ASC`,
    [userId]
  );
  return r.rows.map((row) => ({
    ...row,
    to_addrs: Array.isArray(row.to_addrs) ? row.to_addrs : (row.to_addrs as unknown as string[]),
  }));
}

export async function createScheduled(
  userId: string,
  data: {
    from_addr: string;
    to_addrs: string[];
    cc_addrs?: string[];
    bcc_addrs?: string[];
    subject: string;
    html_body?: string;
    text_body?: string;
    send_at: string;
  }
): Promise<ScheduledEmail> {
  const r = await dbQuery<ScheduledEmail & { to_addrs: string }>(
    `INSERT INTO scheduled_emails (user_id, from_addr, to_addrs, cc_addrs, bcc_addrs, subject, html_body, text_body, send_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, from_addr, to_addrs, cc_addrs, bcc_addrs, subject, html_body, text_body, send_at, status, sent_at, created_at`,
    [
      userId,
      data.from_addr,
      data.to_addrs,
      data.cc_addrs || [],
      data.bcc_addrs || [],
      data.subject,
      data.html_body || null,
      data.text_body || null,
      data.send_at,
    ]
  );
  const row = r.rows[0];
  return {
    ...row,
    to_addrs: Array.isArray(row.to_addrs) ? row.to_addrs : (row.to_addrs as unknown as string[]),
  };
}

export async function cancelScheduled(userId: string, id: string): Promise<boolean> {
  const r = await dbQuery(
    `UPDATE scheduled_emails SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id`,
    [id, userId]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function processDueScheduled(): Promise<number> {
  const r = await dbQuery<{ id: string; user_id: string; from_addr: string; to_addrs: string[]; cc_addrs: string[]; bcc_addrs: string[]; subject: string; html_body: string | null; text_body: string | null }>(
    `SELECT id, user_id, from_addr, to_addrs, cc_addrs, bcc_addrs, subject, html_body, text_body
     FROM scheduled_emails
     WHERE status = 'pending' AND send_at <= NOW()
     LIMIT 50`
  );

  let sent = 0;
  for (const row of r.rows) {
    try {
      const creds = await getImapCredentials(row.user_id);
      if (!creds) {
        await dbQuery(
          `UPDATE scheduled_emails SET status = 'failed' WHERE id = $1`,
          [row.id]
        );
        continue;
      }
      const result = await sendMail(creds.email, creds.password, {
        from: row.from_addr,
        to: row.to_addrs,
        cc: row.cc_addrs?.length ? row.cc_addrs : undefined,
        bcc: row.bcc_addrs?.length ? row.bcc_addrs : undefined,
        subject: row.subject,
        html: row.html_body || undefined,
        text: row.text_body || undefined,
      });
      if (result.success) {
        await dbQuery(
          `UPDATE scheduled_emails SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [row.id]
        );
        sent++;
      } else {
        await dbQuery(
          `UPDATE scheduled_emails SET status = 'failed' WHERE id = $1`,
          [row.id]
        );
      }
    } catch {
      await dbQuery(
        `UPDATE scheduled_emails SET status = 'failed' WHERE id = $1`,
        [row.id]
      );
    }
  }
  return sent;
}
