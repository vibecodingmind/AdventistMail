import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import { getUserSignatures, createUserSignature, updateUserSignature, deleteUserSignature } from './signatures.service.js';

export const signaturesRouter = Router();

signaturesRouter.use(authMiddleware);

signaturesRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const signatures = await getUserSignatures(req.user.id);
    res.json({ signatures });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

signaturesRouter.post(
  '/',
  [body('name').notEmpty().trim(), body('content').notEmpty(), body('isDefault').optional().isBoolean()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const sig = await createUserSignature(req.user.id, req.body.name, req.body.content, req.body.isDefault);
      res.status(201).json(sig);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

signaturesRouter.patch(
  '/:id',
  [param('id').isUUID(), body('name').optional().trim(), body('content').optional().isString(), body('isDefault').optional().isBoolean()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const ok = await updateUserSignature(req.user.id, req.params.id, {
        name: req.body.name,
        content: req.body.content,
        is_default: req.body.isDefault,
      });
      if (!ok) res.status(404).json({ error: 'Signature not found' });
      else res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

signaturesRouter.delete('/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ok = await deleteUserSignature(req.user.id, req.params.id);
    if (!ok) res.status(404).json({ error: 'Signature not found' });
    else res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});
