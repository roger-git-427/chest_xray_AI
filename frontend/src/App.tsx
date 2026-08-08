import { useCallback, useState } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { ClinicAdminPanel } from './components/admin/ClinicAdminPanel';
import { PatientPortal } from './components/patient/PatientPortal';
import { AppHeader } from './components/layout/AppHeader';
import { ConditionsRail } from './components/layout/ConditionsRail';
import { MobileNav, type MobilePanel } from './components/layout/MobileNav';
import { StudyTimeline } from './components/layout/StudyTimeline';
import { WorkflowBar } from './components/layout/WorkflowBar';
import { ResultsDashboard } from './components/results/ResultsDashboard';
import { ImagingViewport } from './components/workspace/ImagingViewport';
import { StudySourcePanel } from './components/workspace/StudySourcePanel';
import { generateScreeningPdf } from './lib/generateScreeningPdf';
import { useBatchScreening } from './hooks/useBatchScreening';
import { useStudyTimeline } from './hooks/useStudyTimeline';
import type { TimelineEntry } from './hooks/useStudyTimeline';
import { useScreening } from './hooks/useScreening';
import { useStudyKeyboardNav } from './hooks/useStudyKeyboardNav';
import { usePriorScreening } from './hooks/usePriorScreening';
import { useWorklist } from './hooks/useWorklist';
import {
  fetchStudyMetadata,
  imageContentUrl,
  type ScreeningResponse,
} from './api/client';
import { isClinicallyReviewed, readReportDraft } from './hooks/useReportDraft';
import { es } from './i18n/es';
import { useAuth } from './context/AuthContext';
import { isPatient } from './lib/roles';

function ScreeningApp() {
  const timeline = useStudyTimeline();
  const batch = useBatchScreening();
  const worklist = useWorklist();
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

  const studyFilename = tab === 'folder' ? s.selectedName : s.file?.name;
  const prior = usePriorScreening({
    studyFilename: studyFilename || undefined,
    tab,
    resolvedFolder,
    conditions: selected,
    timelineEntries: timeline.entries,
    addTimelineEntry: timeline.addEntry,
    markScreened: worklist.markScreened,
  });
  const {
    metadata,
    priors,
    latestPrior,
    priorScreening,
    priorImageUrl,
    screenPrior,
    loading: priorScreeningLoading,
  } = prior;

  const runScreening = async () => {
    if (tab === 'folder') await s.runFolderScreening();
    else await s.runUploadScreening();
    const label = tab === 'folder' ? s.selectedName : s.file?.name;
    if (label) worklist.markScreened(label);
    setMobilePanel('results');
  };

  const runBatch = async () => {
    if (!resolvedFolder || imageNames.length === 0 || selected.length === 0) return;
    batch.reset();
    await batch.run(resolvedFolder, imageNames, selected, (filename, response) => {
      worklist.markScreened(filename);
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
          : entry.screeningResponse.preview_data_url ?? null);
      const metadata =
        entry.tab === 'folder' && entry.filename
          ? await fetchStudyMetadata(entry.filename).catch(() => null)
          : null;
      await generateScreeningPdf(entry.screeningResponse, {
        sourceLabel: entry.studyLabel,
        imageUrl,
        sourceKind: entry.tab === 'folder' ? es.pdfSourceFolder : es.pdfSourceUpload,
        screenedAt: entry.at,
        metadata,
        reportDraft: readReportDraft(entry.studyLabel),
        clinicallyReviewed: isClinicallyReviewed(entry.studyLabel),
      });
    } catch {
      setTimelineExportError(es.errorTimelineExport);
    }
  }, []);

  const handleBatchOpen = useCallback(
    (row: { filename: string; response?: ScreeningResponse }) => {
      if (!row.response || !resolvedFolder) return;
      applyBatchResult(resolvedFolder, row.filename, row.response);
      worklist.markScreened(row.filename);
      setActiveTimelineId(null);
      setMobilePanel('results');
    },
    [applyBatchResult, resolvedFolder, worklist],
  );

  useStudyKeyboardNav(
    tab,
    batch.running,
    selectPrevStudy,
    selectNextStudy,
  );

  const folderStudyNav = tab === 'folder';

  const viewportProps = {
    imageUrl: s.previewUrl,
    studyId: s.sourceLabel ?? undefined,
    loading: s.loading || batch.running,
    sourceKind: s.pdfSourceLabel,
    screenedAt: s.screenedAt,
    metadata,
    priorImageUrl,
    priorLabel: latestPrior?.filename,
    priorCount: priors.length,
    heatmapLayers:
      s.response?.results
        .filter((r) => r.heatmap_data_url)
        .map((r) => ({ label: r.condition_label, url: r.heatmap_data_url! })) ?? [],
    isDicom: s.uploadIsDicom && !s.previewUrl,
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
    metadata,
    priorStudy: latestPrior ?? null,
    priorScreening,
    onScreenPrior:
      tab === 'folder' && latestPrior && !priorScreening ? screenPrior : undefined,
    priorScreeningLoading,
    onReviewChange: (reviewed: boolean) => {
      if (reviewed && s.sourceLabel) worklist.markReviewed(s.sourceLabel);
    },
    onExportSuccess: () => {
      if (s.sourceLabel) worklist.markExported(s.sourceLabel);
    },
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
    <StudySourcePanel
      screening={s}
      batch={batch}
      getWorklistStatus={worklist.getStatus}
      onRunScreening={() => void runScreening()}
      onRunBatch={() => void runBatch()}
      onBatchOpen={handleBatchOpen}
      onOpenViewer={() => setMobilePanel('viewer')}
    />
  );

  return (
    <div className="pro-shell pb-24 lg:pb-0">
      <AppHeader
        modelsActive={s.availableCount}
        overallFlagged={Boolean(s.response?.overall_flagged)}
      />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 sm:py-6 lg:px-8">
        <ClinicAdminPanel />
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
  const { user } = useAuth();
  return (
    <AuthGate>
      {isPatient(user) ? <PatientPortal /> : <ScreeningApp />}
    </AuthGate>
  );
}
