import { getStoredToken } from "./contexts/AuthContext";

const API_BASE = "";

/** Extract a short, user-friendly message from FastAPI-style error JSON. */
function parseErrorDetail(text: string): string | null {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as { detail?: string | unknown[] };
      const d = data.detail;
      if (typeof d === "string") return d;
      if (Array.isArray(d) && d.length > 0) {
        const first = d[0];
        if (first && typeof first === "object" && "msg" in first) return String((first as { msg: string }).msg);
      }
    } catch {
      /* ignore parse errors */
    }
  }
  return null;
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    const message = parseErrorDetail(text) || text || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  username: string;
  email?: string | null;
  created_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function postLogin(username: string, password: string) {
  return fetchApi<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function postSignup(username: string, password: string) {
  return fetchApi<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function postGoogleLogin(idToken: string) {
  return fetchApi<TokenResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export async function postAppleLogin(idToken: string) {
  return fetchApi<TokenResponse>("/api/auth/apple", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
}

export interface MatchPayload {
  preferences: Record<string, number>;
  top_n?: number;
  profile?: Record<string, unknown>;
}

export async function postMatch(payload: MatchPayload) {
  return fetchApi<import("./types").MatchResponse>("/api/match", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getColleges(search = "", state = "", limit = 50) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (state) params.set("state", state);
  params.set("limit", String(limit));
  return fetchApi<import("./types").CollegeListItem[]>(
    `/api/colleges?${params.toString()}`
  );
}

export async function getCollegeDetail(unitid: number) {
  return fetchApi<import("./types").CollegeDetail>(`/api/colleges/${unitid}`);
}

export interface FinancialPlanPayload {
  unitid: number;
  budget_per_semester: number;
  total_savings: number;
  in_state?: boolean;
  on_campus?: boolean;
  degree_years?: number;
}

export async function postFinancialPlan(payload: FinancialPlanPayload) {
  return fetchApi<import("./types").FinancialPlan>("/api/financial-plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface AlternativesPayload {
  budget_per_semester: number;
  state?: string | null;
  in_state?: boolean;
  limit?: number;
}

export async function postAlternatives(payload: AlternativesPayload) {
  return fetchApi<import("./types").AlternativeRow[]>("/api/alternatives", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface BudgetTrackerPayload {
  total_cost: number;
  semesters_completed: number;
  total_semesters: number;
  amount_spent: number;
}

export async function postBudgetTracker(payload: BudgetTrackerPayload) {
  return fetchApi<import("./types").BudgetTrackerResult>("/api/budget-tracker", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ComparePayload {
  unitids: number[];
  in_state?: boolean;
  on_campus?: boolean;
}

export async function postCompare(payload: ComparePayload) {
  return fetchApi<import("./types").CostResult[]>("/api/compare", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postSuggestSliders(
  profile: Record<string, unknown>
) {
  return fetchApi<{ suggested_sliders: Record<string, number> }>(
    "/api/suggest-sliders",
    { method: "POST", body: JSON.stringify({ profile }) }
  );
}

export async function postPredict(
  profile: Record<string, unknown>,
  unitids: number[]
) {
  return fetchApi<Record<string, unknown>>("/api/predict", {
    method: "POST",
    body: JSON.stringify({ profile, unitids }),
  });
}
