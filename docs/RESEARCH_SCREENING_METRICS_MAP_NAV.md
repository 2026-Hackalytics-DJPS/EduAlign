# EduAlign: Research on Screening, Metrics, Map & Navigation

## 1. Pre-Profile Screening (Before User Reaches Profile)

### The Problem
- **GPA scale chaos**: US high schools use 4.0 (unweighted), 5.0 (weighted), 6.0 (multi-tier) scales. An "A" in AP vs regular courses means different things.
- **International students**: IB (1–7 per subject, 45 max), A-Levels (A*–E), country-specific systems. No universal conversion.
- **Test diversity**: SAT vs ACT, test-optional schools, some require neither. International exams (e.g., IB, A-Level) used instead of SAT/ACT.
- **Grade inflation**: Different schools weight honors/AP differently; context matters.

### Recommended Screening Flow (Before Profile)

**Step 1 — "Where are you applying from?"**
- **US High School** → collect: GPA scale (4.0 / 5.0 / 6.0), weighted vs unweighted, optional SAT/ACT
- **International** → collect: system (IB / A-Level / Other), raw scores (e.g., IB 38, A-Level AAA)
- **Homeschool / Nontraditional** → collect: narrative + any scores available

**Step 2 — Normalization (backend)**
- Map all inputs to a common 0–4 scale for matching (e.g., IB 7 → 4.0, ACT 36 → 4.0 equivalent).
- Store raw values + `gpa_scale`, `gpa_type` (weighted/unweighted), `test_type` (SAT/ACT/IB/A-Level/none).

**Step 3 — Profile continues with normalized context**
- Profile form shows fields relevant to the screening choice (e.g., if US + 5.0 scale, show GPA 0–5 slider; if IB, show 1–7 per subject or total points).

### Implementation Sketch
- New route: `/onboarding` or `/screening` (after login, before `/profile` or `/setup`)
- 2–3 question wizard: origin → scale → tests
- Store in `User` or new `UserScreening` table
- Profile form conditionally renders based on screening answers

---

## 2. ACT, SAT, and Other Metrics

### Current State
- **SAT**: 400–1600 (Evidence-Based Reading + Math). Used for admission and College Scorecard `SAT_AVG`.
- **ACT**: 1–36 composite. ~25% of students take ACT; many take both.
- **Test-optional**: 80%+ of US 4-year colleges are test-optional for fall 2025. Some are test-blind (scores not considered).

### Conversion & Storage
- **SAT ↔ ACT** conversion tables exist (e.g., SAT 1600 ≈ ACT 36; SAT 1200 ≈ ACT 25). Use a lookup table for normalization.
- **Backend**: Add `act` column to `User` (nullable). Use either `sat` or `act` for admission prediction—convert to a common scale (e.g., percentile or 0–1 normalized) before comparing to `SAT_AVG`.
- **College Scorecard**: Only has `SAT_AVG`. For ACT-only students, convert ACT to SAT equivalent for compatibility.

### Suggested Additions
- Add `act` (integer, nullable) to User model
- Add `test_preference` or `test_type`: "sat" | "act" | "both" | "none"
- In prediction/admission logic: if user has ACT only, convert to SAT-equivalent range before comparing to `SAT_AVG`
- UI: Dropdown or tabs for "SAT" vs "ACT" — show the relevant input, optionally allow both

---

## 3. Map Implementation

### Use Cases for EduAlign
- **Browse colleges on a map** — filter by state, zoom to region
- **"Colleges near me"** — geolocation + radius search
- **Match results on map** — pin top 4 matches with popups
- **Compare colleges** — show selected colleges on map for geographic context

### Tech Options

| Library | Pros | Cons |
|--------|------|------|
| **Leaflet** (react-leaflet) | Free, no API key for base tiles, lightweight | Requires OpenStreetMap or other tile provider |
| **Mapbox GL** (react-map-gl) | Beautiful, fast, good React support | API key, usage limits on free tier |
| **Google Maps** | Familiar, Places API for search | Expensive, requires billing |
| **Deck.gl** | Great for large datasets, 3D | Heavier, overkill for simple pins |

