const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function apiFetch<T = unknown>(
  path: string,
  options: Omit<RequestInit, 'body'> & { token?: string; body?: BodyInit | Record<string, unknown> | null } = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const serializedBody = body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof ArrayBuffer)
    ? JSON.stringify(body)
    : body as BodyInit | null | undefined;
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: serializedBody,
    ...rest,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  return res.json();
}

export type BackendUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

export type SkillGap = {
  skill: string;
  current: number;
  required: number;
  gap: number;
  priority: string;
};

export type DashboardOverview = {
  match_score: number;
  skills_analyzed: number;
  gaps_found: number;
  total_analyses: number;
  recent_analyses: {
    id: number;
    target_role: string;
    match_score: number;
    created_at: string | null;
  }[];
  top_gaps: SkillGap[];
};

export type AnalysisHistoryItem = {
  id: number;
  target_role: string;
  level: string;
  match_score: number;
  missing_skills: string[];
  created_at: string | null;
};

export type AnalysisResult = {
  analysis_id: number;
  match_score: number;
  target_role: string;
  level: string;
  skills: SkillGap[];
  missing_skills: string[];
  recommended_courses: string[];
};

export type RecommendationDetail = {
  id: number;
  match_score: number;
  target_role: string;
  level: string;
  skills: SkillGap[];
  missing_skills: string[];
  recommended_courses: string[];
  created_at: string | null;
};
