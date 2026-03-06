import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import * as filtersService from './filters.service.js';

export const filtersRouter = Router();
filtersRouter.use(authMiddleware);

filtersRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rules = await filtersService.listRules(req.user.id);
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

filtersRouter.post(
  '/',
  [
    body('name').optional().trim(),
    body('match_from').optional().trim(),
    body('match_to').optional().trim(),
    body('match_subject').optional().trim(),
    body('match_has_attachment').optional().isBoolean(),
    body('action_move').optional().trim(),
    body('action_mark_read').optional().isBoolean(),
    body('action_add_label').optional().trim(),
    body('is_active').optional().isBoolean(),
    body('sort_order').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const rule = await filtersService.createRule(req.user.id, req.body);
      res.status(201).json(rule);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

filtersRouter.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim(),
    body('match_from').optional().trim(),
    body('match_to').optional().trim(),
    body('match_subject').optional().trim(),
    body('match_has_attachment').optional().isBoolean(),
    body('action_move').optional().trim(),
    body('action_mark_read').optional().isBoolean(),
    body('action_add_label').optional().trim(),
    body('is_active').optional().isBoolean(),
    body('sort_order').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const rule = await filtersService.updateRule(req.user.id, req.params.id, req.body);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });
      res.json(rule);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

filtersRouter.delete('/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ok = await filtersService.deleteRule(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});
