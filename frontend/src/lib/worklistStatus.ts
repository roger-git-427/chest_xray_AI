import type { WorklistStatus } from '../hooks/useWorklist';
import { es } from '../i18n/es';

export function worklistStatusLabel(status: WorklistStatus): string {
  switch (status) {
    case 'screened':
      return es.worklistScreened;
    case 'reviewed':
      return es.worklistReviewed;
    case 'exported':
      return es.worklistExported;
    default:
      return es.worklistPending;
  }
}

export function worklistStatusClass(status: WorklistStatus): string {
  switch (status) {
    case 'exported':
      return 'worklist-badge-exported';
    case 'reviewed':
      return 'worklist-badge-reviewed';
    case 'screened':
      return 'worklist-badge-screened';
    default:
      return 'worklist-badge-pending';
  }
}
