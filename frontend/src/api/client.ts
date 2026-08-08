export type ThresholdAnalysisRow = {
  threshold: number;
  sensitivity: number;
  specificity: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
};

export type ModelCard = {
  architecture: string;
  dataset: string;
  task: string;
  threshold: number;
  weights_updated: string | null;
  test_auc: number | null;
  evaluated_at: string | null;
  limitations: string;
  calibration_note: string;
  threshold_analysis?: ThresholdAnalysisRow[];
  status?: string;
};

export type ConditionInfo = {
  id: string;
  label: string;
  threshold: number;
  available: boolean;
  model_card?: ModelCard;
};

export type StudyMetadata = {
  filename: string;
  patient_id: string | null;
  follow_up: number;
  age: string | null;
  gender: string | null;
  view_position: string | null;
  finding_labels: string | null;
};

export type DicomMetadata = {
  patient_id?: string | null;
  patient_name?: string | null;
  patient_age?: string | null;
  patient_sex?: string | null;
  view_position?: string | null;
  study_date?: string | null;
  study_description?: string | null;
  modality?: string | null;
  window_center?: string | null;
  window_width?: string | null;
};

export type PriorStudy = StudyMetadata & {
  follow_up_delta: number;
};

export type ScreeningResult = {
  condition: string;
  condition_label: string;
  probability: number;
  threshold: number;
  flagged: boolean;
  recommendation: string;
  heatmap_data_url?: string | null;
};

export type ScreeningResponse = {
  filename: string;
  study_id?: string;
  screening_run_id?: string;
  status?: WorklistStatus;
  overall_flagged: boolean;
  results: ScreeningResult[];
  is_dicom?: boolean;
  dicom_metadata?: DicomMetadata;
  preview_data_url?: string;
  report?: PersistedReport | null;
};

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type UserRole = 'master' | 'admin' | 'patient';
export type WorklistStatus = 'pending' | 'screened' | 'reviewed' | 'exported';

export type ClinicSummary = {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
};

export type UserSession = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinics: ClinicSummary[];
};

export type ClinicMember = {
  membership_id: string;
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
};

export type PersistedReport = {
  id: string;
  impression: string;
  recommendations: string;
  clinician_name: string;
  status: 'draft' | 'final';
  reviewed_at: string | null;
};

export type PersistedStudy = {
  id: string;
  study_id: string;
  clinic_id: string;
  patient_id: string | null;
  filename: string;
  status: WorklistStatus;
  is_dicom: boolean;
  dicom_metadata?: DicomMetadata | null;
  created_at: string;
  image_url: string;
  report?: PersistedReport | null;
  screening_run_id?: string;
  overall_flagged?: boolean;
  results?: ScreeningResult[];
};

function cookieValue(name: string): string | null {
  const item = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = cookieValue('byteai_csrf');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
}

export async function login(
  email: string,
  password: string,
): Promise<UserSession> {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('auth');
  const data = await res.json();
  return data.user;
}

export async function fetchCurrentUser(): Promise<UserSession> {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) throw new Error('auth');
  const data = await res.json();
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function fetchClinics(): Promise<ClinicSummary[]> {
  const res = await apiFetch('/api/clinics');
  if (!res.ok) throw new Error('clinics');
  const data = await res.json();
  return data.clinics;
}

