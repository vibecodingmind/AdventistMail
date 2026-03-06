import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import { getVacationResponder, upsertVacationResponder } from './vacation.service.js';

export const vacationRouter = Router();
vacationRouter.use(authMiddleware);

vacationRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const responder = await getVacationResponder(req.user.id);
    res.json({
      isActive: responder?.is_active ?? false,
      subject: responder?.subject ?? '',
      message: responder?.message ?? '',
      startDate: responder?.start_date ?? null,
      endDate: responder?.end_date ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

vacationRouter.put(
  '/',
  [
    body('isActive').isBoolean(),
    body('subject').isString().trim(),
    body('message').isString().trim(),
    body('startDate').optional({ values: 'null' }).isISO8601(),
    body('endDate').optional({ values: 'null' }).isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const responder = await upsertVacationResponder(req.user.id, {
        isActive: req.body.isActive,
        subject: req.body.subject,
        message: req.body.message,
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
      });
      res.json({
        isActive: responder.is_active,
        subject: responder.subject,
        message: responder.message,
        startDate: responder.start_date,
        endDate: responder.end_date,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);
