import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EduAlignLogo } from "../components/EduAlignLogo";
import { postSignup } from "../api";
import "../auth.css";

export function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/login", { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await postSignup(username.trim(), password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-centered">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <EduAlignLogo height={72} />
        </div>
        <p className="auth-tagline" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          "Where Students Meet Their Perfect Fit."
        </p>
        <p className="auth-welcome">Welcome to EduAlign</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="signup-email">Enter email:</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-username">Enter username:</label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3–32 characters"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="signup-password">Enter password:</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, include upper, lower, number, symbol"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="signup-confirm">Confirm password:</label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>
          {success && (
            <p className="auth-success" style={{ color: "#15803d", background: "#f0fdf4", padding: "0.75rem 1rem", borderRadius: 8, textAlign: "center" }}>
              Account created successfully! Please sign in.
            </p>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading || success}
          >
            Continue
          </button>
        </form>
        <p className="auth-footer-link" style={{ marginTop: "1rem" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
