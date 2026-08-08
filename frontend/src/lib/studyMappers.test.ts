// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { PersistedStudy } from '../api/client';
import {
  isLegacyStudyReviewed,
  readLegacyReportDraft,
  writeLegacyReportDraft,
  writeLegacyStudyReviewed,
} from './legacyClinicalStorage';
import { toReportDraft, toScreeningResponse } from './studyMappers';

const study: PersistedStudy = {
  id: 'study-1',
  study_id: 'study-1',
  clinic_id: 'clinic-1',
  patient_id: 'patient-1',
  filename: 'image.png',
  status: 'reviewed',
  is_dicom: false,
  created_at: '2026-08-04T12:00:00Z',
  image_url: '/api/studies/study-1/image',
  overall_flagged: true,
  screening_run_id: 'run-1',
  results: [
    {
      condition: 'Cardiomegaly',
      condition_label: 'Cardiomegalia',
      probability: 0.8,
      threshold: 0.3,
      flagged: true,
      recommendation: 'Revisar',
    },
  ],
  report: {
    id: 'report-1',
    impression: 'Impresión',
    recommendations: 'Seguimiento',
    clinician_name: 'Dra. Demo',
    status: 'final',
    reviewed_at: '2026-08-04T12:05:00Z',
  },
};

describe('study mappers', () => {
  it('maps one persisted study to the screening UI contract', () => {
    expect(toScreeningResponse(study)).toMatchObject({
      study_id: 'study-1',
      screening_run_id: 'run-1',
      filename: 'image.png',
      overall_flagged: true,
      results: study.results,
    });
  });

  it('maps persisted report field naming once', () => {
    expect(toReportDraft(study.report)).toEqual({
      impression: 'Impresión',
      recommendations: 'Seguimiento',
      clinicianName: 'Dra. Demo',
    });
  });
});

describe('legacy clinical storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips drafts only through centralized keys', () => {
    const draft = toReportDraft(study.report);
    writeLegacyReportDraft(study.filename, draft);
    expect(readLegacyReportDraft(study.filename)).toEqual(draft);
  });

  it('round-trips the legacy reviewed flag', () => {
    writeLegacyStudyReviewed(study.filename, true);
    expect(isLegacyStudyReviewed(study.filename)).toBe(true);
    writeLegacyStudyReviewed(study.filename, false);
    expect(isLegacyStudyReviewed(study.filename)).toBe(false);
  });
});
