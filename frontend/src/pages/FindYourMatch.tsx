import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import type { Preferences, MatchItem, StudentProfile } from "../types";
import { postMatch, postSuggestSliders } from "../api";
import { CollegeCard } from "../components/CollegeCard";
import { useAuth } from "../contexts/AuthContext";
import { Crosshair, Search, Brain, Sparkles, Zap, WandSparkles, Check } from "lucide-react";
import "./MatchPage.css";

const initialPrefs: Preferences = Object.fromEntries(
  EXPERIENCE_DIMS.map((d) => [d, 5])
) as Preferences;

const emptyProfile: StudentProfile = {
  gpa: null,
  sat: null,
  major: null,
  location: null,
  extracurriculars: null,
  in_state_preference: false,
  free_text: null,
};

const SLIDER_HINTS: Record<string, [string, string]> = {
  academic_intensity: ["Relaxed", "Rigorous"],
  social_life: ["Quiet", "Very Active"],
  inclusivity: ["Homogeneous", "Very Diverse"],
  career_support: ["Minimal", "Excellent"],
  collaboration_vs_competition: ["Competitive", "Collaborative"],
  mental_health_culture: ["Low Priority", "Top Priority"],
  campus_safety: ["Unconcerned", "Very Important"],
  overall_satisfaction: ["Flexible", "Must Be Great"],
};

const VIBE_TAGS = [
  "Strong tech culture",
  "Collaborative campus",
  "Big school energy",
  "Small & intimate",
  "Greek life",
  "Research-focused",
  "Liberal arts feel",
  "Outdoorsy / nature",
  "Arts & creative",
  "Entrepreneurial",
  "Sports culture",
  "Study abroad",
  "Urban campus",
  "Suburban / rural",
  "Diverse community",
  "Sustainability focus",
];

const SCHOOL_SIZES = ["Small (<5k)", "Medium (5k–15k)", "Large (15k+)"];

const STEP_LABELS = ["About You", "Preferences", "Your Vibe"];

const LOADING_STAGES = [
  { text: "Analyzing your preferences", icon: <Crosshair size={28} /> },
  { text: "Scanning 6,000+ colleges", icon: <Search size={28} /> },
  { text: "Running AI matching engine", icon: <Brain size={28} /> },
  { text: "Generating personalized insights", icon: <Sparkles size={28} /> },
];

const LOADING_FACTS = [
  "The average college student changes their major 3 times",
  "There are over 4,000 degree-granting institutions in the US",
  "Students who visit campus are 3x more likely to enroll",
  "70% of students attend college within 50 miles of home",
  "The most popular major in the US is Business",
  "College students walk an average of 4 miles per day on campus",
  "More than 19 million students are enrolled in US colleges",
  "The average student applies to 7–10 schools",
  "First-generation college students make up 33% of all undergrads",
  "Study abroad participation has tripled in the last 20 years",
];

const STAGE_PROGRESS = [18, 42, 68, 88];
const STAGE_TIMINGS = [6000, 18000, 40000];

// ── Component ───────────────────────────────────────────────────────────────

