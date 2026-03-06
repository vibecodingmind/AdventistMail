import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const ZMPRO_PATH = process.env.ZIMBRA_ZMPRO_PATH || 'zmprov';

export async function createZimbraAccount(
  email: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dn = displayName ? `displayName "${displayName.replace(/"/g, '\\"')}"` : '';
    const cmd = `"${ZMPRO_PATH}" ca ${email} ${password} ${dn}`.trim();
    await execAsync(cmd);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function setZimbraPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`"${ZMPRO_PATH}" sp ${email} ${password}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function disableZimbraAccount(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`"${ZMPRO_PATH}" ma ${email} zimbraAccountStatus closed`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function enableZimbraAccount(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`"${ZMPRO_PATH}" ma ${email} zimbraAccountStatus active`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
