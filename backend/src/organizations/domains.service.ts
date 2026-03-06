import crypto from 'crypto';
import dns from 'dns';
import { query } from '../db/index.js';
import { isOrgAdmin } from './organizations.service.js';

interface DomainRow {
  id: string;
  org_id: string;
  domain: string;
  verification_token: string;
  verified_at: Date | null;
  created_at: Date;
}

function normalizeDomain(input: string): string {
  let d = input.toLowerCase().trim();
  d = d.replace(/^@/, '');
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/\/.*$/, '');
  return d;
}

export async function addDomain(
  orgId: string,
  domain: string,
  userId: string
): Promise<{ success: boolean; error?: string; domain?: string; verification_record?: string; record_name?: string }> {
  const admin = await isOrgAdmin(orgId, userId);
  if (!admin) {
    return { success: false, error: 'Only org admins can add domains' };
  }

  const normalized = normalizeDomain(domain);
  if (!normalized || !normalized.includes('.')) {
    return { success: false, error: 'Invalid domain' };
  }

  const existing = await query<{ id: string; org_id: string }>(
    'SELECT id, org_id FROM organization_domains WHERE domain = $1',
    [normalized]
  );
  if (existing.rows.length > 0) {
    if (existing.rows[0].org_id === orgId) {
      return { success: false, error: 'Domain already added to this organization' };
    }
    return { success: false, error: 'Domain is already in use by another organization' };
  }

  const token = crypto.randomBytes(16).toString('hex');

  await query(
    `INSERT INTO organization_domains (org_id, domain, verification_token)
     VALUES ($1, $2, $3)`,
    [orgId, normalized, token]
  );

  return {
    success: true,
    domain: normalized,
    verification_record: `adventist-mail-verify=${token}`,
    record_name: `_adventistmail.${normalized}`,
  };
}

export async function listDomains(orgId: string): Promise<DomainRow[]> {
  const result = await query<DomainRow>(
    `SELECT id, domain, verification_token, verified_at, created_at
     FROM organization_domains
     WHERE org_id = $1
     ORDER BY created_at ASC`,
    [orgId]
  );
  return result.rows;
}

export async function verifyDomain(
  domainId: string,
  orgId: string,
  userId: string
): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  const admin = await isOrgAdmin(orgId, userId);
  if (!admin) {
    return { success: false, error: 'Only org admins can verify domains' };
  }

  const result = await query<DomainRow>(
    'SELECT id, domain, verification_token, verified_at FROM organization_domains WHERE id = $1 AND org_id = $2',
    [domainId, orgId]
  );
  if (result.rows.length === 0) {
    return { success: false, error: 'Domain not found' };
  }

  const row = result.rows[0];
  if (row.verified_at) {
    return { success: true, verified: true };
  }

  const expectedValue = `adventist-mail-verify=${row.verification_token}`;
  const lookupHost = `_adventistmail.${row.domain}`;

  try {
    const records = await dns.promises.resolveTxt(lookupHost);
    const found = records.some((txtArray) =>
      txtArray.some((txt) => txt === expectedValue)
    );

    if (found) {
      await query(
        'UPDATE organization_domains SET verified_at = NOW() WHERE id = $1',
        [domainId]
      );
      return { success: true, verified: true };
    }

    return {
      success: true,
      verified: false,
      error: `TXT record not found. Add a TXT record for ${lookupHost} with value "${expectedValue}"`,
    };
  } catch (err) {
    return {
      success: true,
      verified: false,
      error: `DNS lookup failed for ${lookupHost}. Ensure the TXT record exists.`,
    };
  }
}

export async function removeDomain(
  domainId: string,
  orgId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await isOrgAdmin(orgId, userId);
  if (!admin) {
    return { success: false, error: 'Only org admins can remove domains' };
  }

  const result = await query<DomainRow>(
    'SELECT id, verified_at FROM organization_domains WHERE id = $1 AND org_id = $2',
    [domainId, orgId]
  );
  if (result.rows.length === 0) {
    return { success: false, error: 'Domain not found' };
  }

  if (result.rows[0].verified_at) {
    return { success: false, error: 'Cannot remove a verified domain. Contact support.' };
  }

  await query('DELETE FROM organization_domains WHERE id = $1', [domainId]);
  return { success: true };
}

export async function isDomainVerifiedForOrg(orgId: string, email: string): Promise<boolean> {
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 0) return false;
  const domain = email.substring(atIndex + 1).toLowerCase();

  const result = await query(
    'SELECT 1 FROM organization_domains WHERE org_id = $1 AND domain = $2 AND verified_at IS NOT NULL',
    [orgId, domain]
  );
  return result.rows.length > 0;
}
