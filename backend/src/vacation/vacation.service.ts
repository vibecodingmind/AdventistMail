import { query } from '../db/index.js';
import { getImapCredentials } from '../common/redis.js';
import { sendMail } from '../common/zimbra/index.js';

export interface VacationResponder {
  id: string;
  user_id: string;
  is_active: boolean;
  subject: string;
  message: string;
  start_date: string | null;
  end_date: string | null;
  last_response: Record<string, string>;
  created_at: Date;
  updated_at: Date;
}

export async function getVacationResponder(userId: string): Promise<VacationResponder | null> {
  const result = await query<VacationResponder>(
    'SELECT * FROM vacation_responders WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function upsertVacationResponder(
  userId: string,
  data: {
    isActive: boolean;
    subject: string;
    message: string;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<VacationResponder> {
  const result = await query<VacationResponder>(
    `INSERT INTO vacation_responders (user_id, is_active, subject, message, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       is_active = $2,
       subject = $3,
       message = $4,
       start_date = $5,
       end_date = $6,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      data.isActive,
      data.subject || '',
      data.message || '',
      data.startDate || null,
      data.endDate || null,
    ]
  );
  return result.rows[0];
}

/**
 * Process an incoming email and send a vacation auto-reply if conditions are met.
 * Intended to be called by a mail server hook or polling job — not triggered from
 * within the web app itself.
 */
export async function processVacationResponse(
  userId: string,
  incomingFrom: string,
  incomingMessageId: string
): Promise<{ replied: boolean; reason?: string }> {
  const responder = await getVacationResponder(userId);
  if (!responder || !responder.is_active) {
    return { replied: false, reason: 'responder_inactive' };
  }

  const now = new Date();
  if (responder.start_date && new Date(responder.start_date) > now) {
    return { replied: false, reason: 'before_start_date' };
  }
  if (responder.end_date) {
    const endOfDay = new Date(responder.end_date);
    endOfDay.setHours(23, 59, 59, 999);
    if (endOfDay < now) {
      return { replied: false, reason: 'after_end_date' };
    }
  }

  const senderKey = incomingFrom.toLowerCase();
  const lastResponse = responder.last_response || {};
  const lastReplied = lastResponse[senderKey];
  if (lastReplied) {
    const daysSinceReply = (now.getTime() - new Date(lastReplied).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReply < 4) {
      return { replied: false, reason: 'already_replied_recently' };
    }
  }

  const creds = await getImapCredentials(userId);
  if (!creds) {
    return { replied: false, reason: 'no_credentials' };
  }

  const result = await sendMail(creds.email, creds.password, {
    from: creds.email,
    to: incomingFrom,
    subject: responder.subject || 'Out of Office',
    text: responder.message,
    html: `<p>${responder.message.replace(/\n/g, '<br>')}</p>`,
  });

  if (!result.success) {
    return { replied: false, reason: `send_failed: ${result.error}` };
  }

  lastResponse[senderKey] = now.toISOString();
  await query(
    'UPDATE vacation_responders SET last_response = $1, updated_at = NOW() WHERE user_id = $2',
    [JSON.stringify(lastResponse), userId]
  );

  return { replied: true };
}
