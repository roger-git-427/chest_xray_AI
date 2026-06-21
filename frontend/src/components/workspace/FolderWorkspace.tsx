import type { WorklistStatus } from '../../hooks/useWorklist';
import { worklistStatusClass, worklistStatusLabel } from '../../lib/worklistStatus';
import { es } from '../../i18n/es';

type Props = {
  folder: string;
  onFolderChange: (v: string) => void;
  filterQuery: string;
  onFilterChange: (v: string) => void;
  imageNames: string[];
  selectedName: string;
  onSelectStudy: (name: string) => void;
  listLoading: boolean;
  listTruncated: boolean;
  flaggedStudyName?: string;
  getWorklistStatus?: (name: string) => WorklistStatus;
  onPrevStudy?: () => void;
  onNextStudy?: () => void;
  canPrevStudy?: boolean;
  canNextStudy?: boolean;
};

export function FolderWorkspace({
  folder,
  onFolderChange,
  filterQuery,
  onFilterChange,
  imageNames,
  selectedName,
  onSelectStudy,
  listLoading,
  listTruncated,
  onPrevStudy,
  onNextStudy,
  canPrevStudy,
  canNextStudy,
  flaggedStudyName,
  getWorklistStatus,
}: Props) {
  const showNav = Boolean(onPrevStudy && onNextStudy);

  return (
    <div className="space-y-4">
      <div>
        <label className="pro-label" htmlFor="folder-path">
          {es.folderLabel}
        </label>
        <input
          id="folder-path"
          type="text"
          value={folder}
          onChange={(e) => onFolderChange(e.target.value)}
          className="pro-input font-mono text-xs"
        />
      </div>

      <div>
        <label className="pro-label" htmlFor="study-search">
          {es.filterLabel}
        </label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            id="study-search"
            type="text"
            value={filterQuery}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={es.filterPlaceholder}
            className="pro-input pl-9"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="pro-label mb-0">{es.selectImage}</span>
          <div className="flex items-center gap-2">
            {showNav && (
              <div className="flex gap-1">
                <button
                  type="button"
                  title={es.viewerPrevStudy}
                  aria-label={es.viewerPrevStudy}
                  disabled={!canPrevStudy}
                  onClick={onPrevStudy}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-teal-500/30 disabled:opacity-30"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  title={es.viewerNextStudy}
                  aria-label={es.viewerNextStudy}
                  disabled={!canNextStudy}
                  onClick={onNextStudy}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-teal-500/30 disabled:opacity-30"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
            {!listLoading && imageNames.length > 0 && (
              <span className="font-mono text-[10px] text-slate-500">
                {es.studiesCount.replace('{n}', String(imageNames.length))}
              </span>
            )}
          </div>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-black/20 py-12">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400" />
            <span className="text-sm text-slate-400">{es.running}</span>
          </div>
        ) : imageNames.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
            {es.noImagesInFolder}
          </p>
        ) : (
          <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
            {imageNames.map((name) => {
              const status = getWorklistStatus?.(name) ?? 'pending';
              return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => onSelectStudy(name)}
                  className={`study-item ${selectedName === name ? 'study-item-active' : ''}`}
                >
                  <span
                    className={`study-dot mt-1 ${
                      flaggedStudyName === name ? 'study-dot-flagged' : ''
                    }`}
                    aria-hidden
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">
                    {name}
                  </span>
                  {getWorklistStatus && (
                    <span className={`worklist-badge shrink-0 ${worklistStatusClass(status)}`}>
                      {worklistStatusLabel(status)}
                    </span>
                  )}
                </button>
              </li>
            );
            })}
          </ul>
        )}

        {listTruncated && (
          <p className="mt-2 text-[11px] text-slate-500">
            {es.listTruncated.replace('{n}', '500')}
          </p>
        )}
      </div>
    </div>
  );
}
