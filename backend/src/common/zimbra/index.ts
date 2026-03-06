export {
  createImapClient,
  fetchMessageList,
  fetchMessageSource,
  getMailboxList,
} from './imap.connector.js';
export type {
  ImapConnectionOptions,
  FetchMessageOptions,
  MessageSummary,
} from './imap.connector.js';
export { createSmtpTransporter, sendMail } from './smtp.connector.js';
export type { SendMailOptions } from './smtp.connector.js';
