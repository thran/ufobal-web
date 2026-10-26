import type { User } from '../api/types';

type MaybeUser = User | null | undefined;

export const isLoggedIn = (u: MaybeUser): boolean => !!u;
export const isManager = (u: MaybeUser): boolean => !!u?.is_manager;
export const isAdmin = (u: MaybeUser): boolean => !!u?.is_admin;
export const canRecord = (u: MaybeUser): boolean => !!u?.is_authorized;
export const isOwnPlayer = (u: MaybeUser, playerPk: number): boolean => u?.player?.pk === playerPk;
