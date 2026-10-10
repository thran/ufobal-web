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
