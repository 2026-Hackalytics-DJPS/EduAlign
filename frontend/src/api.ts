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
  is_admin?: boolean;
  profile_complete?: boolean;
  gpa?: number | null;
  sat?: number | null;
  intended_major?: string | null;
  preferred_state?: string | null;
  school_size?: string | null;
  budget_range?: string | null;
  campus_vibe?: string | null;
  sports?: string | null;
  extracurriculars?: string | null;
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
  return fetchApi<import("./types").PredictResponse>("/api/predict", {
    method: "POST",
    body: JSON.stringify({ profile, unitids }),
  });
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function getAdminDashboard() {
  return fetchApi<{ users: AuthUser[] }>("/api/admin/dashboard");
}

export interface AdminStats {
  total_users: number;
  profiles_complete: number;
  signups_last_7_days: number;
  total_matches_run: number;
  total_financial_plans_run: number;
  most_searched_college: string | null;
  groq_vs_fallback_ratio: string;
}

export async function getAdminStats() {
  return fetchApi<AdminStats>("/api/admin/stats");
}

export interface ActivityRow {
  id: number;
  user_id: number | null;
  username: string | null;
  action_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export async function getAdminActivity() {
  return fetchApi<ActivityRow[]>("/api/admin/activity");
}

export interface SignupDay {
  date: string;
  count: number;
}

export async function getAdminSignupsOverTime() {
  return fetchApi<SignupDay[]>("/api/admin/signups-over-time");
}

export interface MatchAnalytics {
  top_matched_colleges: { college: string; count: number }[];
  average_similarity_score: number | null;
  total_match_searches: number;
}

export async function getAdminMatchAnalytics() {
  return fetchApi<MatchAnalytics>("/api/admin/match-analytics");
}

export interface ProfileInsights {
  total_profiles: number;
  gpa_distribution: Record<string, number>;
  major_counts: { major: string; count: number }[];
  state_counts: { state: string; count: number }[];
  school_size_breakdown: Record<string, number>;
}

export async function getAdminProfileInsights() {
  return fetchApi<ProfileInsights>("/api/admin/profile-insights");
}

export async function toggleUserAdmin(userId: number) {
  return fetchApi<AuthUser>(`/api/admin/users/${userId}/toggle-admin`, {
    method: "PATCH",
  });
}

export async function deleteUser(userId: number) {
  return fetchApi<{ deleted: boolean; id: number }>(
    `/api/admin/users/${userId}`,
    { method: "DELETE" }
  );
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function getMe() {
  return fetchApi<AuthUser>("/api/auth/me");
}

export async function patchProfile(data: Record<string, unknown>) {
  return fetchApi<AuthUser>("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Saved Colleges ────────────────────────────────────────────────────────

export interface SavedCollegeRow {
  id: number;
  user_id: number;
  unitid: number;
  tier: string;
  notes: string | null;
  saved_at: string | null;
  college_name?: string;
  city?: string;
  state?: string;
  adm_rate?: number | null;
  grad_rate?: number | null;
  median_earnings?: number | null;
}

export async function getSavedColleges() {
  return fetchApi<SavedCollegeRow[]>("/api/saved-colleges");
}

export async function saveCollege(unitid: number, tier = "target", notes?: string) {
  return fetchApi<SavedCollegeRow>("/api/saved-colleges", {
    method: "POST",
    body: JSON.stringify({ unitid, tier, notes }),
  });
}

export async function updateSavedCollege(unitid: number, data: { tier?: string; notes?: string }) {
  return fetchApi<SavedCollegeRow>(`/api/saved-colleges/${unitid}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSavedCollege(unitid: number) {
  return fetchApi<{ deleted: boolean; unitid: number }>(`/api/saved-colleges/${unitid}`, {
    method: "DELETE",
  });
}

// ── Saved Plans ───────────────────────────────────────────────────────────

export interface SavedPlanRow {
  id: number;
  user_id: number;
  unitid: number;
  college_name: string | null;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string | null;
}

export async function getSavedPlans() {
  return fetchApi<SavedPlanRow[]>("/api/saved-plans");
}

export async function savePlan(payload: {
  unitid: number;
  college_name?: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
}) {
  return fetchApi<SavedPlanRow>("/api/saved-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteSavedPlan(planId: number) {
  return fetchApi<{ deleted: boolean; id: number }>(`/api/saved-plans/${planId}`, {
    method: "DELETE",
  });
}

// ── Saved Comparisons ─────────────────────────────────────────────────────

export interface SavedComparisonRow {
  id: number;
  user_id: number;
  unitids: number[];
  label: string | null;
  college_names?: string[];
  created_at: string | null;
}

export async function getSavedComparisons() {
  return fetchApi<SavedComparisonRow[]>("/api/saved-comparisons");
}

export async function saveComparison(unitids: number[], label?: string) {
  return fetchApi<SavedComparisonRow>("/api/saved-comparisons", {
    method: "POST",
    body: JSON.stringify({ unitids, label }),
  });
}

export async function deleteSavedComparison(compId: number) {
  return fetchApi<{ deleted: boolean; id: number }>(`/api/saved-comparisons/${compId}`, {
    method: "DELETE",
  });
}

// ── Match History ─────────────────────────────────────────────────────────

export interface MatchHistoryRow {
  id: number;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export async function getMatchHistory() {
  return fetchApi<MatchHistoryRow[]>("/api/my/match-history");
}

// ── Reviews ───────────────────────────────────────────────────────────────

export interface ReviewRow {
  id: number;
  user_id: number;
  username: string | null;
  unitid: number;
  overall_rating: number;
  dimension_ratings: Record<string, number> | null;
  pros: string;
  cons: string;
  advice: string | null;
  would_recommend: string;
  attendance_status: string;
  year: string | null;
  major: string | null;
  tags: string[];
  created_at: string | null;
  upvotes: number;
  downvotes: number;
  college_name?: string;
}

export interface ReviewAggregate {
  avg_overall: number;
  review_count: number;
  dimension_avgs: Record<string, number>;
  tag_counts: [string, number][];
  recommend_counts: { yes: number; no: number; maybe: number };
}

export interface CollegeReviewsResponse {
  reviews: ReviewRow[];
  aggregate: ReviewAggregate | null;
}

export interface ReviewSummary {
  review_count: number;
  avg_rating: number | null;
}

export async function getReviewTags() {
  return fetchApi<string[]>("/api/reviews/tags");
}

export async function getCollegeReviews(unitid: number) {
  return fetchApi<CollegeReviewsResponse>(`/api/reviews/college/${unitid}`);
}

export async function getReviewSummary(unitid: number) {
  return fetchApi<ReviewSummary>(`/api/reviews/summary/${unitid}`);
}

export async function getRecentReviews(limit = 5) {
  return fetchApi<ReviewRow[]>(`/api/reviews/recent?limit=${limit}`);
}

export async function createReview(data: {
  unitid: number;
  overall_rating: number;
  dimension_ratings: Record<string, number>;
  pros: string;
  cons: string;
  advice?: string;
  would_recommend: string;
  attendance_status: string;
  year?: string;
  major?: string;
  tags: string[];
}) {
  return fetchApi<ReviewRow>("/api/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteReview(reviewId: number) {
  return fetchApi<{ deleted: boolean; id: number }>(`/api/reviews/${reviewId}`, {
    method: "DELETE",
  });
}

export async function voteReview(reviewId: number, vote: 1 | -1) {
  return fetchApi<{ upvotes: number; downvotes: number }>(
    `/api/reviews/${reviewId}/vote?vote=${vote}`,
    { method: "POST" }
  );
}

// ── Home Dashboard ────────────────────────────────────────────────────────

export interface HomeProgress {
  profile_complete: boolean;
  has_match: boolean;
  has_saved: boolean;
  has_plan: boolean;
  has_comparison: boolean;
  has_review: boolean;
  steps_done: number;
  total_steps: number;
}

export interface HomeCommunity {
  total_users: number;
  total_reviews: number;
  colleges_reviewed: number;
}

export interface HomeActivity {
  id: number;
  action_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface HomeData {
  shortlist: SavedCollegeRow[];
  activity: HomeActivity[];
  progress: HomeProgress;
  community: HomeCommunity;
}

export async function getHomeData() {
  return fetchApi<HomeData>("/api/home");
}
