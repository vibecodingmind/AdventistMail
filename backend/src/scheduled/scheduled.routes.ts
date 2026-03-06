import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import * as scheduledService from './scheduled.service.js';

export const scheduledRouter = Router();
scheduledRouter.use(authMiddleware);

scheduledRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const scheduled = await scheduledService.listScheduled(req.user.id);
    res.json({ scheduled });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

scheduledRouter.post(
  '/',
  [
    body('from_addr').isEmail(),
    body('to_addrs').isArray(),
    body('to_addrs.*').isEmail(),
    body('subject').notEmpty(),
    body('send_at').isISO8601(),
    body('cc_addrs').optional().isArray(),
    body('bcc_addrs').optional().isArray(),
    body('html_body').optional().isString(),
    body('text_body').optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const scheduled = await scheduledService.createScheduled(req.user.id, {
        from_addr: req.body.from_addr,
        to_addrs: req.body.to_addrs,
        cc_addrs: req.body.cc_addrs,
        bcc_addrs: req.body.bcc_addrs,
        subject: req.body.subject,
        html_body: req.body.html_body,
        text_body: req.body.text_body,
        send_at: req.body.send_at,
      });
      res.status(201).json(scheduled);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

scheduledRouter.delete('/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ok = await scheduledService.cancelScheduled(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Scheduled email not found or already sent' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});