export function FindYourMatch() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(() => ({
    gpa: user?.gpa ?? null,
    sat: user?.sat ?? null,
    major: user?.intended_major ?? null,
    location: user?.preferred_state ?? null,
    extracurriculars: user?.extracurriculars ?? null,
    in_state_preference: false,
    free_text: null,
  }));
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs);
  const [schoolSize, setSchoolSize] = useState<string | null>(() => {
    if (!user?.school_size) return null;
    const sizes = user.school_size.split(", ");
    if (sizes.includes("Small")) return "Small (<5k)";
    if (sizes.includes("Medium")) return "Medium (5k–15k)";
    if (sizes.includes("Large")) return "Large (15k+)";
    return null;
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [suggested, setSuggested] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  const scrollToTop = useCallback(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      setLoadingElapsed(0);
      return;
    }
    setFactIndex(Math.floor(Math.random() * LOADING_FACTS.length));
    const elapsed = setInterval(() => setLoadingElapsed((e) => e + 1), 1000);
    const stages = STAGE_TIMINGS.map((ms, i) =>
      setTimeout(() => setLoadingStage(i + 1), ms)
    );
    return () => {
      clearInterval(elapsed);
      stages.forEach(clearTimeout);
    };
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(
      () => setFactIndex((i) => (i + 1) % LOADING_FACTS.length),
      4500
    );
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (step !== 1 || suggested) return;
    const hasData = profile.gpa || profile.major || profile.extracurriculars || profile.free_text;
    if (!hasData) return;

    (async () => {
      try {
        const payload = Object.fromEntries(
          Object.entries(profile).filter(([, v]) => v != null && v !== "" && v !== false)
        );
        const res = await postSuggestSliders(payload);
        if (res.suggested_sliders) {
          setPrefs((prev) => ({ ...prev, ...res.suggested_sliders }) as Preferences);
          setSuggested(true);
        }
      } catch { /* keep current sliders */ }
    })();
  }, [step, suggested, profile]);

  const setProfileField = useCallback(<K extends keyof StudentProfile>(key: K, val: StudentProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: val }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleMatch = async () => {
    setError(null);
    setLoading(true);
    setMatches([]);
    try {
      const vibeText = [
        ...selectedTags,
        freeText.trim() ? freeText.trim() : null,
      ].filter(Boolean).join(". ");

      const fullProfile = {
        ...profile,
        free_text: vibeText || profile.free_text || null,
      };

      const profilePayload = Object.fromEntries(
        Object.entries(fullProfile).filter(([, v]) => v != null && v !== "" && v !== false)
      );
      const res = await postMatch({
        preferences: { ...prefs },
        top_n: 4,
        profile: Object.keys(profilePayload).length > 0 ? profilePayload : undefined,
      });
      setMatches(res.matches ?? []);
      setUsedFallback(res.used_fallback ?? false);
      setStep(3);
      scrollToTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setStep(0);
    setProfile(emptyProfile);
    setPrefs(initialPrefs);
    setSchoolSize(null);
    setSelectedTags([]);
    setFreeText("");
    setSuggested(false);
    setMatches([]);
    setUsedFallback(false);
    setError(null);
    scrollToTop();
  };

  const goNext = () => {
    setStep((s) => Math.min(s + 1, 2));
    scrollToTop();
  };
  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    scrollToTop();
  };

  // ── Memoised sliders grid ───────────────────────────────────────────────

  const slidersGrid = useMemo(
    () => (
      <div className="wiz-sliders">
        {EXPERIENCE_DIMS.map((dim) => {
          const [lo, hi] = SLIDER_HINTS[dim] ?? ["Low", "High"];
          return (
            <div key={dim} className="wiz-slider-row">
              <div className="wiz-slider-header">
                <span className="wiz-slider-name">{DIMENSION_LABELS[dim]}</span>
                <span className="wiz-slider-val">{prefs[dim].toFixed(1)}</span>
              </div>
              <input
                className="wiz-slider-track"
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={prefs[dim]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [dim]: parseFloat(e.target.value) }))
                }
              />
              <div className="wiz-slider-hints">
                <span>{lo}</span>
                <span>{hi}</span>
              </div>
            </div>
          );
        })}
      </div>
    ),
    [prefs]
  );

  // ── Step renderers ──────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="wiz-step-enter" key="step0">
      <h1 className="wiz-h1">Tell us about yourself</h1>
      <p className="wiz-sub">
        We'll use this to personalize your matches and auto-tune your experience preferences.
      </p>

      <div className="wiz-form-grid">
        <div className="wiz-field">
          <label className="wiz-label">GPA</label>
          <input
            className="wiz-input"
            type="number"
            step="0.1"
            min={0}
            max={4}
            placeholder="3.7"
            value={profile.gpa ?? ""}
            onChange={(e) =>
              setProfileField("gpa", e.target.value ? parseFloat(e.target.value) : null)
            }
          />
        </div>
        <div className="wiz-field">
          <label className="wiz-label">SAT Score</label>
          <input
            className="wiz-input"
            type="number"
            min={400}
            max={1600}
            placeholder="1350"
            value={profile.sat ?? ""}
            onChange={(e) =>
              setProfileField("sat", e.target.value ? parseInt(e.target.value) : null)
            }
          />
        </div>
        <div className="wiz-field">
          <label className="wiz-label">Major / Interest</label>
          <input
            className="wiz-input"
            type="text"
            placeholder="Computer Science"
            value={profile.major ?? ""}
            onChange={(e) => setProfileField("major", e.target.value || null)}
          />
        </div>
        <div className="wiz-field">
          <label className="wiz-label">Location / State</label>
          <input
            className="wiz-input"
            type="text"
            placeholder="Georgia"
            value={profile.location ?? ""}
            onChange={(e) => setProfileField("location", e.target.value || null)}
          />
        </div>
        <div className="wiz-field full">
          <label className="wiz-label">Extracurriculars</label>
          <input
            className="wiz-input"
            type="text"
            placeholder="Tennis, hackathons, debate team"
            value={profile.extracurriculars ?? ""}
            onChange={(e) => setProfileField("extracurriculars", e.target.value || null)}
          />
        </div>
      </div>

      <div className="wiz-section-title">School Size</div>
      <div className="wiz-size-row">
        {SCHOOL_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className={`wiz-size-btn${schoolSize === s ? " selected" : ""}`}
            onClick={() => setSchoolSize(schoolSize === s ? null : s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="wiz-toggle-row">
        <button
          type="button"
          className={`wiz-toggle${profile.in_state_preference ? " on" : ""}`}
          onClick={() => setProfileField("in_state_preference", !profile.in_state_preference)}
        >
          <div className="wiz-toggle-knob" />
        </button>
        <span className="wiz-toggle-label">Prefer in-state tuition</span>
      </div>

      <div className="wiz-btn-row">
        <div />
        <button type="button" className="wiz-btn wiz-btn-primary" onClick={goNext}>
          Next: Preferences →
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="wiz-step-enter" key="step1">
      <h1 className="wiz-h1">Experience Preferences</h1>
      <p className="wiz-sub">
        Rate how important each dimension is to your ideal college experience.
      </p>

      {suggested && (
        <div className="wiz-suggest">
          <span className="wiz-suggest-icon"><WandSparkles size={18} /></span>
          <span className="wiz-suggest-text">
            <strong>Auto-tuned!</strong> Sliders were adjusted based on your profile.
            Feel free to fine-tune them.
          </span>
        </div>
      )}

      {slidersGrid}

      <div className="wiz-btn-row">
        <button type="button" className="wiz-btn wiz-btn-ghost" onClick={goBack}>
          ← Back
        </button>
        <button type="button" className="wiz-btn wiz-btn-primary" onClick={goNext}>
          Next: Your Vibe →
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="wiz-step-enter" key="step2">
      <h1 className="wiz-h1">Describe Your Vibe</h1>
      <p className="wiz-sub">
        Select tags that resonate and add anything else — this helps our AI match you to the right campus culture.
      </p>

      <div className="wiz-section-title">Quick Tags</div>
      <div className="wiz-chips">
        {VIBE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`wiz-chip${selectedTags.includes(tag) ? " selected" : ""}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="wiz-section-title">Anything else?</div>
      <textarea
        className="wiz-textarea wiz-input"
        placeholder="I want a campus with strong alumni networks and a vibrant student startup community..."
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        rows={4}
      />

      {error && <div className="wiz-error">{error}</div>}

      <div className="wiz-btn-row">
        <button type="button" className="wiz-btn wiz-btn-ghost" onClick={goBack}>
          ← Back
        </button>
        <button
          type="button"
          className="wiz-btn wiz-btn-primary"
          onClick={handleMatch}
          disabled={loading}
        >
          {loading ? "Finding matches…" : <><Sparkles size={16} style={{ marginRight: 6, verticalAlign: -2 }} />Find My Matches</>}
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="wiz-loading" key="loading">
      <div className="wiz-loading-radar">
        <div className="wiz-radar-ring wiz-radar-ring-1" />
        <div className="wiz-radar-ring wiz-radar-ring-2" />
        <div className="wiz-radar-ring wiz-radar-ring-3" />
        <div className="wiz-radar-center">
          <span className="wiz-radar-icon" key={loadingStage}>
            {LOADING_STAGES[loadingStage]!.icon}
          </span>
        </div>
      </div>

      <h2 className="wiz-loading-title">
        {LOADING_STAGES[loadingStage]!.text}
        <span className="wiz-loading-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </h2>

      <div className="wiz-loading-bar-wrap">
        <div className="wiz-loading-bar">
          <div
            className="wiz-loading-bar-fill"
            style={{ width: `${STAGE_PROGRESS[loadingStage]}%` }}
          />
        </div>
        <div className="wiz-loading-bar-pips">
          {LOADING_STAGES.map((_, i) => (
            <div
              key={i}
              className={`wiz-loading-pip${loadingStage >= i ? " active" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="wiz-loading-fact-wrap">
        <span className="wiz-fact-label">Did you know?</span>
        <div className="wiz-fact-text" key={factIndex}>
          {LOADING_FACTS[factIndex]}
        </div>
      </div>

      <div className="wiz-loading-elapsed">
        {loadingElapsed >= 60
          ? `${Math.floor(loadingElapsed / 60)}m ${loadingElapsed % 60}s`
          : `${loadingElapsed}s`}{" "}
        elapsed
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="wiz-results wiz-step-enter" key="results">
      <div className="wiz-results-header">
        <div className="wiz-results-eyebrow">
          {usedFallback ? "Similarity-Based Results" : "AI-Powered Results"}
        </div>
        <h2 className="wiz-results-title">
          Your Top {matches.length} Matches
        </h2>
        <p className="wiz-results-sub">
          Colleges aligned with your experience preferences, not just your stats.
        </p>
      </div>

      {usedFallback && (
        <div className="wiz-fallback-banner">
          <span className="wiz-fallback-icon"><Zap size={18} /></span>
          Showing cosine-similarity matches — AI explanations will return once the LLM is available.
        </div>
      )}

      <div className="wiz-results-grid">
        {matches.map((match, i) => (
          <CollegeCard
            key={match.UNITID ?? i}
            match={match}
            studentPrefs={prefs}
            rank={i + 1}
          />
        ))}
      </div>

      <div className="wiz-results-actions">
        <button type="button" className="wiz-start-over" onClick={startOver}>
          ← Start Over
        </button>
      </div>
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────────────

  const showResults = step === 3 && matches.length > 0;

  return (
    <div className="wiz-scroll">
      <div
        ref={cardRef}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {!showResults && (
          <div className="wiz-card">
            {loading ? renderLoading() : (
              <>
                <div className="wiz-progress">
                  {[0, 1, 2].map((i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <div className={`wiz-step-line${step >= i ? " filled" : " empty"}`} />
                      )}
                      <div
                        className={`wiz-step-dot${
                          step > i ? " done" : step === i ? " active" : " upcoming"
                        }`}
                      >
                        {step > i ? <Check size={14} /> : i + 1}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div className="wiz-step-labels">
                  {STEP_LABELS.map((label, i) => (
                    <span
                      key={label}
                      className={`wiz-step-label${step === i ? " active" : ""}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {step === 0 && renderStep0()}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
              </>
            )}
          </div>
        )}

        {showResults && renderResults()}
      </div>
    </div>
  );
}