export async function createClinic(
  name: string,
  slug?: string,
): Promise<ClinicSummary> {
  const res = await apiFetch('/api/clinics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug: slug || undefined }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchClinicMembers(
  clinicId: string,
): Promise<ClinicMember[]> {
  const res = await apiFetch(`/api/clinics/${clinicId}/members`);
  if (!res.ok) throw new Error('members');
  const data = await res.json();
  return data.members;
}

export async function createClinicMember(
  clinicId: string,
  member: {
    email: string;
    full_name: string;
    role: 'admin' | 'patient';
    password: string;
  },
): Promise<ClinicMember> {
  const res = await apiFetch(`/api/clinics/${clinicId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchPersistedStudies(
  clinicId?: string,
): Promise<PersistedStudy[]> {
  const params = clinicId
    ? `?${new URLSearchParams({ clinic_id: clinicId })}`
    : '';
  const res = await apiFetch(`/api/studies${params}`);
  if (!res.ok) throw new Error('studies');
  const data = await res.json();
  return data.studies;
}

export async function fetchPersistedStudy(
  studyId: string,
): Promise<PersistedStudy> {
  const res = await apiFetch(`/api/studies/${studyId}`);
  if (!res.ok) throw new Error('study');
  return res.json();
}

export async function savePersistedReport(
  studyId: string,
  report: {
    impression: string;
    recommendations: string;
    clinician_name: string;
  },
): Promise<PersistedReport> {
  const res = await apiFetch(`/api/studies/${studyId}/report`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error('report');
  return res.json();
}

export async function reviewPersistedStudy(
  studyId: string,
): Promise<PersistedStudy> {
  const res = await apiFetch(`/api/studies/${studyId}/review`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('review');
  return res.json();
}

export async function markPersistedStudyExported(
  studyId: string,
): Promise<void> {
  const res = await apiFetch(`/api/studies/${studyId}/export`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('export');
}

export type AppSettings = {
  default_image_dir: string;
  max_list: number;
};

export type ImageListResponse = {
  folder: string;
  query: string;
  names: string[];
  truncated: boolean;
  max_list: number;
};

export async function fetchSettings(): Promise<AppSettings> {
  const res = await apiFetch('/api/settings');
  if (!res.ok) throw new Error('settings');
  return res.json();
}

export async function fetchConditions(): Promise<ConditionInfo[]> {
  const res = await apiFetch('/api/conditions');
  if (!res.ok) throw new Error('conditions');
  const data = await res.json();
  return data.conditions;
}

export async function fetchStudyMetadata(filename: string): Promise<StudyMetadata> {
  const res = await apiFetch(`/api/study/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error('study');
  return res.json();
}

export async function fetchStudyPriors(filename: string): Promise<PriorStudy[]> {
  const res = await apiFetch(`/api/study/${encodeURIComponent(filename)}/priors`);
  if (!res.ok) throw new Error('priors');
  const data = await res.json();
  return data.priors ?? [];
}

export async function fetchImageList(
  folder: string,
  query: string,
): Promise<ImageListResponse> {
  const params = new URLSearchParams({ folder, q: query });
  const res = await apiFetch(`/api/images?${params}`);
  if (!res.ok) throw new Error('images');
  return res.json();
}

export function imageContentUrl(folder: string, name: string): string {
  const params = new URLSearchParams({ folder, name });
  return `${API_BASE}/api/images/content?${params}`;
}

export type ScreenOptions = {
  includeHeatmaps?: boolean;
};

export async function screenImageFromPath(
  folder: string,
  filename: string,
  conditions: string[],
  options: ScreenOptions = {},
  clinicId?: string,
  patientId?: string,
): Promise<ScreeningResponse> {
  const params = new URLSearchParams();
  conditions.forEach((c) => params.append('conditions', c));
  if (options.includeHeatmaps) params.set('include_heatmaps', 'true');
  const endpoint = clinicId ? '/api/studies/screen/path' : '/api/screen/path';
  const res = await apiFetch(`${endpoint}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder,
      filename,
      clinic_id: clinicId,
      patient_id: patientId || undefined,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || 'screen');
  }
  return res.json();
}

export async function screenImage(
  file: File,
  conditions: string[],
  clinicId?: string,
  patientId?: string,
  options: ScreenOptions = {},
): Promise<ScreeningResponse> {
  const params = new URLSearchParams();
  conditions.forEach((c) => params.append('conditions', c));
  if (options.includeHeatmaps) params.set('include_heatmaps', 'true');
  const form = new FormData();
  form.append('file', file);
  if (clinicId) form.append('clinic_id', clinicId);
  if (patientId) form.append('patient_id', patientId);
  const endpoint = clinicId ? '/api/studies/screen' : '/api/screen';
  const res = await apiFetch(`${endpoint}?${params}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || 'screen');
  }
  return res.json();
}
