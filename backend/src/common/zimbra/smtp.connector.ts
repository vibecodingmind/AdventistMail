import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';

function getSmtpHost(): string {
  const host = config.zimbra.smtp.host;
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST in Railway Variables to your mail server (e.g. smtp.gmail.com or mail.yourchurch.org). See RAILWAY_DEPLOY.md'
    );
  }
  return host;
}

export interface SendMailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer | string }[];
  replyTo?: string;
}

export function createSmtpTransporter(user: string, password: string) {
  const host = getSmtpHost();
  return nodemailer.createTransport({
    host,
    port: config.zimbra.smtp.port,
    secure: config.zimbra.smtp.secure,
    auth: {
      user,
      pass: password,
    },
  });
}

export async function sendMail(
  user: string,
  password: string,
  options: SendMailOptions
): Promise<{ messageId?: string; success: boolean; error?: string }> {
  const transporter = createSmtpTransporter(user, password);

  try {
    const result = await transporter.sendMail({
      from: options.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      replyTo: options.replyTo,
    });

    return { messageId: result.messageId, success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
