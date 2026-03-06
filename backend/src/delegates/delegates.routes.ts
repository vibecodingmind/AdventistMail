import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import { getDelegates, addDelegate, removeDelegate, getDelegatedAccess } from './delegates.service.js';

export const delegatesRouter = Router();

delegatesRouter.use(authMiddleware);

delegatesRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const delegates = await getDelegates(req.user.id);
    res.json({ delegates });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

delegatesRouter.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('canRead').optional().isBoolean(),
    body('canSendAs').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const delegate = await addDelegate(req.user.id, req.body.email, {
        can_read: req.body.canRead,
        can_send_as: req.body.canSendAs,
      });
      res.status(201).json(delegate);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const status = message.includes('not found') || message.includes('yourself') || message.includes('already') ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);

delegatesRouter.delete('/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ok = await removeDelegate(req.user.id, req.params.id);
    if (!ok) res.status(404).json({ error: 'Delegate not found' });
    else res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

delegatesRouter.get('/granted', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const granted = await getDelegatedAccess(req.user.id);
    res.json({ granted });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});
