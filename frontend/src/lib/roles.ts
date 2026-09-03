import type { UserSession } from '../api/client';
import { es } from '../i18n/es';

export function isMaster(user: UserSession | null): boolean {
  return user?.role === 'master';
}

export function isAdmin(user: UserSession | null): boolean {
  return user?.role === 'admin';
}

export function isPatient(user: UserSession | null): boolean {
  return user?.role === 'patient';
}

/** Etiqueta de rol en español para la interfaz. */
export function roleLabel(role: string): string {
  switch (role) {
    case 'master':
      return es.roleMaster;
    case 'admin':
      return es.roleAdmin;
    case 'patient':
      return es.rolePatient;
    default:
      return role;
  }
}
