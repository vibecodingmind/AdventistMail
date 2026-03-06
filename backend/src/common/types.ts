export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  zimbra_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Mailbox {
  id: string;
  email: string;
  type: 'personal' | 'shared';
  display_name: string | null;
  zimbra_id: string | null;
  created_at: Date;
}

export interface MailboxAccess {
  id: string;
  user_id: string;
  mailbox_id: string;
  can_read: boolean;
  can_send_as: boolean;
  can_reply_as: boolean;
  can_manage_folders: boolean;
  created_at: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
