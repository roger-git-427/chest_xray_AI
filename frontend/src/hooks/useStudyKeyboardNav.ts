import { useEffect } from 'react';
import type { WorkspaceTab } from '../types/workspace';

export function useStudyKeyboardNav(
  tab: WorkspaceTab,
  disabled: boolean,
  selectPrevious: () => void,
  selectNext: () => void,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
        target?.isContentEditable ||
        tab !== 'folder' ||
        disabled
      ) {
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        selectNext();
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        selectPrevious();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab, disabled, selectPrevious, selectNext]);
}
