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
