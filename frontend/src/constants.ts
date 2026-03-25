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

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

export const COMMON_MAJORS = [
  "Accounting", "Architecture", "Art", "Biology", "Business", "Chemistry", "Communications",
  "Computer Science", "Economics", "Education", "Engineering", "English", "Finance",
  "Health Sciences", "History", "International Relations", "Journalism", "Law",
  "Mathematics", "Music", "Nursing", "Philosophy", "Physics", "Political Science",
  "Psychology", "Public Health", "Sociology", "Sports Management", "Theater",
  "Other",
];
