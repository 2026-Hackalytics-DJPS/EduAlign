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

export function ProfilePage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const isEdit = embedded || (user?.profile_complete ?? false);

  const [gpa, setGpa] = useState(user?.gpa ?? 3.0);
  const [sat, setSat] = useState<number | "">(user?.sat ?? "");
  const [intendedMajor, setIntendedMajor] = useState(user?.intended_major ?? "");
  const [preferredState, setPreferredState] = useState(user?.preferred_state ?? "");
  const [schoolSize, setSchoolSize] = useState<string[]>(
    user?.school_size ? user.school_size.split(", ").filter(Boolean) : []
  );
  const [budgetRange, setBudgetRange] = useState(user?.budget_range ?? "");
  const [campusVibe, setCampusVibe] = useState(user?.campus_vibe ?? "");
  const [sports, setSports] = useState(user?.sports ?? "");
  const [extracurriculars, setExtracurriculars] = useState(user?.extracurriculars ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleSize = (size: string) => {
    setSchoolSize((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const updated = await patchProfile({
        gpa,
        sat: sat || null,
        intended_major: intendedMajor || null,
        preferred_state: preferredState || null,
        school_size: schoolSize.join(", ") || null,
        budget_range: budgetRange || null,
        campus_vibe: campusVibe || null,
        sports: sports || null,
        extracurriculars: extracurriculars || null,
      });
      updateUser(updated);
      if (isEdit) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "??";

  const formContent = (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {isEdit && (
        <div style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "1rem", background: "#f0f4f0", borderRadius: 12,
          marginBottom: "0.5rem",
        }}>
          <span style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #4a8060, #6ab085)",
            color: "#fff", fontWeight: 700, fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>{initials}</span>
          <div>
            <div style={{ fontWeight: 600, color: "#4a5080", fontSize: "1rem" }}>{user?.username}</div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "recently"}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
            SAT Score
          </label>
          <input
            type="number"
            min={400}
            max={1600}
            value={sat}
            onChange={(e) => setSat(e.target.value ? parseInt(e.target.value) : "")}
            placeholder="e.g. 1350"
            className="profile-input"
          />
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
      {saved && <p style={{ color: "#15803d", margin: 0, fontWeight: 500 }}>Profile saved successfully!</p>}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "0.5rem" }}>
        {isEdit && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: "#e5e7eb", color: "#4a5080", border: "none",
              borderRadius: 999, padding: "0.75rem 2rem", fontSize: "1rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#4a5080", color: "#fff", border: "none",
            borderRadius: 999, padding: "0.75rem 2rem", fontSize: "1rem",
            fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Continue"}
        </button>
      </div>
    </form>
  );

  if (embedded) {
    return formContent;
  }

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
          {isEdit ? "Edit Your Profile" : "Input Information"}
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          {isEdit ? "Update your information to keep your matches relevant." : "Tell us about yourself so we can find your best fit."}
        </p>

        {formContent}
      </div>

      <div style={{ position: "fixed", bottom: 16, right: 16, opacity: 0.6 }}>
        <EduAlignLogo height={32} />
      </div>
    </div>
  );
}
