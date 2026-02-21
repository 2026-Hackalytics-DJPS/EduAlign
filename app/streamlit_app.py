"""
EduAlign — Streamlit Frontend

Multi-page app with:
  1. Find Your Match — preference sliders → Gemini-powered top 4 matches + radar chart
  2. Financial Planner — cost breakdown, graduation timeline, budget tracker
  3. Compare Colleges — side-by-side radar + financial comparison
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import plotly.graph_objects as go
import streamlit as st
import pandas as pd

from backend.colleges import EXPERIENCE_DIMS, get_matches, load_merged_data
from backend.financials import (
    budget_tracker,
    estimate_semester_cost,
    find_alternatives,
    graduation_plan,
)

DIMENSION_LABELS = {
    "academic_intensity": "Academic Intensity",
    "social_life": "Social Life",
    "inclusivity": "Inclusivity",
    "career_support": "Career Support",
    "collaboration_vs_competition": "Collaboration vs Competition",
    "mental_health_culture": "Mental Health Culture",
    "campus_safety": "Campus Safety",
    "overall_satisfaction": "Overall Satisfaction",
}

st.set_page_config(page_title="EduAlign", page_icon="🎓", layout="wide")


@st.cache_data
def get_colleges_df():
    return load_merged_data()


def make_radar(student_vals, college_vals, college_name):
    """Create a radar chart comparing student prefs vs college profile."""
    labels = [DIMENSION_LABELS[d] for d in EXPERIENCE_DIMS]
    labels_closed = labels + [labels[0]]

    student_closed = student_vals + [student_vals[0]]
    college_closed = college_vals + [college_vals[0]]

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=student_closed, theta=labels_closed,
        fill="toself", name="Your Preferences",
        opacity=0.6,
    ))
    fig.add_trace(go.Scatterpolar(
        r=college_closed, theta=labels_closed,
        fill="toself", name=college_name,
        opacity=0.6,
    ))
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
        showlegend=True,
        margin=dict(l=40, r=40, t=40, b=40),
        height=400,
    )
    return fig


# ── Sidebar Navigation ──────────────────────────────────────────────────────

page = st.sidebar.radio(
    "Navigate",
    ["Find Your Match", "Financial Planner", "Compare Colleges"],
)

st.sidebar.markdown("---")
st.sidebar.markdown(
    "**EduAlign** — Find colleges that match\n"
    "your experience, not just your stats."
)

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE 1: FIND YOUR MATCH
# ═══════════════════════════════════════════════════════════════════════════════

if page == "Find Your Match":
    st.title("Find Your Match")
    st.markdown("Rate how important each experience dimension is to you (1 = not important, 10 = essential).")

    cols = st.columns(2)
    student_prefs = {}
    for i, dim in enumerate(EXPERIENCE_DIMS):
        with cols[i % 2]:
            student_prefs[dim] = st.slider(
                DIMENSION_LABELS[dim],
                min_value=1, max_value=10, value=5,
                key=f"pref_{dim}",
            )

    if st.button("Match Me", type="primary", use_container_width=True):
        with st.spinner("Asking Gemini to find your best matches..."):
            try:
                result = get_matches(student_prefs)
                matches = result["matches"]
                profiles = result["raw_profiles"]
            except Exception as e:
                st.error(f"Matching failed: {e}")
                matches = []
                profiles = pd.DataFrame()

        if matches:
            st.success(f"Found your top {len(matches)} matches!")

            student_normalized = [(v - 1) / 9 for v in student_prefs.values()]

            for i, match in enumerate(matches):
                with st.container():
                    st.markdown(f"### #{i + 1} — {match['college_name']}")

                    score_col, detail_col = st.columns([1, 2])

                    with score_col:
                        score_pct = match["similarity_score"] * 100
                        st.metric("Alignment Score", f"{score_pct:.0f}%")

                        if match.get("strengths"):
                            st.markdown("**Strengths:** " + ", ".join(
                                DIMENSION_LABELS.get(s, s) for s in match["strengths"]
                            ))
                        if match.get("weaknesses"):
                            st.markdown("**Watch out:** " + ", ".join(
                                DIMENSION_LABELS.get(w, w) for w in match["weaknesses"]
                            ))

                    with detail_col:
                        st.markdown(f"*{match['explanation']}*")

                        profile_row = profiles[
                            profiles["INSTNM"] == match["college_name"]
                        ]
                        if not profile_row.empty:
                            college_vals = [
                                float(profile_row.iloc[0][d])
                                for d in EXPERIENCE_DIMS
                            ]
                            fig = make_radar(
                                student_normalized,
                                college_vals,
                                match["college_name"],
                            )
                            st.plotly_chart(fig, use_container_width=True)

                    st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE 2: FINANCIAL PLANNER
# ═══════════════════════════════════════════════════════════════════════════════

elif page == "Financial Planner":
    st.title("Financial Planner")
    st.markdown("Plan your college finances — see costs, check affordability, and find alternatives.")

    df = get_colleges_df()
    college_names = df["INSTNM"].dropna().sort_values().unique().tolist()

    selected_name = st.selectbox("Select a college", college_names)
    selected_row = df[df["INSTNM"] == selected_name]

    if selected_row.empty:
        st.warning("College not found.")
    else:
        unitid = int(selected_row.iloc[0]["UNITID"])

        col1, col2, col3 = st.columns(3)
        with col1:
            in_state = st.toggle("In-state student", value=True)
        with col2:
            on_campus = st.toggle("Living on campus", value=True)
        with col3:
            degree_years = st.selectbox("Degree length", [2, 4, 6], index=1)

        budget_col, savings_col = st.columns(2)
        with budget_col:
            budget_per_sem = st.number_input(
                "Budget per semester ($)", min_value=0, value=15000, step=1000
            )
        with savings_col:
            total_savings = st.number_input(
                "Total savings ($)", min_value=0, value=50000, step=5000
            )

        if st.button("Calculate Plan", type="primary", use_container_width=True):
            plan = graduation_plan(
                unitid=unitid,
                budget_per_semester=budget_per_sem,
                total_savings=total_savings,
                in_state=in_state,
                on_campus=on_campus,
                degree_years=degree_years,
            )

            if "error" in plan:
                st.error(plan["error"])
            else:
                st.markdown(f"### Cost Breakdown — {plan['college_name']}")

                cost_items = {
                    "Tuition": plan["tuition"],
                    "Housing": plan["housing"],
                    "Books": plan["books"],
                    "Other": plan["other"],
                }
                valid_costs = {k: v for k, v in cost_items.items() if v is not None}

                if valid_costs:
                    fig = go.Figure(go.Bar(
                        x=list(valid_costs.keys()),
                        y=list(valid_costs.values()),
                        marker_color=["#4C78A8", "#F58518", "#E45756", "#72B7B2"],
                    ))
                    fig.update_layout(
                        yaxis_title="Annual Cost ($)",
                        height=350,
                        margin=dict(l=40, r=40, t=20, b=40),
                    )
                    st.plotly_chart(fig, use_container_width=True)

                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Semester Cost", f"${plan['semester_total']:,.0f}")
                m2.metric("Total to Graduate", f"${plan['total_cost']:,.0f}")
                m3.metric("Your Savings", f"${plan['total_savings']:,.0f}")
                m4.metric("Still Need", f"${plan['remaining_to_fund']:,.0f}")

                if plan["can_graduate_on_time"]:
                    st.success(
                        f"You can graduate on time in {plan['degree_years']} years! "
                        f"You'll have ${plan['total_savings'] - plan['total_cost']:,.0f} left over."
                    )
                else:
                    st.warning(
                        f"Your savings cover {plan['affordable_semesters']} of "
                        f"{plan['total_semesters']} semesters. "
                        f"You'd need to save **${plan['monthly_savings_needed']:,.0f}/month** "
                        f"over the next 6 months to close the gap."
                    )

                    st.markdown("#### Affordable Alternatives")
                    alts = find_alternatives(
                        budget_per_semester=budget_per_sem,
                        state=None,
                        in_state=in_state,
                        limit=5,
                    )
                    if not alts.empty:
                        st.dataframe(
                            alts.rename(columns={
                                "INSTNM": "College",
                                "CITY": "City",
                                "STABBR": "State",
                                "est_semester_cost": "Est. Semester Cost",
                                "C150_4": "Graduation Rate",
                                "MD_EARN_WNE_P10": "Median Earnings (10yr)",
                            }),
                            use_container_width=True,
                            hide_index=True,
                        )
                    else:
                        st.info("No alternatives found within your budget.")

        st.markdown("---")
        st.markdown("### Budget Tracker")
        st.markdown("Already enrolled? Track your spending.")

        tr1, tr2 = st.columns(2)
        with tr1:
            track_semesters = st.number_input("Semesters completed", 0, 12, 0)
        with tr2:
            track_spent = st.number_input("Total spent so far ($)", 0, 500000, 0, step=1000)

        if st.button("Track Budget"):
            costs = estimate_semester_cost(unitid, in_state, on_campus)
            if "error" not in costs and costs["semester_total"]:
                total_sems = degree_years * 2
                total_cost = costs["semester_total"] * total_sems
                tracker = budget_tracker(total_cost, track_semesters, total_sems, track_spent)

                t1, t2, t3 = st.columns(3)
                t1.metric("Remaining", f"${tracker['remaining']:,.0f}")
                t2.metric("Per Semester Left", f"${tracker['per_semester_remaining']:,.0f}")
                status = "On Track" if tracker["on_track"] else "Over Budget"
                delta = f"${tracker['over_under']:+,.0f}"
                t3.metric("Status", status, delta=delta)

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE 3: COMPARE COLLEGES
# ═══════════════════════════════════════════════════════════════════════════════

elif page == "Compare Colleges":
    st.title("Compare Colleges")
    st.markdown("Select 2-4 colleges to compare side by side.")

    df = get_colleges_df()
    has_alumni = df[df[EXPERIENCE_DIMS[0]].notna()]
    all_names = df["INSTNM"].dropna().sort_values().unique().tolist()
    alumni_names = has_alumni["INSTNM"].sort_values().unique().tolist()

    selected = st.multiselect(
        "Choose colleges to compare (colleges with alumni data are recommended)",
        all_names,
        default=alumni_names[:2] if len(alumni_names) >= 2 else [],
        max_selections=4,
    )

    if len(selected) >= 2:
        compare_df = df[df["INSTNM"].isin(selected)]

        st.markdown("### Experience Profile Comparison")
        has_profile = compare_df[compare_df[EXPERIENCE_DIMS[0]].notna()]

        if not has_profile.empty:
            labels = [DIMENSION_LABELS[d] for d in EXPERIENCE_DIMS]
            labels_closed = labels + [labels[0]]

            fig = go.Figure()
            for _, row in has_profile.iterrows():
                vals = [float(row[d]) for d in EXPERIENCE_DIMS]
                vals_closed = vals + [vals[0]]
                fig.add_trace(go.Scatterpolar(
                    r=vals_closed, theta=labels_closed,
                    fill="toself", name=row["INSTNM"],
                    opacity=0.5,
                ))
            fig.update_layout(
                polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
                showlegend=True,
                height=500,
                margin=dict(l=60, r=60, t=40, b=40),
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("None of the selected colleges have alumni experience data.")

        st.markdown("### Financial Comparison")
        in_state = st.toggle("Compare as in-state", value=True, key="compare_instate")
        on_campus = st.toggle("Compare on-campus", value=True, key="compare_oncampus")

        fin_data = []
        for _, row in compare_df.iterrows():
            costs = estimate_semester_cost(
                int(row["UNITID"]), in_state, on_campus
            )
            if "error" not in costs:
                fin_data.append(costs)

        if fin_data:
            fin_df = pd.DataFrame(fin_data)[
                ["college_name", "tuition", "housing", "books", "other", "semester_total", "annual_total"]
            ]
            fin_df.columns = ["College", "Tuition", "Housing", "Books", "Other", "Semester Total", "Annual Total"]

            st.dataframe(fin_df, use_container_width=True, hide_index=True)

            fig = go.Figure()
            for _, frow in pd.DataFrame(fin_data).iterrows():
                costs_bar = {
                    "Tuition": frow["tuition"] or 0,
                    "Housing": frow["housing"] or 0,
                    "Books": frow["books"] or 0,
                    "Other": frow["other"] or 0,
                }
                fig.add_trace(go.Bar(
                    name=frow["college_name"],
                    x=list(costs_bar.keys()),
                    y=list(costs_bar.values()),
                ))
            fig.update_layout(
                barmode="group",
                yaxis_title="Annual Cost ($)",
                height=400,
                margin=dict(l=40, r=40, t=20, b=40),
            )
            st.plotly_chart(fig, use_container_width=True)

        st.markdown("### Key Metrics")
        metrics_cols = st.columns(len(selected))
        for i, (_, row) in enumerate(compare_df.iterrows()):
            with metrics_cols[i]:
                st.markdown(f"**{row['INSTNM']}**")
                adm = row.get("ADM_RATE")
                grad = row.get("C150_4")
                earn = row.get("MD_EARN_WNE_P10")
                st.write(f"Admission Rate: {float(adm)*100:.0f}%" if pd.notna(adm) else "Admission Rate: N/A")
                st.write(f"Graduation Rate: {float(grad)*100:.0f}%" if pd.notna(grad) else "Graduation Rate: N/A")
                st.write(f"Median Earnings (10yr): ${float(earn):,.0f}" if pd.notna(earn) else "Median Earnings: N/A")
    elif len(selected) == 1:
        st.info("Select at least 2 colleges to compare.")
