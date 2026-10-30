import { api } from './client';
import type { User } from './types';

export interface SignupData {
  username: string;
  email: string;
  password: string;
  password_check: string;
  first_name?: string;
  last_name?: string;
}

export const getUserProfile = () => api<User | null>('user_profile');
export const login = (c: { username: string; password: string }) => api<User>('login', { method: 'POST', body: c });
export const signup = (c: SignupData) => api<User>('signup', { method: 'POST', body: c });
export const logout = async (): Promise<void> => {
  await api<string>('logout', { method: 'POST' });
};

export interface ResetLink {
  uid: string;
  token: string;
}

export interface NewPassword {
  password: string;
  password_check: string;
}

export type ResetLinkCheck = { valid: false } | { valid: true; username: string; has_password: boolean };

export const requestPasswordReset = (email: string) =>
  api<{ ok: true }>('password_reset', { method: 'POST', body: { email } });
export const checkResetLink = (link: ResetLink) =>
  api<ResetLinkCheck>('password_reset_check', { method: 'POST', body: link });
export const confirmPasswordReset = (data: ResetLink & NewPassword) =>
  api<User>('password_reset_confirm', { method: 'POST', body: data });
export const changePassword = (data: NewPassword & { old_password?: string }) =>
  api<User>('password_change', { method: 'POST', body: data });

export interface SocialLogin {
  id: number;
  provider: 'google-oauth2' | 'facebook';
  /** Google: the e-mail of the Google account; Facebook: a numeric id */
  uid: string;
}

export interface Account {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  has_password: boolean;
  social: SocialLogin[];
}

export type AccountUpdate = Pick<Account, 'username' | 'first_name' | 'last_name'>;

export const getAccount = () => api<Account>('account');
export const updateAccount = (data: AccountUpdate) => api<Account>('account', { method: 'POST', body: data });
export const requestEmailChange = (email: string) =>
  api<{ ok: true }>('email_change', { method: 'POST', body: { email } });
export const confirmEmailChange = (token: string) =>
  api<{ email: string }>('email_change_confirm', { method: 'POST', body: { token } });
export const disconnectSocial = (id: number) =>
  api<Account>('social_disconnect', { method: 'POST', body: { id } });
