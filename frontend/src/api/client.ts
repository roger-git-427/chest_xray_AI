export type ConditionInfo = {
  id: string;
  label: string;
  threshold: number;
  available: boolean;
};

export type ScreeningResult = {
  condition: string;
  condition_label: string;
  probability: number;
  threshold: number;
  flagged: boolean;
  recommendation: string;
};

export type ScreeningResponse = {
  filename: string;
  overall_flagged: boolean;
  results: ScreeningResult[];
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

export async function screenImageFromPath(
  folder: string,
  filename: string,
  conditions: string[],
): Promise<ScreeningResponse> {
  const params = new URLSearchParams();
  conditions.forEach((c) => params.append('conditions', c));
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
): Promise<ScreeningResponse> {
  const params = new URLSearchParams();
  conditions.forEach((c) => params.append('conditions', c));
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
