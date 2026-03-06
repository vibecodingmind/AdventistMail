import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, getClient } from '../db/index.js';
import { ensureMailboxExists, grantMailboxAccess } from '../shared-mailboxes/shared-mailboxes.service.js';

export interface Organization {
  id: string;
  name: string;
  type: string;
  requested_email: string;
  owner_id: string;
  mailbox_id: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  status: string;
  email?: string;
  display_name?: string;
}

export interface OrganizationWithRole extends Organization {
  role: string;
  membership_status: string;
}

export interface OrganizationEmailRequest {
  id: string;
  org_id: string;
  requested_email: string;
  requested_by: string;
  status: string;
  mailbox_id: string | null;
  created_at: Date;
}

export async function createOrganization(
  name: string,
  type: string,
  requestedEmail: string,
  ownerEmail: string,
  ownerPassword: string,
  ownerDisplayName?: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = ownerEmail.toLowerCase().trim();
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Check if owner email already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Email already registered' };
    }

    // Create owner user (verified so they can log in)
    const ownerId = uuidv4();
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    await client.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, is_verified)
       VALUES ($1, $2, $3, 'user', $4, true)`,
      [ownerId, normalizedEmail, ownerDisplayName || null, passwordHash]
    );

    // Create organization
    const orgId = uuidv4();
    await client.query(
      `INSERT INTO organizations (id, name, type, requested_email, owner_id, is_verified)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [orgId, name, type, requestedEmail.toLowerCase(), ownerId]
    );

    // Add owner as org_admin
    await client.query(
      `INSERT INTO organization_members (id, org_id, user_id, role, status)
       VALUES ($1, $2, $3, 'org_admin', 'active')`,
      [uuidv4(), orgId, ownerId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getOrganizationsForUser(userId: string): Promise<OrganizationWithRole[]> {
  const result = await query<Organization & { role: string; membership_status: string }>(
    `SELECT o.*, om.role, om.status as membership_status
     FROM organizations o
     JOIN organization_members om ON om.org_id = o.id
     WHERE om.user_id = $1 AND om.status = 'active'
     ORDER BY o.name`,
    [userId]
  );
  return result.rows.map((r) => ({
    ...r,
    role: r.role,
    membership_status: r.membership_status,
  }));
}

export async function getOrgMembers(orgId: string): Promise<OrganizationMember[]> {
  const result = await query<OrganizationMember & { email: string; display_name: string | null }>(
    `SELECT om.id, om.org_id, om.user_id, om.role, om.status, u.email, u.display_name
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1
     ORDER BY om.role DESC, u.email`,
    [orgId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    org_id: r.org_id,
    user_id: r.user_id,
    role: r.role,
    status: r.status,
    email: r.email,
    display_name: r.display_name || undefined,
  }));
}

export async function isOrgAdmin(orgId: string, userId: string): Promise<boolean> {
  const result = await query<{ role: string }>(
    `SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2 AND status = 'active'`,
    [orgId, userId]
  );
  return result.rows[0]?.role === 'org_admin';
}

export async function inviteUser(
  orgId: string,
  email: string,
  inviterId: string
): Promise<{ success: boolean; error?: string; inviteLink?: string }> {
  const isAdmin = await isOrgAdmin(orgId, inviterId);
  if (!isAdmin) {
    return { success: false, error: 'Only org admins can invite users' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if already member
  const existingMember = await query(
    `SELECT 1 FROM organization_members om JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1 AND u.email = $2 AND om.status = 'active'`,
    [orgId, normalizedEmail]
  );
  if (existingMember.rows.length > 0) {
    return { success: false, error: 'User is already a member' };
  }

  // Check for existing pending invite
  const existingInvite = await query(
    `SELECT 1 FROM organization_invites WHERE org_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()`,
    [orgId, normalizedEmail]
  );
  if (existingInvite.rows.length > 0) {
    return { success: false, error: 'Invite already sent to this email' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    `INSERT INTO organization_invites (id, org_id, email, token, invited_by, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
    [uuidv4(), orgId, normalizedEmail, token, inviterId, expiresAt]
  );

  // Build invite link (APP_URL will be set by env)
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const inviteLink = `${appUrl}/invite?token=${token}`;

  return { success: true, inviteLink };
}

export async function addMemberDirectly(
  orgId: string,
  email: string,
  inviterId: string
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isOrgAdmin(orgId, inviterId);
  if (!isAdmin) {
    return { success: false, error: 'Only org admins can add members' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  const userResult = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (userResult.rows.length === 0) {
    return { success: false, error: 'User not found. Use invite to add users who do not have an account yet.' };
  }

  const userId = userResult.rows[0].id;

  // Check if already member
  const existing = await query(
    'SELECT 1 FROM organization_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );
  if (existing.rows.length > 0) {
    return { success: false, error: 'User is already a member' };
  }

  await query(
    `INSERT INTO organization_members (id, org_id, user_id, role, status, invited_by)
     VALUES ($1, $2, $3, 'org_member', 'active', $4)`,
    [uuidv4(), orgId, userId, inviterId]
  );

  // Grant access to org mailbox if org is verified
  const orgResult = await query<{ mailbox_id: string }>(
    'SELECT mailbox_id FROM organizations WHERE id = $1 AND is_verified = true',
    [orgId]
  );
  if (orgResult.rows.length > 0 && orgResult.rows[0].mailbox_id) {
    const mailboxId = orgResult.rows[0].mailbox_id;
    await grantMailboxAccess(mailboxId, userId, {
      can_read: true,
      can_send_as: true,
      can_reply_as: true,
      can_manage_folders: false,
    });
  }

  // Grant access to all approved org official emails
  const orgEmailsResult = await query<{ mailbox_id: string }>(
    `SELECT mailbox_id FROM organization_email_requests
     WHERE org_id = $1 AND status = 'approved' AND mailbox_id IS NOT NULL`,
    [orgId]
  );
  for (const row of orgEmailsResult.rows) {
    if (row.mailbox_id) {
      await grantMailboxAccess(row.mailbox_id, userId, {
        can_read: true,
        can_send_as: true,
        can_reply_as: true,
        can_manage_folders: false,
      });
    }
  }

  return { success: true };
}

export async function acceptInvite(token: string, userId: string): Promise<{ success: boolean; error?: string; orgId?: string }> {
  const inviteResult = await query<{ id: string; org_id: string; email: string; status: string; expires_at: Date }>(
    `SELECT id, org_id, email, status, expires_at FROM organization_invites WHERE token = $1`,
    [token]
  );

  if (inviteResult.rows.length === 0) {
    return { success: false, error: 'Invalid or expired invite' };
  }

  const invite = inviteResult.rows[0];
  if (invite.status !== 'pending') {
    return { success: false, error: 'Invite has already been used or expired' };
  }
  if (new Date(invite.expires_at) < new Date()) {
    await query(
      `UPDATE organization_invites SET status = 'expired' WHERE id = $1`,
      [invite.id]
    );
    return { success: false, error: 'Invite has expired' };
  }

  const userResult = await query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  const userEmail = userResult.rows[0]?.email?.toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return { success: false, error: 'This invite was sent to a different email address' };
  }

  // Check if already member
  const existing = await query(
    'SELECT 1 FROM organization_members WHERE org_id = $1 AND user_id = $2',
    [invite.org_id, userId]
  );
  if (existing.rows.length > 0) {
    await query(`UPDATE organization_invites SET status = 'accepted' WHERE id = $1`, [invite.id]);
    return { success: true, orgId: invite.org_id };
  }

  await query(
    `INSERT INTO organization_members (id, org_id, user_id, role, status)
     VALUES ($1, $2, $3, 'org_member', 'active')`,
    [uuidv4(), invite.org_id, userId]
  );
  await query(
    `UPDATE organization_invites SET status = 'accepted' WHERE id = $1`,
    [invite.id]
  );

  // Grant access to org mailbox and official emails
  const orgResult = await query<{ mailbox_id: string }>(
    'SELECT mailbox_id FROM organizations WHERE id = $1 AND is_verified = true',
    [invite.org_id]
  );
  if (orgResult.rows.length > 0 && orgResult.rows[0].mailbox_id) {
    await grantMailboxAccess(orgResult.rows[0].mailbox_id, userId, {
      can_read: true,
      can_send_as: true,
      can_reply_as: true,
      can_manage_folders: false,
    });
  }
  const orgEmailsResult = await query<{ mailbox_id: string }>(
    `SELECT mailbox_id FROM organization_email_requests
     WHERE org_id = $1 AND status = 'approved' AND mailbox_id IS NOT NULL`,
    [invite.org_id]
  );
  for (const row of orgEmailsResult.rows) {
    if (row.mailbox_id) {
      await grantMailboxAccess(row.mailbox_id, userId, {
        can_read: true,
        can_send_as: true,
        can_reply_as: true,
        can_manage_folders: false,
      });
    }
  }

  return { success: true, orgId: invite.org_id };
}

export async function getInviteByToken(token: string): Promise<{ orgName: string; orgId: string } | null> {
  const result = await query<{ org_name: string; org_id: string }>(
    `SELECT o.name as org_name, o.id as org_id
     FROM organization_invites i
     JOIN organizations o ON o.id = i.org_id
     WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
    [token]
  );
  if (result.rows.length === 0) return null;
  return { orgName: result.rows[0].org_name, orgId: result.rows[0].org_id };
}

export async function listPendingOrganizations(): Promise<
  { id: string; name: string; type: string; requested_email: string; owner_email: string; created_at: Date }[]
> {
  const result = await query<{ id: string; name: string; type: string; requested_email: string; email: string; created_at: Date }>(
    `SELECT o.id, o.name, o.type, o.requested_email, u.email as owner_email, o.created_at
     FROM organizations o
     JOIN users u ON u.id = o.owner_id
     WHERE COALESCE(o.status, 'pending') = 'pending' AND o.is_verified = false
     ORDER BY o.created_at ASC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    requested_email: r.requested_email,
    owner_email: r.email,
    created_at: r.created_at,
  }));
}

export async function approveOrganization(orgId: string): Promise<{ success: boolean; error?: string }> {
  const orgResult = await query<{ id: string; requested_email: string; owner_id: string }>(
    `SELECT id, requested_email, owner_id FROM organizations WHERE id = $1 AND status = 'pending' AND is_verified = false`,
    [orgId]
  );
  if (orgResult.rows.length === 0) {
    return { success: false, error: 'Organization not found or already approved' };
  }

  const org = orgResult.rows[0];
  const mailboxId = await ensureMailboxExists(org.requested_email, 'shared');
  await query(
    'UPDATE mailboxes SET display_name = $1 WHERE id = $2',
    [org.requested_email, mailboxId]
  );
  await grantMailboxAccess(mailboxId, org.owner_id, {
    can_read: true,
    can_send_as: true,
    can_reply_as: true,
    can_manage_folders: true,
  });

  await query(
    `UPDATE organizations SET mailbox_id = $1, is_verified = true, status = 'approved', updated_at = NOW() WHERE id = $2`,
    [mailboxId, orgId]
  );

  return { success: true };
}

export async function rejectOrganization(orgId: string): Promise<{ success: boolean }> {
  await query(`UPDATE organizations SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [orgId]);
  return { success: true };
}

export async function requestOfficialEmail(
  orgId: string,
  requestedEmail: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await isOrgAdmin(orgId, userId);
  if (!isAdmin) {
    return { success: false, error: 'Only org admins can request official emails' };
  }

  const normalizedEmail = requestedEmail.toLowerCase().trim();

  // Check if mailbox already exists
  const existingMailbox = await query<{ id: string }>('SELECT id FROM mailboxes WHERE email = $1', [normalizedEmail]);
  if (existingMailbox.rows.length > 0) {
    return { success: false, error: 'Email address already in use' };
  }

  // Check for duplicate pending request
  const existingRequest = await query(
    `SELECT 1 FROM organization_email_requests
     WHERE org_id = $1 AND requested_email = $2 AND status = 'pending'`,
    [orgId, normalizedEmail]
  );
  if (existingRequest.rows.length > 0) {
    return { success: false, error: 'A pending request for this email already exists' };
  }

  await query(
    `INSERT INTO organization_email_requests (id, org_id, requested_email, requested_by, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [uuidv4(), orgId, normalizedEmail, userId]
  );
  return { success: true };
}

export async function getOrganizationOfficialEmails(orgId: string): Promise<
  { id: string; requested_email: string; status: string; mailbox_id: string | null }[]
> {
  const result = await query<{ id: string; requested_email: string; status: string; mailbox_id: string | null }>(
    `SELECT id, requested_email, status, mailbox_id
     FROM organization_email_requests
     WHERE org_id = $1
     ORDER BY created_at ASC`,
    [orgId]
  );
  return result.rows;
}

export async function listPendingOrgEmailRequests(): Promise<
  { id: string; org_name: string; requested_email: string; requested_by_email: string; created_at: Date }[]
> {
  const result = await query<{
    id: string;
    org_name: string;
    requested_email: string;
    requested_by_email: string;
    created_at: Date;
  }>(
    `SELECT r.id, o.name as org_name, r.requested_email, u.email as requested_by_email, r.created_at
     FROM organization_email_requests r
     JOIN organizations o ON o.id = r.org_id
     JOIN users u ON u.id = r.requested_by
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC`
  );
  return result.rows;
}

export async function approveOrgEmailRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const reqResult = await query<{ id: string; org_id: string; requested_email: string }>(
    `SELECT id, org_id, requested_email FROM organization_email_requests WHERE id = $1 AND status = 'pending'`,
    [requestId]
  );
  if (reqResult.rows.length === 0) {
    return { success: false, error: 'Request not found or already processed' };
  }

  const req = reqResult.rows[0];
  const mailboxId = await ensureMailboxExists(req.requested_email, 'shared');
  await query(
    'UPDATE mailboxes SET display_name = $1 WHERE id = $2',
    [req.requested_email, mailboxId]
  );

  const membersResult = await query<{ user_id: string }>(
    `SELECT user_id FROM organization_members WHERE org_id = $1 AND status = 'active'`,
    [req.org_id]
  );
  for (const row of membersResult.rows) {
    await grantMailboxAccess(mailboxId, row.user_id, {
      can_read: true,
      can_send_as: true,
      can_reply_as: true,
      can_manage_folders: false,
    });
  }

  await query(
    `UPDATE organization_email_requests SET status = 'approved', mailbox_id = $1, updated_at = NOW() WHERE id = $2`,
    [mailboxId, requestId]
  );
  return { success: true };
}
