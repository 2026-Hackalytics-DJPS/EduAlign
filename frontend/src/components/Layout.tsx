import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { EduAlignLogo } from "./EduAlignLogo";
import {
  Home, Crosshair, Wallet, GitCompareArrows, Star,
  BookMarked, ShieldCheck, User, LogOut, ChevronUp,
} from "lucide-react";

const ICON_SIZE = 18;

const nav = [
  { to: "/", label: "Home", icon: <Home size={ICON_SIZE} /> },
  { to: "/match", label: "Find Your Match", icon: <Crosshair size={ICON_SIZE} /> },
  { to: "/financial", label: "Financial Planner", icon: <Wallet size={ICON_SIZE} /> },
  { to: "/compare", label: "Compare Colleges", icon: <GitCompareArrows size={ICON_SIZE} /> },
  { to: "/reviews", label: "Reviews", icon: <Star size={ICON_SIZE} /> },
  { to: "/my-colleges", label: "My Colleges", icon: <BookMarked size={ICON_SIZE} /> },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <EduAlignLogo height={36} dark />
        </div>
        <p className="sidebar-tagline">
          Find colleges that match your experience, not just your stats.
        </p>
        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
              end={to === "/"}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
            >
              <span className="nav-icon"><ShieldCheck size={ICON_SIZE} /></span>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="sidebar-profile" ref={menuRef}>
          <button
            type="button"
            className="sidebar-profile-btn"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sidebar-avatar">{initials}</span>
            <span className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user?.username}</span>
              <span className="sidebar-profile-sub">
                {user?.profile_complete ? user.intended_major || "Student" : "Complete your profile"}
              </span>
            </span>
            <span className={`sidebar-chevron${menuOpen ? " open" : ""}`}><ChevronUp size={14} /></span>
          </button>

          {menuOpen && (
            <div className="sidebar-menu">
              <button
                type="button"
                className="sidebar-menu-item"
                onClick={() => { setMenuOpen(false); navigate("/profile"); }}
              >
                <span className="sidebar-menu-icon"><User size={16} /></span>
                My Profile
              </button>
              <div className="sidebar-menu-divider" />
              <button
                type="button"
                className="sidebar-menu-item sidebar-menu-logout"
                onClick={() => { setMenuOpen(false); handleLogout(); }}
              >
                <span className="sidebar-menu-icon"><LogOut size={16} /></span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <div className="fixed-logo-br">
        <EduAlignLogo height={28} />
      </div>
    </div>
  );
}
