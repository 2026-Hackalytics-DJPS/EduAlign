import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { EduAlignLogo } from "./EduAlignLogo";

const nav = [
  { to: "/", label: "Find Your Match" },
  { to: "/financial", label: "Financial Planner" },
  { to: "/compare", label: "Compare Colleges" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <EduAlignLogo height={36} dark />
        </div>
        <p className="sidebar-tagline">
          Find colleges that match your experience, not just your stats.
        </p>
        {user && (
          <p className="sidebar-user" style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.5rem" }}>
            {user.username}
          </p>
        )}
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
        <button
          type="button"
          className="nav-link"
          style={{ marginTop: "auto", textAlign: "left", background: "none", border: "none", color: "inherit" }}
          onClick={handleLogout}
        >
          Sign out
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
