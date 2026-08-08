import type { ScreeningResponse } from '../../api/client';
import type { useBatchScreening } from '../../hooks/useBatchScreening';
import type { useScreening } from '../../hooks/useScreening';
import type { useWorklist } from '../../hooks/useWorklist';
import { useAuth } from '../../context/AuthContext';
import { es } from '../../i18n/es';
import { isAdmin, isMaster } from '../../lib/roles';
import { BatchScreeningPanel } from './BatchScreeningPanel';
import { FolderWorkspace } from './FolderWorkspace';
import { UploadWorkspace } from './UploadWorkspace';

type Props = {
  screening: ReturnType<typeof useScreening>;
  batch: ReturnType<typeof useBatchScreening>;
  getWorklistStatus: ReturnType<typeof useWorklist>['getStatus'];
  onRunScreening: () => void;
  onRunBatch: () => void;
  onBatchOpen: (row: {
    filename: string;
    response?: ScreeningResponse;
  }) => void;
  onOpenViewer: () => void;
};

export function StudySourcePanel({
  screening: s,
  batch,
  getWorklistStatus,
  onRunScreening,
  onRunBatch,
  onBatchOpen,
  onOpenViewer,
}: Props) {
  const { user } = useAuth();

  return (
    <div className="pro-panel flex flex-col">
      <div className="pro-panel-header flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {es.stepSource}
        </h2>
        <div className="pro-seg">
          {isMaster(user) && (
            <button
              type="button"
              onClick={() => s.setTab('folder')}
              className={`pro-seg-btn ${s.tab === 'folder' ? 'pro-seg-btn-active' : ''}`}
            >
              {es.tabFolder}
            </button>
          )}
          <button
            type="button"
            onClick={() => s.setTab('upload')}
            className={`pro-seg-btn ${s.tab === 'upload' ? 'pro-seg-btn-active' : ''}`}
          >
            {es.tabUpload}
          </button>
        </div>
      </div>

      <div className="pro-panel-body flex flex-1 flex-col">
        {s.tab === 'folder' ? (
          <>
            <FolderWorkspace
              folder={s.folder}
              onFolderChange={s.setFolder}
              filterQuery={s.filterQuery}
              onFilterChange={s.setFilterQuery}
              imageNames={s.imageNames}
              selectedName={s.selectedName}
              onSelectStudy={(name) => {
                s.selectStudy(name);
                onOpenViewer();
              }}
              listLoading={s.listLoading}
              listTruncated={s.listTruncated}
              onPrevStudy={s.selectPrevStudy}
              onNextStudy={s.selectNextStudy}
              canPrevStudy={s.canPrevStudy}
              canNextStudy={s.canNextStudy}
              flaggedStudyName={
                s.response?.overall_flagged ? s.selectedName : undefined
              }
              getWorklistStatus={getWorklistStatus}
            />
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={s.autoAdvance}
                onChange={(event) =>
                  s.setAutoAdvance(event.target.checked)
                }
                className="rounded border-[var(--border-subtle)]"
              />
              {es.autoAdvanceLabel}
            </label>
            <button
              type="button"
              disabled={
                batch.running ||
                !s.resolvedFolder ||
                s.imageNames.length === 0 ||
                s.selected.length === 0
              }
              onClick={onRunBatch}
              className="pro-btn-secondary mt-3 w-full"
            >
              {batch.running ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-400" />
                  {es.batchRunning}
                </>
              ) : (
                es.batchScreenFolder
              )}
            </button>
            <BatchScreeningPanel
              rows={batch.rows}
              running={batch.running}
              current={batch.current}
              total={batch.total}
              onCancel={batch.cancel}
              onOpenRow={onBatchOpen}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="pro-label" htmlFor="study-patient">
                {es.patientLabel}
              </label>
              <select
                id="study-patient"
                value={s.selectedPatientId}
                onChange={(event) =>
                  s.setSelectedPatientId(event.target.value)
                }
                className="pro-input text-sm"
              >
                <option value="">{es.patientUnassigned}</option>
                {s.patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} · {patient.email}
                  </option>
                ))}
              </select>
              {isAdmin(user) && s.patients.length === 0 && (
                <p className="mt-2 text-xs text-amber-500">
                  {es.patientRequiredHint}
                </p>
              )}
            </div>
            <UploadWorkspace file={s.file} onFile={s.onFile} />
          </div>
        )}

        {s.tab === 'upload' && s.response && !s.previewUrl && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400/90">
            {es.uploadRestoreNoPreview}
          </p>
        )}
        {s.error && (
          <p
            className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-sm text-red-400"
            role="alert"
          >
            {s.error}
          </p>
        )}
        <button
          type="button"
          disabled={!s.canRun || batch.running}
          onClick={onRunScreening}
          className="pro-btn-primary mt-6"
        >
          {s.loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-950/30 border-t-teal-950" />
              {es.running}
            </>
          ) : (
            es.runScreening
          )}
        </button>
      </div>
    </div>
  );
}
