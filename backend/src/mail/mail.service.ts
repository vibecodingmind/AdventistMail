import PostalMime from 'postal-mime';
import {
  createImapClient,
  fetchMessageList,
  fetchMessageSource,
  getMailboxList,
  moveMessages,
  addFlags,
  removeFlags,
} from '../common/zimbra/index.js';
import { sendMail } from '../common/zimbra/index.js';
import { getImapCredentials } from '../common/redis.js';
import type { MessageSummary } from '../common/zimbra/index.js';

const FOLDER_MAP: Record<string, string> = {
  inbox: 'INBOX',
  sent: 'Sent',
  drafts: 'Drafts',
  spam: 'Junk',
  trash: 'Trash',
  starred: 'INBOX', // Filter by \Flagged
};

export interface MailMessage {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet?: string;
  flags: string[];
  size?: number;
  hasAttachments?: boolean;
}

export interface MailMessageDetail extends MailMessage {
  html?: string;
  text?: string;
  attachments: { filename: string; contentType: string; size: number }[];
}

export async function getMessagesForUser(
  userId: string,
  folder: string = 'inbox',
  limit: number = 50,
  offset: number = 0,
  mailboxEmail?: string
): Promise<MailMessage[]> {
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({
    user: connectEmail,
    password: creds.password,
  });

  try {
    await client.connect();
    const imapFolder = FOLDER_MAP[folder.toLowerCase()] || folder;
    const summaries = await fetchMessageList(client, {
      mailbox: imapFolder,
      limit,
      offset,
    });

    return summaries.map((s) => formatMessageSummary(s));
  } finally {
    await client.logout();
  }
}

function formatMessageSummary(s: MessageSummary): MailMessage {
  const from = s.envelope.from?.[0];
  const to = s.envelope.to?.[0];
  return {
    uid: s.uid,
    subject: s.envelope.subject || '(No subject)',
    from: from ? (from.name ? `${from.name} <${from.address}>` : from.address || '') : '',
    to: to ? (to.name ? `${to.name} <${to.address}>` : to.address || '') : '',
    date: s.envelope.date?.toISOString() || new Date().toISOString(),
    flags: s.flags ? Array.from(s.flags) : [],
    size: s.size,
  };
}

export async function getMessageForUser(
  userId: string,
  uid: number,
  folder: string = 'inbox',
  mailboxEmail?: string
): Promise<MailMessageDetail | null> {
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({
    user: connectEmail,
    password: creds.password,
  });

  try {
    await client.connect();
    const imapFolder = FOLDER_MAP[folder.toLowerCase()] || folder;
    const source = await fetchMessageSource(client, imapFolder, uid);
    if (!source) return null;

    const parsed = await PostalMime.parse(source);

    const from = parsed.from as { name?: string; address?: string } | undefined;
    const toArr = (parsed.to || []) as Array<{ name?: string; address?: string }>;
    const formatAddr = (a: { name?: string; address?: string } | undefined) =>
      a ? (a.name ? `${a.name} <${a.address || ''}>` : a.address || '') : '';
    const attachments = (parsed.attachments || []).map((a) => ({
      filename: a.filename || 'attachment',
      contentType: a.mimeType || 'application/octet-stream',
      size: a.content ? (typeof a.content === 'string' ? Buffer.byteLength(a.content) : a.content.byteLength) : 0,
    }));

    return {
      uid,
      subject: parsed.subject || '(No subject)',
      from: formatAddr(from),
      to: toArr.map(formatAddr).join(', '),
      date: parsed.date || new Date().toISOString(),
      flags: [],
      html: parsed.html || undefined,
      text: parsed.text || undefined,
      attachments,
      hasAttachments: attachments.length > 0,
    };
  } finally {
    await client.logout();
  }
}

