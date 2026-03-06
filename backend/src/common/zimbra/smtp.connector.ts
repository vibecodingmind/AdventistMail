import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';

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
  return nodemailer.createTransport({
    host: config.zimbra.smtp.host,
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
