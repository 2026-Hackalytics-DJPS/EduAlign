import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/", label: "Find Your Match" },
  { to: "/financial", label: "Financial Planner" },
  { to: "/compare", label: "Compare Colleges" },
];

export function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">EduAlign</div>
        <p className="sidebar-tagline">
          Find colleges that match your experience, not just your stats.
        </p>
        <nav className="sidebar-nav">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
              end={to === "/"}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
