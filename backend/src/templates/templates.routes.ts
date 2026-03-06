import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import * as templatesService from './templates.service.js';

export const templatesRouter = Router();
templatesRouter.use(authMiddleware);

templatesRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const templates = await templatesService.listTemplates(req.user.id);
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

templatesRouter.get('/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const template = await templatesService.getTemplate(req.user.id, req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

templatesRouter.post(
  '/',
  [body('name').notEmpty().trim(), body('subject').notEmpty().trim(), body('body_html').notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const template = await templatesService.createTemplate(req.user.id, {
        name: req.body.name,
        subject: req.body.subject,
        body_html: req.body.body_html,
      });
      res.status(201).json(template);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

templatesRouter.put(
  '/:id',
  [param('id').isUUID(), body('name').optional().trim(), body('subject').optional(), body('body_html').optional()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const template = await templatesService.updateTemplate(req.user.id, req.params.id, {
        name: req.body.name,
        subject: req.body.subject,
        body_html: req.body.body_html,
      });
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

templatesRouter.delete('/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ok = await templatesService.deleteTemplate(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});
