import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/adventist_church_mail',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  zimbra: {
    ldap: {
      url: process.env.ZIMBRA_LDAP_URL || 'ldaps://mail.church.org:636',
      baseDn: process.env.ZIMBRA_LDAP_BASE_DN || 'dc=church,dc=org',
      bindDn: process.env.ZIMBRA_LDAP_BIND_DN || '',
      bindPassword: process.env.ZIMBRA_LDAP_BIND_PASSWORD || '',
    },
    imap: {
      host: process.env.ZIMBRA_IMAP_HOST || 'mail.church.org',
      port: parseInt(process.env.ZIMBRA_IMAP_PORT || '993', 10),
      secure: process.env.ZIMBRA_IMAP_SECURE !== 'false',
    },
    smtp: {
      // Use SMTP_* for any mail server, or ZIMBRA_SMTP_* for Zimbra
      host: process.env.SMTP_HOST || process.env.ZIMBRA_SMTP_HOST || 'mail.church.org',
      port: parseInt(process.env.SMTP_PORT || process.env.ZIMBRA_SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_SECURE || process.env.ZIMBRA_SMTP_SECURE) === 'true',
    },
  },
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
  },
  smtp: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  provisioning: {
    mode: process.env.MAIL_PROVISIONING_MODE || 'manual',
    webhookUrl: process.env.PROVISIONING_WEBHOOK_URL || '',
  },
} as const;
