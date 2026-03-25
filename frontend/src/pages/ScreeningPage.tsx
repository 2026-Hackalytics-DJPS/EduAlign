import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { patchScreening } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Compass, GraduationCap } from "lucide-react";

const ORIGIN_OPTIONS = [
  { value: "us", label: "US High School", desc: "4.0, 5.0, or 6.0 GPA scale" },
  { value: "international", label: "International", desc: "IB, A-Levels, or other system" },
  { value: "other", label: "Homeschool / Nontraditional", desc: "Alternative pathways" },
];

const GPA_SCALES = [
  { value: "4.0", label: "4.0 (unweighted)" },
  { value: "5.0", label: "5.0 (weighted)" },
  { value: "6.0", label: "6.0 (weighted)" },
];

const TEST_TYPES = [
  { value: "sat", label: "SAT" },
  { value: "act", label: "ACT" },
  { value: "both", label: "Both" },
  { value: "none", label: "Test-optional / None" },
];

export function ScreeningPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [origin, setOrigin] = useState<string>(user?.origin || "us");
  const [gpaScale, setGpaScale] = useState<string>(user?.gpa_scale || "4.0");
  const [testType, setTestType] = useState<string>(user?.test_type || "sat");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await patchScreening({
        origin,
        gpa_scale: origin === "us" ? gpaScale : undefined,
        test_type: testType,
      });
      updateUser(updated);
      if (!updated.profile_complete) {
        navigate("/setup", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screening-page">
      <div className="screening-card">
        <div className="screening-header">
          <Compass size={40} className="screening-icon" />
          <h1>Quick Setup</h1>
          <p>Help us tailor EduAlign to your background.</p>
        </div>

        <form onSubmit={handleSubmit} className="screening-form">
          <div className="screening-section">
            <label className="screening-label">
              Where are you applying from?
            </label>
            <div className="screening-options">
              {ORIGIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`screening-opt${origin === opt.value ? " selected" : ""}`}
                  onClick={() => setOrigin(opt.value)}
                >
                  <span className="screening-opt-label">{opt.label}</span>
                  <span className="screening-opt-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {origin === "us" && (
            <div className="screening-section">
              <label className="screening-label">GPA scale</label>
              <div className="screening-row">
                {GPA_SCALES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`screening-btn${gpaScale === s.value ? " selected" : ""}`}
                    onClick={() => setGpaScale(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="screening-section">
            <label className="screening-label">
              <GraduationCap size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
              Standardized tests
            </label>
            <div className="screening-row">
              {TEST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`screening-btn${testType === t.value ? " selected" : ""}`}
                  onClick={() => setTestType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="screening-error">{error}</div>}

          <div className="screening-actions">
            <button
              type="submit"
              className="screening-submit"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Continue to Profile →"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .screening-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
          padding: 1.5rem;
        }
        .screening-card {
          max-width: 520px;
          width: 100%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(74, 80, 128, 0.12);
          padding: 2rem;
        }
        .screening-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .screening-icon {
          color: #4a5080;
          margin-bottom: 0.75rem;
        }
        .screening-header h1 {
          font-family: 'Playfair Display', Georgia, serif;
          color: #4a5080;
          font-size: 1.75rem;
          margin: 0 0 0.5rem;
        }
        .screening-header p {
          color: #666;
          margin: 0;
          font-size: 0.95rem;
        }
        .screening-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .screening-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .screening-label {
          font-weight: 600;
          color: #333;
          font-size: 0.95rem;
        }
        .screening-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .screening-opt {
          text-align: left;
          padding: 1rem 1.25rem;
          border: 2px solid #e0e4ec;
          border-radius: 10px;
          background: #fafbfc;
          cursor: pointer;
          transition: all 0.2s;
        }
        .screening-opt:hover {
          border-color: #b8bdd0;
          background: #f5f7fa;
        }
        .screening-opt.selected {
          border-color: #4a5080;
          background: #f0f4ff;
        }
        .screening-opt-label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.2rem;
        }
        .screening-opt-desc {
          display: block;
          font-size: 0.85rem;
          color: #666;
        }
        .screening-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .screening-btn {
          padding: 0.6rem 1rem;
          border: 2px solid #e0e4ec;
          border-radius: 8px;
          background: #fafbfc;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .screening-btn:hover {
          border-color: #b8bdd0;
        }
        .screening-btn.selected {
          border-color: #4a5080;
          background: #4a5080;
          color: white;
        }
        .screening-error {
          color: #c00;
          font-size: 0.9rem;
        }
        .screening-actions {
          margin-top: 0.5rem;
        }
        .screening-submit {
          width: 100%;
          padding: 0.9rem 1.5rem;
          background: #4a5080;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .screening-submit:hover:not(:disabled) {
          opacity: 0.9;
        }
        .screening-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
