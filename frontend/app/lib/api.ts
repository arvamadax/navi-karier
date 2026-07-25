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
  reference_standard: string | null;
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
  reference_standard: string | null;
};

export type RoleCount = { role: string; count: number };
export type GapAgg = { skill: string; avg_gap: number; count: number };

export type AdminOverview = {
  total_users: number;
  total_jobseekers: number;
  total_companies: number;
  total_admins: number;
  total_analyses: number;
  total_cvs: number;
  avg_match_score: number;
  users_by_role: Record<string, number>;
  top_roles: RoleCount[];
  recent_users: { id: number; name: string; email: string; role: string; created_at: string | null }[];
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  target_role: string | null;
  analyses_count: number;
  created_at: string | null;
};

export type CompanyOverview = {
  total_candidates: number;
  total_analyses: number;
  avg_match_score: number;
  job_ready: number;
  top_roles: RoleCount[];
  top_gaps: GapAgg[];
};

export type TalentCandidate = {
  analysis_id: number;
  candidate: string;
  target_role: string;
  level: string;
  match_score: number;
  missing_count: number;
  created_at: string | null;
};

export type JobRole = {
  id: number;
  title: string;
  level: string;
  required_skills: string[];
  match_count: number;
  created_at: string | null;
};

export type Invite = {
  id: number;
  token: string;
  target_role: string;
  level: string;
  candidate_email: string | null;
  candidate_name: string | null;
  status: string;
  link: string;
  created_at: string | null;
};

export type InvitePublic = {
  target_role: string;
  level: string;
  company_name: string;
  status: string;
};
