/** Experience dimension keys (must match backend EXPERIENCE_DIMS). */
export const EXPERIENCE_DIMS = [
  "academic_intensity",
  "social_life",
  "inclusivity",
  "career_support",
  "collaboration_vs_competition",
  "mental_health_culture",
  "campus_safety",
  "overall_satisfaction",
] as const;

export type ExperienceDim = (typeof EXPERIENCE_DIMS)[number];

export const DIMENSION_LABELS: Record<ExperienceDim, string> = {
  academic_intensity: "Academic Intensity",
  social_life: "Social Life",
  inclusivity: "Inclusivity",
  career_support: "Career Support",
  collaboration_vs_competition: "Collaboration vs Competition",
  mental_health_culture: "Mental Health Culture",
  campus_safety: "Campus Safety",
  overall_satisfaction: "Overall Satisfaction",
};