export async function getAttachmentForUser(
  userId: string,
  uid: number,
  attachmentIndex: number,
  folder: string = 'inbox',
  mailboxEmail?: string
): Promise<{ content: Buffer; filename: string; contentType: string } | null> {
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({
    user: connectEmail,
    password: creds.password,
  });

  try {
    await client.connect();
    const imapFolder = FOLDER_MAP[folder.toLowerCase()] || folder;
    const source = await fetchMessageSource(client, imapFolder, uid);
    if (!source) return null;

    const parsed = await PostalMime.parse(source);
    const atts = parsed.attachments || [];
    const att = atts[attachmentIndex];
    if (!att?.content) return null;

    const content = att.content instanceof ArrayBuffer
      ? Buffer.from(att.content)
      : typeof att.content === 'string'
        ? Buffer.from(att.content, 'base64')
        : Buffer.from(att.content);

    return {
      content,
      filename: att.filename || 'attachment',
      contentType: att.mimeType || 'application/octet-stream',
    };
  } finally {
    await client.logout();
  }
}

export interface SendMailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
  replyTo?: string;
}

export async function sendEmailForUser(userId: string, params: SendMailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const result = await sendMail(creds.email, creds.password, {
    from: params.from,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
    replyTo: params.replyTo,
  });

  return result;
}

export async function searchMessages(
  userId: string,
  searchQuery: string,
  folder: string = 'inbox',
  mailboxEmail?: string
): Promise<MailMessage[]> {
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({
    user: connectEmail,
    password: creds.password,
  });

  try {
    await client.connect();
    const imapFolder = FOLDER_MAP[folder.toLowerCase()] || 'INBOX';
    const lock = await client.getMailboxLock(imapFolder);
    try {
      await client.mailboxOpen(imapFolder);
      const searchResult = await client.search({ text: searchQuery }, { uid: true });
      const uids = Array.isArray(searchResult) ? searchResult : [];
      const summaries: MessageSummary[] = [];
      if (uids.length > 0) {
        for await (const msg of client.fetch(uids, { envelope: true, uid: true, flags: true, size: true }, { uid: true })) {
          summaries.push({
            uid: msg.uid,
            envelope: msg.envelope as MessageSummary['envelope'],
            flags: msg.flags,
            size: msg.size,
          });
        }
      }
      return summaries.map((s) => formatMessageSummary(s));
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function getFoldersForUser(userId: string, mailboxEmail?: string): Promise<{ path: string }[]> {
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({
    user: connectEmail,
    password: creds.password,
  });

  try {
    await client.connect();
    const list = await getMailboxList(client);
    return list.map((m) => ({ path: m.path }));
  } finally {
    await client.logout();
  }
}

export async function bulkMoveMessages(
  userId: string,
  folder: string,
  uids: number[],
  destFolder: string,
  mailboxEmail?: string
): Promise<void> {
  if (uids.length === 0) return;
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({ user: connectEmail, password: creds.password });
  try {
    await client.connect();
    const src = FOLDER_MAP[folder.toLowerCase()] || folder;
    const dest = FOLDER_MAP[destFolder.toLowerCase()] || destFolder;
    await moveMessages(client, src, uids, dest);
  } finally {
    await client.logout();
  }
}

export async function bulkFlagMessages(
  userId: string,
  folder: string,
  uids: number[],
  flags: string[],
  add: boolean,
  mailboxEmail?: string
): Promise<void> {
  if (uids.length === 0 || flags.length === 0) return;
  const creds = await getImapCredentials(userId);
  if (!creds) throw new Error('Session expired, please login again');

  const connectEmail = mailboxEmail || creds.email;
  const client = createImapClient({ user: connectEmail, password: creds.password });
  try {
    await client.connect();
    const mb = FOLDER_MAP[folder.toLowerCase()] || folder;
    if (add) {
      await addFlags(client, mb, uids, flags);
    } else {
      await removeFlags(client, mb, uids, flags);
    }
  } finally {
    await client.logout();
  }
}
