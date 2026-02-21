import { getStoredToken } from "./contexts/AuthContext";

const API_BASE = "";

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
    throw new Error(text || `HTTP ${res.status}`);
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
