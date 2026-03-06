import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';

export interface AuditLogInput {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await query(
    `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      uuidv4(),
      input.userId || null,
      input.action,
      input.resourceType || null,
      input.resourceId || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.ipAddress || null,
    ]
  );
}
