import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import {
  getMessagesForUser,
  getMessageForUser,
  getAttachmentForUser,
  sendEmailForUser,
  getFoldersForUser,
  searchMessages,
  bulkMoveMessages,
  bulkFlagMessages,
  getThreadedMessages,
  createFolder,
  renameFolder,
  deleteFolder,
} from './mail.service.js';
import { createAuditLog } from '../admin/audit.service.js';
import { getSnoozedUids } from '../snooze/snooze.service.js';
import { query as dbQuery } from '../db/index.js';

export const mailRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/** Parse JSON strings in req.body (multipart sends to/cc/bcc as JSON strings) */
function parseFormDataJson(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) {
  if (req.body?.to && typeof req.body.to === 'string') {
    try {
      const parsed = JSON.parse(req.body.to);
      req.body.to = Array.isArray(parsed) ? parsed : req.body.to;
    } catch {
      // Leave as string; handler will split by comma
    }
  }
  if (req.body?.cc && typeof req.body.cc === 'string') {
    try {
      const parsed = JSON.parse(req.body.cc);
      req.body.cc = Array.isArray(parsed) ? parsed : req.body.cc;
    } catch {
      req.body.cc = undefined;
    }
  }
  if (req.body?.bcc && typeof req.body.bcc === 'string') {
    try {
      const parsed = JSON.parse(req.body.bcc);
      req.body.bcc = Array.isArray(parsed) ? parsed : req.body.bcc;
    } catch {
      req.body.bcc = undefined;
    }
  }
  next();
}

mailRouter.use(authMiddleware);

// List messages
mailRouter.get(
  '/messages',
  [
    query('folder').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const folder = (req.query.folder as string) || 'inbox';
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const mailbox = req.query.mailbox as string | undefined;

      const messages = await getMessagesForUser(req.user.id, folder, limit, offset, mailbox);
      const snoozedUids = await getSnoozedUids(req.user.id, folder, mailbox || null);
      const filtered = messages.filter((m) => !snoozedUids.has(m.uid));
      res.json({ messages: filtered });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) {
        res.status(401).json({ error: msg });
      } else {
        res.status(500).json({ error: msg });
      }
    }
  }
);

// List threaded messages
mailRouter.get(
  '/threads',
  [
    query('folder').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const folder = (req.query.folder as string) || 'inbox';
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const mailbox = req.query.mailbox as string | undefined;

      const threads = await getThreadedMessages(req.user.id, folder, limit, offset, mailbox);
      res.json({ threads });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) {
        res.status(401).json({ error: msg });
      } else {
        res.status(500).json({ error: msg });
      }
    }
  }
);

// Get single message
mailRouter.get(
  '/messages/:uid',
  [param('uid').isInt(), query('folder').optional().isString(), query('mailbox').optional().isEmail()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const uid = parseInt(req.params.uid, 10);
      const folder = (req.query.folder as string) || 'inbox';
      const mailbox = req.query.mailbox as string | undefined;

      const message = await getMessageForUser(req.user.id, uid, folder, mailbox);
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      res.json(message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) {
        res.status(401).json({ error: msg });
      } else {
        res.status(500).json({ error: msg });
      }
    }
  }
);

// Download attachment
mailRouter.get(
  '/attachments/:msgId/:attId',
  [
    param('msgId').isInt(),
    param('attId').isInt(),
    query('folder').optional().isString(),
    query('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const msgId = parseInt(req.params.msgId, 10);
      const attId = parseInt(req.params.attId, 10);
      const folder = (req.query.folder as string) || 'inbox';
      const mailbox = req.query.mailbox as string | undefined;

      const att = await getAttachmentForUser(req.user.id, msgId, attId, folder, mailbox);
      if (!att) {
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }

      const inline = req.query.inline === '1';
      res.setHeader('Content-Type', att.contentType);
      res.setHeader(
        'Content-Disposition',
        inline ? `inline; filename="${att.filename}"` : `attachment; filename="${att.filename}"`
      );
      res.send(att.content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: msg });
    }
  }
);

