import { config } from '../config/index.js';

export interface ProvisioningResult {
  success: boolean;
  error?: string;
}

export async function provisionMailbox(
  email: string,
  password?: string
): Promise<ProvisioningResult> {
  const mode = config.provisioning.mode;

  switch (mode) {
    case 'zimbra':
      console.log(`[provisioning:zimbra] Would provision mailbox: ${email}`);
      return { success: true };

    case 'api': {
      const webhookUrl = config.provisioning.webhookUrl;
      if (!webhookUrl) {
        console.warn('[provisioning:api] PROVISIONING_WEBHOOK_URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', email, password }),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, error: `Webhook returned ${res.status}: ${body}` };
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Webhook call failed' };
      }
    }

    case 'manual':
    default:
      console.log(`[provisioning:manual] Mailbox needs manual provisioning on mail server: ${email}`);
      return { success: true };
  }
}

export async function deprovisionMailbox(email: string): Promise<ProvisioningResult> {
  const mode = config.provisioning.mode;

  switch (mode) {
    case 'zimbra':
      console.log(`[provisioning:zimbra] Would deprovision mailbox: ${email}`);
      return { success: true };

    case 'api': {
      const webhookUrl = config.provisioning.webhookUrl;
      if (!webhookUrl) {
        return { success: false, error: 'Webhook URL not configured' };
      }
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', email }),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, error: `Webhook returned ${res.status}: ${body}` };
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Webhook call failed' };
      }
    }

    case 'manual':
    default:
      console.log(`[provisioning:manual] Mailbox needs manual deprovisioning on mail server: ${email}`);
      return { success: true };
  }
}

export async function checkMailboxExists(email: string): Promise<boolean> {
  const mode = config.provisioning.mode;

  switch (mode) {
    case 'zimbra':
      console.log(`[provisioning:zimbra] Would check mailbox existence: ${email}`);
      return false;

    case 'api': {
      const webhookUrl = config.provisioning.webhookUrl;
      if (!webhookUrl) return false;
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check', email }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return !!data.exists;
      } catch {
        return false;
      }
    }

    case 'manual':
    default:
      console.log(`[provisioning:manual] Cannot check mailbox existence in manual mode: ${email}`);
      return false;
  }
}
