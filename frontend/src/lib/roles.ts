import type { UserSession } from '../api/client';

export function isMaster(user: UserSession | null): boolean {
  return user?.role === 'master';
}

export function isAdmin(user: UserSession | null): boolean {
  return user?.role === 'admin';
}

export function isPatient(user: UserSession | null): boolean {
  return user?.role === 'patient';
}
