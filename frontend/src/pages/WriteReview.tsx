import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCollegeDetail,
  getReviewTags,
  createReview,
} from "../api";
import type { CollegeDetail } from "../types";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import {
  Star, ThumbsUp, HelpCircle, ThumbsDown,
  ArrowLeft, ArrowRight, Send, CheckCircle2,
} from "lucide-react";
import "./CollegeReviewPage.css";

const STEPS = ["Rating & Info", "Dimensions & Tags", "Your Experience"];

export function WriteReview() {
  const { unitid: unitidStr } = useParams<{ unitid: string }>();
  const unitid = Number(unitidStr);
  const navigate = useNavigate();

  const [detail, setDetail] = useState<CollegeDetail | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [overall, setOverall] = useState(0);
  const [attendance, setAttendance] = useState("");
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState("");

  const [dimRatings, setDimRatings] = useState<Record<string, number>>(
    Object.fromEntries(EXPERIENCE_DIMS.map((d) => [d, 5]))
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [advice, setAdvice] = useState("");

  useEffect(() => {
    getCollegeDetail(unitid).then(setDetail).catch(() => {});
    getReviewTags().then(setAllTags).catch(() => {});
  }, [unitid]);

  const validateStep = (): boolean => {
    setError("");
    if (step === 0) {
      if (overall < 1) { setError("Please select an overall rating."); return false; }
      if (!attendance) { setError("Please select your attendance status."); return false; }
      if (!wouldRecommend) { setError("Please select whether you'd recommend."); return false; }
    }
    if (step === 2) {
      if (pros.trim().length < 20) { setError("Pros must be at least 20 characters."); return false; }
      if (cons.trim().length < 20) { setError("Cons must be at least 20 characters."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError("");
    try {
      await createReview({
        unitid,
        overall_rating: overall,
        dimension_ratings: dimRatings,
        pros: pros.trim(),
        cons: cons.trim(),
        advice: advice.trim() || undefined,
        would_recommend: wouldRecommend,
        attendance_status: attendance,
        year: year || undefined,
        major: major || undefined,
        tags: selectedTags,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/reviews/${unitid}`), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const collegeName = detail?.INSTNM ?? `College #${unitid}`;

  if (success) {
    return (
      <div className="wr-scroll">
        <div className="wr-inner">
          <div className="wr-card">
            <div className="wr-success">
              <CheckCircle2 size={20} /> Review submitted! Redirecting...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-scroll">
      <div className="wr-inner">
        <div className="wr-card">
          <div className="wr-title">Review {collegeName}</div>
          <div className="wr-subtitle">Share your experience to help future students.</div>

          {/* Progress bar */}
          <div className="wr-progress">
            {STEPS.map((_, i) => (
              <div key={i} className={`wr-progress-step${i <= step ? " wr-progress-step--active" : ""}`} />
            ))}
          </div>

          <div className="wr-step-label">Step {step + 1}: {STEPS[step]}</div>

          {error && <div className="wr-error">{error}</div>}

          {/* Step 0: Rating & Info */}
          {step === 0 && (
            <>
              <div className="wr-field">
                <label>Overall Rating *</label>
                <div className="wr-stars-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`wr-star${n <= overall ? " wr-star--active" : ""}`}
                      onClick={() => setOverall(n)}
                    >
                      <Star size={28} fill={n <= overall ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="wr-field">
                <label>Attendance Status *</label>
                <select value={attendance} onChange={(e) => setAttendance(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="current">Current Student</option>
                  <option value="alumni">Alumni</option>
                  <option value="transfer">Transfer Student</option>
                </select>
              </div>

              <div className="wr-field">
                <label>Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate">Graduate</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              <div className="wr-field">
                <label>Major</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                />
              </div>

              <div className="wr-field">
                <label>Would you recommend this college? *</label>
                <div className="wr-recommend-row">
                  <button
                    type="button"
                    className={`wr-recommend-btn${wouldRecommend === "yes" ? " wr-recommend-btn--selected" : ""}`}
                    onClick={() => setWouldRecommend("yes")}
                  >
                    <ThumbsUp size={16} /> Yes
                  </button>
                  <button
                    type="button"
                    className={`wr-recommend-btn${wouldRecommend === "maybe" ? " wr-recommend-btn--selected" : ""}`}
                    onClick={() => setWouldRecommend("maybe")}
                  >
                    <HelpCircle size={16} /> Maybe
                  </button>
                  <button
                    type="button"
                    className={`wr-recommend-btn${wouldRecommend === "no" ? " wr-recommend-btn--selected" : ""}`}
                    onClick={() => setWouldRecommend("no")}
                  >
                    <ThumbsDown size={16} /> No
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 1: Dimensions & Tags */}
          {step === 1 && (
            <>
              <div className="wr-field">
                <label>Rate each dimension (1-10)</label>
                {EXPERIENCE_DIMS.map((dim) => (
                  <div key={dim} className="wr-slider-row">
                    <span className="wr-slider-label">{DIMENSION_LABELS[dim]}</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={dimRatings[dim]}
                      onChange={(e) =>
                        setDimRatings((prev) => ({ ...prev, [dim]: Number(e.target.value) }))
                      }
                    />
                    <span className="wr-slider-val">{dimRatings[dim]}</span>
                  </div>
                ))}
              </div>

              <div className="wr-field">
                <label>Tags (select all that apply)</label>
                <div className="wr-tags-wrap">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`wr-tag-chip${selectedTags.includes(tag) ? " wr-tag-chip--selected" : ""}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Written review */}
          {step === 2 && (
            <>
              <div className="wr-field">
                <label>Pros — What's great about this college? * (min 20 chars)</label>
                <textarea
                  placeholder="What did you love? What stood out positively?"
                  value={pros}
                  onChange={(e) => setPros(e.target.value)}
                  rows={4}
                />
                <div style={{ fontSize: "0.72rem", color: pros.length >= 20 ? "#6aab7a" : "#9ca3af", textAlign: "right" }}>
                  {pros.length} characters
                </div>
              </div>

              <div className="wr-field">
                <label>Cons — What could be better? * (min 20 chars)</label>
                <textarea
                  placeholder="What were the downsides or challenges?"
                  value={cons}
                  onChange={(e) => setCons(e.target.value)}
                  rows={4}
                />
                <div style={{ fontSize: "0.72rem", color: cons.length >= 20 ? "#6aab7a" : "#9ca3af", textAlign: "right" }}>
                  {cons.length} characters
                </div>
              </div>

              <div className="wr-field">
                <label>Advice for incoming freshmen (optional)</label>
                <textarea
                  placeholder="What do you wish you knew before attending?"
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="wr-nav">
            {step > 0 ? (
              <button type="button" className="wr-btn wr-btn--secondary" onClick={() => { setError(""); setStep(step - 1); }}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button type="button" className="wr-btn wr-btn--secondary" onClick={() => navigate(`/reviews/${unitid}`)}>
                Cancel
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="wr-btn wr-btn--primary" onClick={handleNext}>
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="wr-btn wr-btn--primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : <><Send size={15} /> Submit Review</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
