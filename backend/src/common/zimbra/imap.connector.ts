import { ImapFlow } from 'imapflow';
import { config } from '../../config/index.js';

export interface ImapConnectionOptions {
  user: string;
  password: string;
  mailbox?: string;
}

export function createImapClient(options: ImapConnectionOptions): ImapFlow {
  return new ImapFlow({
    host: config.zimbra.imap.host,
    port: config.zimbra.imap.port,
    secure: config.zimbra.imap.secure,
    auth: {
      user: options.user,
      pass: options.password,
    },
    logger: false,
  });
}

export interface MessageSummary {
  uid: number;
  envelope: {
    date?: Date;
    subject?: string;
    from?: Array<{ address?: string; name?: string }>;
    to?: Array<{ address?: string; name?: string }>;
    messageId?: string;
  };
  flags?: Set<string>;
  size?: number;
  headers?: Map<string, string[]>;
}

export interface FetchMessageOptions {
  mailbox?: string;
  uid?: number;
  limit?: number;
  offset?: number;
}

export async function fetchMessageList(
  client: ImapFlow,
  options: FetchMessageOptions = {}
): Promise<MessageSummary[]> {
  const mailbox = options.mailbox || 'INBOX';
  const messages: MessageSummary[] = [];

  const lock = await client.getMailboxLock(mailbox);
  try {
    await client.mailboxOpen(mailbox);
    const mb = client.mailbox;
    const total = mb && typeof mb === 'object' ? (mb.exists ?? 0) : 0;
    if (total === 0) return messages;

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const start = Math.max(1, total - offset - limit + 1);
    const end = Math.min(total, start + limit - 1);
    if (start > end) return messages;

    const range = `${start}:${end}`;
    for await (const msg of client.fetch(range, {
      envelope: true,
      uid: true,
      flags: true,
      size: true,
      headers: ['references', 'in-reply-to', 'message-id'],
    })) {
      messages.push({
        uid: msg.uid,
        envelope: msg.envelope as MessageSummary['envelope'],
        flags: msg.flags,
        size: msg.size,
        headers: msg.headers as Map<string, string[]> | undefined,
      });
    }
  } finally {
    lock.release();
  }

  return messages.reverse(); // Newest first
}

export async function fetchMessageSource(
  client: ImapFlow,
  mailbox: string,
  uid: number
): Promise<Buffer | null> {
  const lock = await client.getMailboxLock(mailbox);
  try {
    await client.mailboxOpen(mailbox);
    const msg = await client.fetchOne(uid, { source: true });
    return msg && typeof msg === 'object' && 'source' in msg ? (msg.source ?? null) : null;
  } finally {
    lock.release();
  }
}

export async function getMailboxList(client: ImapFlow): Promise<{ path: string; flags: object }[]> {
  const list: { path: string; flags: object }[] = [];
  const mailboxes = await client.list();
  for (const mailbox of mailboxes) {
    list.push({ path: mailbox.path, flags: mailbox.flags || {} });
  }
  return list;
}

export async function moveMessages(
  client: ImapFlow,
  sourceMailbox: string,
  uids: number[],
  destMailbox: string
): Promise<void> {
  const lock = await client.getMailboxLock(sourceMailbox);
  try {
    await client.mailboxOpen(sourceMailbox);
    await client.messageMove(uids, destMailbox, { uid: true });
  } finally {
    lock.release();
  }
}

export async function addFlags(
  client: ImapFlow,
  mailbox: string,
  uids: number[],
  flags: string[]
): Promise<void> {
  const lock = await client.getMailboxLock(mailbox);
  try {
    await client.mailboxOpen(mailbox);
    await client.messageFlagsAdd(uids, flags, { uid: true });
  } finally {
    lock.release();
  }
}

export async function removeFlags(
  client: ImapFlow,
  mailbox: string,
  uids: number[],
  flags: string[]
): Promise<void> {
  const lock = await client.getMailboxLock(mailbox);
  try {
    await client.mailboxOpen(mailbox);
    await client.messageFlagsRemove(uids, flags, { uid: true });
  } finally {
    lock.release();
  }
}
