import { useCallback, useEffect, useState } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { AppHeader } from './components/layout/AppHeader';
import { ConditionsRail } from './components/layout/ConditionsRail';
import { MobileNav, type MobilePanel } from './components/layout/MobileNav';
import { StudyTimeline } from './components/layout/StudyTimeline';
import { WorkflowBar } from './components/layout/WorkflowBar';
import { ResultsDashboard } from './components/results/ResultsDashboard';
import { BatchScreeningPanel } from './components/workspace/BatchScreeningPanel';
import { FolderWorkspace } from './components/workspace/FolderWorkspace';
import { ImagingViewport } from './components/workspace/ImagingViewport';
import { UploadWorkspace } from './components/workspace/UploadWorkspace';
import { generateScreeningPdf } from './lib/generateScreeningPdf';
import { useBatchScreening } from './hooks/useBatchScreening';
import { useStudyTimeline } from './hooks/useStudyTimeline';
import type { TimelineEntry } from './hooks/useStudyTimeline';
import { useScreening } from './hooks/useScreening';
import { imageContentUrl, type ScreeningResponse } from './api/client';
import { es } from './i18n/es';

function ScreeningApp() {
  const timeline = useStudyTimeline();
  const batch = useBatchScreening();
  const s = useScreening(timeline.addEntry);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('study');
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [timelineExportError, setTimelineExportError] = useState<string | null>(null);

  const {
    restoreFromTimeline,
    applyBatchResult,
    selectPrevStudy,
    selectNextStudy,
    tab,
    resolvedFolder,
    imageNames,
    selected,
  } = s;

  const runScreening = async () => {
    if (tab === 'folder') await s.runFolderScreening();
    else await s.runUploadScreening();
    setMobilePanel('results');
  };

  const runBatch = async () => {
    if (!resolvedFolder || imageNames.length === 0 || selected.length === 0) return;
    batch.reset();
    await batch.run(resolvedFolder, imageNames, selected, (filename, response) => {
      timeline.addEntry(filename, response, {
        tab: 'folder',
        folder: resolvedFolder,
        filename,
        imageUrl: imageContentUrl(resolvedFolder, filename),
      });
    });
  };

  const handleTimelineSelect = useCallback(
    (entry: TimelineEntry) => {
      restoreFromTimeline(entry);
      setActiveTimelineId(entry.id);
      setTimelineExportError(null);
      setMobilePanel('results');
    },
    [restoreFromTimeline],
  );

  const handleTimelineExport = useCallback(async (entry: TimelineEntry) => {
    setTimelineExportError(null);
    try {
      const imageUrl =
        entry.imageUrl ??
        (entry.tab === 'folder' && entry.folder && entry.filename
          ? imageContentUrl(entry.folder, entry.filename)
          : null);
      await generateScreeningPdf(entry.screeningResponse, {
        sourceLabel: entry.studyLabel,
        imageUrl,
        sourceKind: entry.tab === 'folder' ? es.pdfSourceFolder : es.pdfSourceUpload,
        screenedAt: entry.at,
      });
    } catch {
      setTimelineExportError(es.errorTimelineExport);
    }
  }, []);

  const handleBatchOpen = useCallback(
    (row: { filename: string; response?: ScreeningResponse }) => {
      if (!row.response || !resolvedFolder) return;
      applyBatchResult(resolvedFolder, row.filename, row.response);
      setActiveTimelineId(null);
      setMobilePanel('results');
    },
    [applyBatchResult, resolvedFolder],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target?.isContentEditable) return;
      if (tab !== 'folder' || batch.running) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        selectNextStudy();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        selectPrevStudy();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab, batch.running, selectNextStudy, selectPrevStudy]);

  const folderStudyNav = tab === 'folder';

  const viewportProps = {
    imageUrl: s.previewUrl,
    studyId: s.sourceLabel ?? undefined,
    loading: s.loading || batch.running,
    sourceKind: s.pdfSourceLabel,
    screenedAt: s.screenedAt,
    onPrevStudy: folderStudyNav ? selectPrevStudy : undefined,
    onNextStudy: folderStudyNav ? selectNextStudy : undefined,
    canPrevStudy: folderStudyNav && s.canPrevStudy,
    canNextStudy: folderStudyNav && s.canNextStudy,
  };

  const resultsProps = {
    response: s.response,
    sourceLabel: s.sourceLabel,
    imageUrl: s.previewUrl,
    sourceKind: s.pdfSourceLabel,
    screenedAt: s.screenedAt ?? undefined,
  };

  const timelineProps = {
    entries: timeline.entries,
    onClear: () => {
      timeline.clear();
      setActiveTimelineId(null);
    },
    onSelect: handleTimelineSelect,
    onExport: handleTimelineExport,
    activeId: activeTimelineId,
    exportError: timelineExportError,
  };

  const studyPanel = (
    <div className="pro-panel flex flex-col">
      <div className="pro-panel-header flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {es.stepSource}
        </h2>
        <div className="pro-seg">
          <button
            type="button"
            onClick={() => s.setTab('folder')}
            className={`pro-seg-btn ${s.tab === 'folder' ? 'pro-seg-btn-active' : ''}`}
          >
            {es.tabFolder}
          </button>
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
                setMobilePanel('viewer');
              }}
              listLoading={s.listLoading}
              listTruncated={s.listTruncated}
              onPrevStudy={selectPrevStudy}
              onNextStudy={selectNextStudy}
              canPrevStudy={s.canPrevStudy}
              canNextStudy={s.canNextStudy}
              flaggedStudyName={
                s.response?.overall_flagged ? s.selectedName : undefined
              }
            />
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={s.autoAdvance}
                onChange={(e) => s.setAutoAdvance(e.target.checked)}
                className="rounded border-[var(--border-subtle)]"
              />
              {es.autoAdvanceLabel}
            </label>
            <button
              type="button"
              disabled={
                batch.running ||
                !resolvedFolder ||
                imageNames.length === 0 ||
                selected.length === 0
              }
              onClick={runBatch}
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
              onOpenRow={handleBatchOpen}
            />
          </>
        ) : (
          <UploadWorkspace file={s.file} onFile={s.onFile} />
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
          onClick={runScreening}
          className="pro-btn-primary mt-6"
        >
          {s.loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-950/30 border-t-teal-950" />
              {es.running}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
              {es.runScreening}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pro-shell pb-24 lg:pb-0">
      <AppHeader
        modelsActive={s.availableCount}
        overallFlagged={Boolean(s.response?.overall_flagged)}
      />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 sm:py-6 lg:px-8">
        <div className="mb-4 animate-in sm:mb-6">
          <WorkflowBar step={s.workflowStep} />
        </div>

        {/* Laptop (lg): sidebar | study → viewport → informe. XL: sidebar | study + viewport | informe */}
        <div className="pro-desktop-grid hidden lg:grid lg:items-start lg:gap-5 xl:gap-6">
          <aside className="pro-desktop-sidebar flex min-h-0 flex-col gap-5">
            <ConditionsRail
              conditions={s.conditions}
              selected={s.selected}
              onToggle={s.toggleCondition}
            />
            <StudyTimeline {...timelineProps} compact />
          </aside>

          <div className="pro-desktop-study min-w-0 animate-in-delay-1">{studyPanel}</div>

          <div className="pro-desktop-viewport min-w-0 animate-in-delay-2">
            <ImagingViewport {...viewportProps} />
          </div>

          <div className="pro-desktop-results min-w-0">
            <ResultsDashboard {...resultsProps} />
          </div>
        </div>

        <div className="lg:hidden">
          {mobilePanel === 'study' && <div className="animate-in">{studyPanel}</div>}
          {mobilePanel === 'viewer' && <ImagingViewport {...viewportProps} />}
          {mobilePanel === 'results' && <ResultsDashboard {...resultsProps} />}
          {mobilePanel === 'protocol' && (
            <div className="animate-in space-y-4">
              <ConditionsRail
                conditions={s.conditions}
                selected={s.selected}
                onToggle={s.toggleCondition}
              />
              <StudyTimeline {...timelineProps} />
            </div>
          )}
        </div>

        <div className="mt-4 lg:mt-6">
          <footer className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-950/30 px-4 py-3 dark:bg-amber-950/40">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500/80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
              />
            </svg>
            <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/85">
              {es.disclaimer}
            </p>
          </footer>
        </div>
      </div>

      <MobileNav
        active={mobilePanel}
        onChange={setMobilePanel}
        hasResults={Boolean(s.response)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <ScreeningApp />
    </AuthGate>
  );
}
