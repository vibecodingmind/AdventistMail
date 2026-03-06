import ldap from 'ldapjs';
import { config } from '../config/index.js';

export interface LdapAuthResult {
  success: boolean;
  dn?: string;
  email?: string;
  displayName?: string;
}

/**
 * Authenticate user against Zimbra LDAP.
 * Returns user info on success.
 */
export async function authenticateWithLdap(
  email: string,
  password: string
): Promise<LdapAuthResult> {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: config.zimbra.ldap.url,
      reconnect: false,
      timeout: 5000,
    });

    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ success: false });
    }, 10000);

    client.on('error', () => {
      clearTimeout(timeout);
      resolve({ success: false });
    });

    // If no bind credentials, try direct bind as user
    const bindDn = config.zimbra.ldap.bindDn;
    const bindPassword = config.zimbra.ldap.bindPassword;

    const doUserBind = (userDn: string) => {
      client.bind(userDn, password, (err) => {
        clearTimeout(timeout);
        client.unbind(() => client.destroy());
        if (err) {
          resolve({ success: false });
          return;
        }
        resolve({
          success: true,
          dn: userDn,
          email,
        });
      });
    };

    if (bindDn && bindPassword) {
      // Admin bind first, then search for user
      client.bind(bindDn, bindPassword, (bindErr) => {
        if (bindErr) {
          clearTimeout(timeout);
          client.unbind(() => client.destroy());
          resolve({ success: false });
          return;
        }

        const searchFilter = `(mail=${escapeLdapValue(email)})`;
        const opts = {
          filter: searchFilter,
          scope: 'sub' as const,
          attributes: ['dn', 'displayName', 'mail'],
        };

        client.search(config.zimbra.ldap.baseDn, opts, (searchErr, res) => {
          if (searchErr) {
            clearTimeout(timeout);
            client.unbind(() => client.destroy());
            resolve({ success: false });
            return;
          }

          let found = false;
          res.on('searchEntry', (entry) => {
            found = true;
            const dn = entry.pojo.objectName.toString();
            const displayName = entry.pojo.attributes?.find(
              (a: { type: string }) => a.type === 'displayName'
            )?.values?.[0];
            client.unbind(() => {
              client.destroy();
              clearTimeout(timeout);
              resolve({
                success: true,
                dn,
                email,
                displayName: displayName || undefined,
              });
            });
          });

          res.on('end', () => {
            if (!found) {
              clearTimeout(timeout);
              client.unbind(() => client.destroy());
              resolve({ success: false });
            }
          });
        });
      });
    } else {
      // Try direct bind: uid=email,ou=people,dc=church,dc=org
      const userDn = `uid=${escapeLdapValue(email)},ou=people,${config.zimbra.ldap.baseDn}`;
      doUserBind(userDn);
    }
  });
}

function escapeLdapValue(value: string): string {
  return value.replace(/[*\\()\x00]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
}