### Recommended: Leaflet + OpenStreetMap
- No API key for basic use
- `react-leaflet` is well-maintained
- College Scorecard has `LATITUDE`, `LONGITUDE` — ready for markers
- Can add Mapbox later for better tiles if needed

### Implementation Sketch
- New page: `/map` or integrate into Compare / Results
- Load colleges from `/api/colleges` with lat/lng
- Cluster markers when zoomed out (e.g., leaflet.markercluster)
- Popup on click: college name, match %, link to detail

---

## 4. Navigation Restructure — Research

### Current: Left Sidebar
- Fixed 260px sidebar with nav links + profile at bottom
- Works for desktop; on mobile typically collapses to hamburger

### Patterns from Competitors
- **Common App**: Dashboard-first, progress checklist prominent. Nav: My Application → My Colleges → Apply → Explore (College Search, Financial Aid).
- **Scoir**: Right-hand panel for messages/deadlines; main content = assignments and actions.
- **College Board / CSS Profile**: Top nav + dashboard link; status-centric.

### Recommendations
1. **Consider top nav for primary actions** (Find Match, Compare, Reviews) — more visible, better for mobile.
2. **Sidebar for secondary / account** — My Colleges, Profile, Admin. Reduces clutter.
3. **Dashboard as hub** — Home already does this. Strengthen with "Continue where you left off" (e.g., last match, incomplete profile).
4. **Mobile**: Hamburger menu with grouped items (Discover | Plan | My Stuff | Account).
5. **Sticky nav** — Keep primary actions always accessible when scrolling (as with Admin tabs).

### Possible Restructure
```
Top: [Logo] [Find Match] [Compare] [Reviews] [Financial Planner]     [Profile ▼]
Below: Secondary nav or breadcrumbs when in a section
OR
Sidebar: [Home] [Find Match] [Financial] [Compare] [Reviews] [My Colleges] [Profile]
         (grouped: Discover | Plan | Saved | Account)
```

---

## 5. Find Your Match — Rework Ideas

You mentioned something feels off but you can't pin it down. Here are directions to explore:

### A. **Flow feels linear / rigid**
- **Idea**: Allow non-linear flow — e.g., skip to Preferences if profile is complete; or "Quick match" with defaults.
- **Idea**: Let users start from "I know what I want" (sliders only) vs "Help me figure it out" (profile-first).

### B. **Too many steps before results**
- **Idea**: 2-step version: "About you" (compact) + "Priorities" (sliders) — merge Vibe into sliders or make it optional.
- **Idea**: "One-click match" using profile data only — show results immediately, then "Refine" for sliders.

### C. **Sliders feel abstract**
- **Idea**: Replace with scenario-based questions: "Would you rather have a collaborative or competitive environment?" → maps to collaboration_vs_competition.
- **Idea**: "Pick your top 3 dimensions" — only those get weighted; others neutral.

### D. **Results feel generic**
- **Idea**: Show "Why this college" before the card — one sentence that hooks.
- **Idea**: "Surprise me" — one random high-match that breaks the mold.
- **Idea**: Compare your profile to each college's "typical student" (if we had that data).

### E. **Missing feedback loop**
- **Idea**: "Was this helpful?" after results — learn from thumbs up/down to improve matching.
- **Idea**: "Not quite right? Adjust one slider and re-run" — incremental refinement.

---

## Summary

| Topic | Action |
|-------|--------|
| **Screening** | Add `/onboarding` step: origin (US/International) → scale → tests. Store raw + normalized. |
| **ACT / metrics** | Add `act`, `test_type` to User. Convert ACT↔SAT for admission logic. Support test-optional. |
| **Map** | Use Leaflet + OSM. New `/map` page or embed in Compare. Lat/lng from College Scorecard. |
| **Navigation** | Consider top nav for primary, sidebar for secondary. Group items (Discover | Plan | Saved). Mobile hamburger. |
| **Find Your Match** | Explore: non-linear flow, 2-step compact, scenario questions, "Quick match," feedback loop. |
