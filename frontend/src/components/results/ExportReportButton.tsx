import { useState } from 'react';
import type { ScreeningResponse, StudyMetadata } from '../../api/client';
import type { ReportDraft } from '../../hooks/useReportDraft';
import { generateScreeningPdf } from '../../lib/generateScreeningPdf';
import { es } from '../../i18n/es';

type Props = {
  response: ScreeningResponse;
  sourceLabel?: string;
  imageUrl?: string | null;
  sourceKind?: string;
  screenedAt?: string;
  metadata?: StudyMetadata | null;
  reportDraft?: ReportDraft;
  clinicallyReviewed?: boolean;
  onSuccess?: () => void;
};

export function ExportReportButton({
  response,
  sourceLabel,
  imageUrl,
  sourceKind,
  screenedAt,
  metadata,
  reportDraft,
  clinicallyReviewed,
  onSuccess,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPdf = async () => {
    setBusy(true);
    setError(null);
    try {
      await generateScreeningPdf(response, {
        sourceLabel,
        imageUrl,
        sourceKind,
        screenedAt,
        metadata,
        dicomMetadata: response.dicom_metadata,
        reportDraft,
        clinicallyReviewed,
      });
      onSuccess?.();
    } catch {
      setError(es.exportPdfError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-semibold text-teal-700 transition hover:border-teal-500/50 hover:bg-teal-500/15 disabled:opacity-50 dark:text-teal-300"
      >
        {busy ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-600/30 border-t-teal-600 dark:border-teal-400/30 dark:border-t-teal-400" />
            {es.exportPdfGenerating}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-3.75L12 2.25m0 0L4.5 9.75M12 2.25v13.5"
              />
            </svg>
            {es.exportPdf}
          </>
        )}
      </button>
      {error && (
        <p className="text-[10px] text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
