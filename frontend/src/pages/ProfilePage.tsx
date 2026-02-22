import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { patchProfile } from "../api";
import { EduAlignLogo } from "../components/EduAlignLogo";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [gpa, setGpa] = useState(3.0);
  const [intendedMajor, setIntendedMajor] = useState("");
  const [preferredState, setPreferredState] = useState("");
  const [schoolSize, setSchoolSize] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState("");
  const [campusVibe, setCampusVibe] = useState("");
  const [sports, setSports] = useState("");
  const [extracurriculars, setExtracurriculars] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleSize = (size: string) => {
    setSchoolSize((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const updated = await patchProfile({
        gpa,
        intended_major: intendedMajor || null,
        preferred_state: preferredState || null,
        school_size: schoolSize.join(", ") || null,
        budget_range: budgetRange || null,
        campus_vibe: campusVibe || null,
        sports: sports || null,
        extracurriculars: extracurriculars || null,
      });
      updateUser(updated);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#e8f0e8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "2.5rem",
        maxWidth: 560,
        width: "100%",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <EduAlignLogo height={56} />
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#4a5080",
          textAlign: "center",
          fontSize: "1.5rem",
          marginBottom: "0.25rem",
        }}>
          Input Information
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Tell us about yourself so we can find your best fit.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              GPA: {gpa.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={gpa}
              onChange={(e) => setGpa(parseFloat(e.target.value))}
              className="profile-slider"
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#999" }}>
              <span>0.0</span><span>4.0</span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              Intended Major
            </label>
            <input
              type="text"
              value={intendedMajor}
              onChange={(e) => setIntendedMajor(e.target.value)}
              placeholder="e.g. Computer Science"
              className="profile-input"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              Preferred State
            </label>
            <select
              value={preferredState}
              onChange={(e) => setPreferredState(e.target.value)}
              className="profile-input"
            >
              <option value="">— Select a state —</option>
              {US_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              School Size
            </label>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {[
                { label: "Small (<5k)", value: "Small" },
                { label: "Medium (5k–15k)", value: "Medium" },
                { label: "Large (15k+)", value: "Large" },
              ].map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={schoolSize.includes(opt.value)}
                    onChange={() => toggleSize(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              Budget Range
            </label>
            <input
              type="text"
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              placeholder="e.g. $20,000 - $40,000/year"
              className="profile-input"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              Campus Vibe Preference
            </label>
            <textarea
              value={campusVibe}
              onChange={(e) => setCampusVibe(e.target.value)}
              placeholder="Type answer here"
              rows={3}
              className="profile-input"
              style={{ resize: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              Sports
            </label>
            <input
              type="text"
              value={sports}
              onChange={(e) => setSports(e.target.value)}
              placeholder="e.g. Tennis, Swimming"
              className="profile-input"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: "0.9rem" }}>
              Extracurriculars
            </label>
            <input
              type="text"
              value={extracurriculars}
              onChange={(e) => setExtracurriculars(e.target.value)}
              placeholder="e.g. Debate club, hackathons"
              className="profile-input"
            />
          </div>

          {error && <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#4a5080",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              alignSelf: "center",
              marginTop: "0.5rem",
            }}
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>

      <div style={{ position: "fixed", bottom: 16, right: 16, opacity: 0.6 }}>
        <EduAlignLogo height={32} />
      </div>
    </div>
  );
}