// Send email
mailRouter.post(
  '/send',
  upload.array('attachments'),
  parseFormDataJson,
  [
    body('from').isEmail(),
    body('to').custom((v) => {
      const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
      return arr.length > 0 && arr.every((e: unknown) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    }),
    body('subject').notEmpty(),
    body('html').optional().isString(),
    body('text').optional().isString(),
    body('cc').optional().isArray(),
    body('bcc').optional().isArray(),
    body('replyTo').optional().isEmail(),
    body('organizationId').optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to, subject, html, text, cc, bcc, replyTo, organizationId } = req.body;
    let toArr: string[] = [];
    if (Array.isArray(to)) {
      toArr = to;
    } else if (typeof to === 'string') {
      try {
        const parsed = JSON.parse(to);
        toArr = Array.isArray(parsed) ? parsed : to.split(',').map((e: string) => e.trim());
      } catch {
        toArr = to.split(',').map((e: string) => e.trim());
      }
    }
    const files = req.files as Express.Multer.File[] | undefined;
    const attachments = files?.map((f) => ({ filename: f.originalname, content: f.buffer }));

    const attachmentBytes = files?.reduce((s, f) => s + f.size, 0) ?? 0;
    const bodyBytes = Buffer.byteLength(
      JSON.stringify({ from, to, subject, html: html || '', text: text || '' }),
      'utf8'
    );
    const totalBytes = attachmentBytes + bodyBytes;

    try {
      const userRow = await dbQuery<{ storage_used_bytes: string; storage_plan_id: string | null }>(
        `SELECT COALESCE(storage_used_bytes, 0)::bigint::text as storage_used_bytes, storage_plan_id
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      const used = parseInt(userRow.rows[0]?.storage_used_bytes || '0', 10);
      let bytesLimit: number | null = 500 * 1024 * 1024;
      if (userRow.rows[0]?.storage_plan_id) {
        const planRow = await dbQuery<{ bytes_limit: number | null }>(
          'SELECT bytes_limit FROM storage_plans WHERE id = $1',
          [userRow.rows[0].storage_plan_id]
        );
        bytesLimit = planRow.rows[0]?.bytes_limit ?? 500 * 1024 * 1024;
      }
      if (bytesLimit !== null && used + totalBytes > bytesLimit) {
        res.status(403).json({
          error: `Storage limit reached (${Math.round(used / 1024 / 1024)} MB / ${Math.round(bytesLimit / 1024 / 1024)} MB). Request an upgrade in Settings.`,
        });
        return;
      }

      const result = await sendEmailForUser(req.user.id, {
        from,
        to: toArr,
        cc,
        bcc,
        subject,
        html,
        text,
        attachments,
        replyTo,
      });

      if (!result.success) {
        res.status(500).json({ error: result.error || 'Failed to send' });
        return;
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'email_sent',
        resourceType: 'email',
        metadata: { from, to: toArr, subject },
        ipAddress: req.ip,
        organizationId: organizationId || undefined,
      });

      await dbQuery(
        'UPDATE users SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + $1 WHERE id = $2',
        [totalBytes, req.user.id]
      );

      res.json({ success: true, messageId: result.messageId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) {
        res.status(401).json({ error: msg });
      } else {
        res.status(500).json({ error: msg });
      }
    }
  }
);

// Search
mailRouter.get(
  '/search',
  [query('q').notEmpty(), query('folder').optional().isString(), query('mailbox').optional().isEmail()],
  async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const q = req.query.q as string;
      const folder = (req.query.folder as string) || 'inbox';
      const mailbox = req.query.mailbox as string | undefined;

      const messages = await searchMessages(req.user.id, q, folder, mailbox);
      const snoozedUids = await getSnoozedUids(req.user.id, folder, mailbox || null);
      const filtered = messages.filter((m) => !snoozedUids.has(m.uid));
      res.json({ messages: filtered });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: msg });
    }
  }
);

// Get folders
mailRouter.get('/folders', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const mailbox = req.query.mailbox as string | undefined;
    const folders = await getFoldersForUser(req.user.id, mailbox);
    res.json({ folders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// Create folder
mailRouter.post(
  '/folders',
  [body('name').notEmpty().isString(), body('mailbox').optional().isEmail()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await createFolder(req.user.id, req.body.name, req.body.mailbox);
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) res.status(401).json({ error: msg });
      else res.status(500).json({ error: msg });
    }
  }
);

// Rename folder
mailRouter.patch(
  '/folders',
  [
    body('oldName').notEmpty().isString(),
    body('newName').notEmpty().isString(),
    body('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await renameFolder(req.user.id, req.body.oldName, req.body.newName, req.body.mailbox);
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) res.status(401).json({ error: msg });
      else res.status(500).json({ error: msg });
    }
  }
);

// Delete folder
mailRouter.delete(
  '/folders',
  [body('name').notEmpty().isString(), body('mailbox').optional().isEmail()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await deleteFolder(req.user.id, req.body.name, req.body.mailbox);
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) res.status(401).json({ error: msg });
      else res.status(500).json({ error: msg });
    }
  }
);

// Bulk actions: move messages
mailRouter.post(
  '/bulk/move',
  [
    body('folder').notEmpty(),
    body('uids').isArray(),
    body('uids.*').isInt(),
    body('destFolder').notEmpty(),
    body('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await bulkMoveMessages(
        req.user.id,
        req.body.folder,
        req.body.uids,
        req.body.destFolder,
        req.body.mailbox
      );
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) res.status(401).json({ error: msg });
      else res.status(500).json({ error: msg });
    }
  }
);

// Bulk actions: add/remove flags (e.g. \\Seen, \\Flagged)
mailRouter.post(
  '/bulk/flags',
  [
    body('folder').notEmpty(),
    body('uids').isArray(),
    body('uids.*').isInt(),
    body('flags').isArray(),
    body('flags.*').isString(),
    body('add').isBoolean(),
    body('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await bulkFlagMessages(
        req.user.id,
        req.body.folder,
        req.body.uids,
        req.body.flags,
        req.body.add,
        req.body.mailbox
      );
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Session expired')) res.status(401).json({ error: msg });
      else res.status(500).json({ error: msg });
    }
  }
);
