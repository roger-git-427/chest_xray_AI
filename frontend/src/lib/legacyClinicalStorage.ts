import type { ReportDraft } from './studyMappers';

const DRAFT_PREFIX = 'byteai-report-draft-';
const REVIEWED_PREFIX = 'byteai-reviewed-';
const EMPTY_DRAFT: ReportDraft = {
  impression: '',
  recommendations: '',
  clinicianName: '',
};

export function readLegacyReportDraft(
  studyKey: string | undefined,
): ReportDraft {
  if (!studyKey) return EMPTY_DRAFT;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${studyKey}`);
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function writeLegacyReportDraft(
  studyKey: string,
  draft: ReportDraft,
): void {
  localStorage.setItem(`${DRAFT_PREFIX}${studyKey}`, JSON.stringify(draft));
}

export function isLegacyStudyReviewed(
  studyKey: string | undefined,
): boolean {
  return Boolean(
    studyKey &&
      localStorage.getItem(`${REVIEWED_PREFIX}${studyKey}`) === '1',
  );
}

export function writeLegacyStudyReviewed(
  studyKey: string,
  reviewed: boolean,
): void {
  const key = `${REVIEWED_PREFIX}${studyKey}`;
  if (reviewed) localStorage.setItem(key, '1');
  else localStorage.removeItem(key);
}
