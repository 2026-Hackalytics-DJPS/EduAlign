import React from "react";
import type { StudentProfile } from "../types";

interface Props {
  profile: StudentProfile;
  onChange: (p: StudentProfile) => void;
}

export function ProfileForm({ profile, onChange }: Props) {
  const set = <K extends keyof StudentProfile>(key: K, val: StudentProfile[K]) =>
    onChange({ ...profile, [key]: val });

  return (
    <div className="form-row" style={{ flexDirection: "column", gap: "1rem" }}>
      <div className="form-row">
        <label>
          GPA
          <input
            type="number"
            step="0.1"
            min={0}
            max={4}
            value={profile.gpa ?? ""}
            onChange={(e) =>
              set("gpa", e.target.value ? parseFloat(e.target.value) : null)
            }
            placeholder="3.7"
          />
        </label>
        <label>
          SAT Score
          <input
            type="number"
            min={400}
            max={1600}
            value={profile.sat ?? ""}
            onChange={(e) =>
              set("sat", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="1350"
          />
        </label>
        <label>
          Major / Interest
          <input
            type="text"
            value={profile.major ?? ""}
            onChange={(e) => set("major", e.target.value || null)}
            placeholder="Computer Science"
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Location / State
          <input
            type="text"
            value={profile.location ?? ""}
            onChange={(e) => set("location", e.target.value || null)}
            placeholder="Georgia"
          />
        </label>
        <label>
          Extracurriculars
          <input
            type="text"
            value={profile.extracurriculars ?? ""}
            onChange={(e) => set("extracurriculars", e.target.value || null)}
            placeholder="Tennis, hackathons"
          />
        </label>
        <label style={{ justifyContent: "flex-end" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={profile.in_state_preference ?? false}
              onChange={(e) => set("in_state_preference", e.target.checked)}
            />
            Prefer in-state tuition
          </span>
        </label>
      </div>
      <label>
        What are you looking for?
        <textarea
          value={profile.free_text ?? ""}
          onChange={(e) => set("free_text", e.target.value || null)}
          placeholder="I want a collaborative campus with strong tech culture..."
          rows={2}
          style={{ width: "100%", resize: "none" }}
        />
      </label>
    </div>
  );
}
