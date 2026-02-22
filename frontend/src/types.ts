import type { ExperienceDim } from "./constants";

export interface CollegeListItem {
  UNITID: number;
  INSTNM: string;
  CITY: string;
  STABBR: string;
  CONTROL?: number;
  UGDS?: number;
  TUITIONFEE_IN?: number;
  TUITIONFEE_OUT?: number;
}

export interface CollegeDetail extends CollegeListItem {
  [key: string]: unknown;
}

export interface MatchItem {
  INSTNM: string;
  similarity_score: number;
  explanation: string;
  strengths?: string[];
  tradeoffs?: string[];
  UNITID?: number;
  [dim: string]: unknown;
}

export interface MatchResponse {
  matches: MatchItem[];
  used_fallback?: boolean;
}

export interface FinancialPlan {
  college_name: string;
  unitid: number;
  in_state: boolean;
  on_campus: boolean;
  tuition: number | null;
  housing: number | null;
  books: number | null;
  other: number | null;
  annual_total: number | null;
  semester_total: number | null;
  degree_years: number;
  total_semesters: number;
  total_cost: number;
  total_savings: number;
  remaining_to_fund: number;
  can_graduate_on_time: boolean;
  affordable_semesters: number;
  semesters_short?: number;
  estimated_graduation_years?: number;
  monthly_savings_needed?: number;
  error?: string;
}

export interface CostResult {
  college_name: string;
  unitid: number;
  in_state: boolean;
  on_campus: boolean;
  tuition: number | null;
  housing: number | null;
  books: number | null;
  other: number | null;
  semester_total: number | null;
  annual_total: number | null;
}

export interface BudgetTrackerResult {
  total_cost: number;
  amount_spent: number;
  remaining: number;
  semesters_completed: number;
  semesters_left: number;
  per_semester_remaining: number;
  on_track: boolean;
  over_under: number;
}

export interface AlternativeRow {
  UNITID: number;
  INSTNM: string;
  CITY: string;
  STABBR: string;
  est_semester_cost: number;
  C150_4?: number;
  MD_EARN_WNE_P10?: number;
}

export type Preferences = Record<ExperienceDim, number>;

export interface StudentProfile {
  gpa?: number | null;
  sat?: number | null;
  major?: string | null;
  location?: string | null;
  extracurriculars?: string | null;
  in_state_preference?: boolean;
  free_text?: string | null;
}
