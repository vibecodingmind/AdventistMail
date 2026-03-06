import { Router, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import {
  getMyRequests,
  createEmailRequest,
  listAllRequests,
  approveEmailRequest,
  rejectEmailRequest,
} from './email-requests.service.js';

export const emailRequestsRouter = Router();

emailRequestsRouter.use(authMiddleware);

// GET /email-requests/mine — user views their own requests
emailRequestsRouter.get('/mine', async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const requests = await getMyRequests(req.user.id);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// POST /email-requests — user submits a new request
emailRequestsRouter.post(
  '/',
  [
    body('requestedEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('churchName').optional().isString().trim(),
    body('purpose').optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    try {
      const result = await createEmailRequest(
        req.user.id,
        req.body.requestedEmail,
        req.body.churchName,
        req.body.purpose
      );
      if (!result.success) { res.status(400).json({ error: result.error }); return; }
      res.status(201).json({ id: result.id, message: 'Request submitted. An admin will review it shortly.' });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// GET /email-requests — admin views all requests (optionally filtered by status)
emailRequestsRouter.get(
  '/',
  requireRole('admin', 'super_admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const requests = await listAllRequests(status);
      res.json({ requests });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// POST /email-requests/:id/approve — admin approves
emailRequestsRouter.post(
  '/:id/approve',
  requireRole('admin', 'super_admin'),
  [param('id').isUUID(), body('adminNote').optional().isString().trim()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    try {
      const result = await approveEmailRequest(req.params.id, req.body.adminNote);
      if (!result.success) { res.status(400).json({ error: result.error }); return; }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// POST /email-requests/:id/reject — admin rejects
emailRequestsRouter.post(
  '/:id/reject',
  requireRole('admin', 'super_admin'),
  [param('id').isUUID(), body('adminNote').optional().isString().trim()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    try {
      const result = await rejectEmailRequest(req.params.id, req.body.adminNote);
      if (!result.success) { res.status(400).json({ error: result.error }); return; }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);
