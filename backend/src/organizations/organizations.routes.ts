import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import {
  createOrganization,
  getOrganizationsForUser,
  getOrgMembers,
  inviteUser,
  addMemberDirectly,
  acceptInvite,
  getInviteByToken,
  requestOfficialEmail,
  getOrganizationOfficialEmails,
  listPendingOrganizations,
  approveOrganization,
  rejectOrganization,
  listPendingOrgEmailRequests,
  approveOrgEmailRequest,
  updateOrganizationBranding,
} from './organizations.service.js';
import {
  addDomain,
  listDomains,
  verifyDomain,
  removeDomain,
} from './domains.service.js';

export const organizationsRouter = Router();

// Public: validate invite token (for invite page before login)
organizationsRouter.get('/invite/:token', async (req: AuthRequest, res: Response) => {
  try {
    const invite = await getInviteByToken(req.params.token);
    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }
    res.json({ orgName: invite.orgName, orgId: invite.orgId });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

organizationsRouter.use(authMiddleware);

// Get current user's organizations
organizationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const organizations = await getOrganizationsForUser(req.user.id);
    res.json({ organizations });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Accept invite (auth required)
organizationsRouter.post(
  '/accept-invite',
  [body('token').notEmpty().trim()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await acceptInvite(req.body.token, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ success: true, orgId: result.orgId });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Update org branding (org_admin only)
organizationsRouter.patch(
  '/:id/branding',
  [param('id').isUUID(), body('logo_url').optional().isString(), body('primary_color').optional().matches(/^#[0-9A-Fa-f]{3,6}$/)],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await updateOrganizationBranding(req.params.id, req.user.id, {
        logo_url: req.body.logo_url,
        primary_color: req.body.primary_color,
      });
      if (!result.success) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Get org members (org_admin only)
organizationsRouter.get(
  '/:id/members',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { isOrgAdmin } = await import('./organizations.service.js');
      const isAdmin = await isOrgAdmin(req.params.id, req.user.id);
      if (!isAdmin) {
        res.status(403).json({ error: 'Only org admins can view members' });
        return;
      }
      const members = await getOrgMembers(req.params.id);
      res.json({ members });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Invite user (org_admin only)
organizationsRouter.post(
  '/:id/invite',
  [param('id').isUUID(), body('email').isEmail().normalizeEmail()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await inviteUser(req.params.id, req.body.email, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ success: true, inviteLink: result.inviteLink });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Add member directly (org_admin only)
organizationsRouter.post(
  '/:id/add-member',
  [param('id').isUUID(), body('email').isEmail().normalizeEmail()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await addMemberDirectly(req.params.id, req.body.email, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Request official email (org_admin only)
organizationsRouter.post(
  '/:id/request-official-email',
  [param('id').isUUID(), body('requestedEmail').isEmail().normalizeEmail()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await requestOfficialEmail(req.params.id, req.body.requestedEmail, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Get org official emails (org member)
organizationsRouter.get(
  '/:id/official-emails',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const orgs = await getOrganizationsForUser(req.user.id);
      const hasAccess = orgs.some((o) => o.id === req.params.id);
      if (!hasAccess) {
        res.status(403).json({ error: 'Not a member of this organization' });
        return;
      }
      const emails = await getOrganizationOfficialEmails(req.params.id);
      res.json({ officialEmails: emails });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Add domain
organizationsRouter.post(
  '/:id/domains',
  [param('id').isUUID(), body('domain').notEmpty().trim()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await addDomain(req.params.id, req.body.domain, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({
        success: true,
        domain: result.domain,
        verification_record: result.verification_record,
        record_name: result.record_name,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// List domains
organizationsRouter.get(
  '/:id/domains',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const domains = await listDomains(req.params.id);
      res.json({ domains });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Verify domain
organizationsRouter.post(
  '/:id/domains/:domainId/verify',
  [param('id').isUUID(), param('domainId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await verifyDomain(req.params.domainId, req.params.id, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ verified: result.verified, error: result.error });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Remove domain
organizationsRouter.delete(
  '/:id/domains/:domainId',
  [param('id').isUUID(), param('domainId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await removeDomain(req.params.domainId, req.params.id, req.user.id);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);
