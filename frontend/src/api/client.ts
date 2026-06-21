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
  overall_flagged: boolean;
  results: ScreeningResult[];
  is_dicom?: boolean;
  dicom_metadata?: DicomMetadata;
  preview_data_url?: string;
};

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error('settings');
  return res.json();
}

export async function fetchConditions(): Promise<ConditionInfo[]> {
  const res = await fetch(`${API_BASE}/api/conditions`);
  if (!res.ok) throw new Error('conditions');
  const data = await res.json();
  return data.conditions;
}

export async function fetchStudyMetadata(filename: string): Promise<StudyMetadata> {
  const res = await fetch(`${API_BASE}/api/study/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error('study');
  return res.json();
}

export async function fetchStudyPriors(filename: string): Promise<PriorStudy[]> {
  const res = await fetch(`${API_BASE}/api/study/${encodeURIComponent(filename)}/priors`);
  if (!res.ok) throw new Error('priors');
  const data = await res.json();
  return data.priors ?? [];
}

export async function fetchImageList(
  folder: string,
  query: string,
): Promise<ImageListResponse> {
  const params = new URLSearchParams({ folder, q: query });
  const res = await fetch(`${API_BASE}/api/images?${params}`);
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
): Promise<ScreeningResponse> {
  const params = new URLSearchParams();
  conditions.forEach((c) => params.append('conditions', c));
  if (options.includeHeatmaps) params.set('include_heatmaps', 'true');
  const res = await fetch(`${API_BASE}/api/screen/path?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, filename }),
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
  options: ScreenOptions = {},
): Promise<ScreeningResponse> {
  const params = new URLSearchParams();
  conditions.forEach((c) => params.append('conditions', c));
  if (options.includeHeatmaps) params.set('include_heatmaps', 'true');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/screen?${params}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || 'screen');
  }
  return res.json();
}
