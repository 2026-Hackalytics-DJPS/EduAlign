import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EduAlignLogo } from "../components/EduAlignLogo";
import { useAuth } from "../contexts/AuthContext";
import { postSignup, postGoogleLogin } from "../api";
import "../auth.css";

const GOOGLE_CLIENT_ID = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? "";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
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

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await postGoogleLogin(credential);
      setAuth(res.access_token, res.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const googleSignUp = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google sign-in is not configured (set VITE_GOOGLE_CLIENT_ID).");
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => handleGoogleCredential(res.credential),
      });
      window.google.accounts.id.prompt();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (res) => handleGoogleCredential(res.credential),
          });
          window.google.accounts.id.prompt();
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-centered">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <EduAlignLogo height={72} />
        </div>
        <p className="auth-tagline" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          "Where Students Meet Their Perfect Fit."
        </p>
        <p className="auth-welcome">Create your account</p>

        <div className="auth-social" style={{ maxWidth: 380, margin: "0 auto" }}>
          <button
            type="button"
            className="auth-btn-google"
            onClick={googleSignUp}
          >
            <GoogleIcon />
            Sign up with Google
          </button>
        </div>

        <div className="auth-divider" style={{ maxWidth: 380, margin: "1rem auto" }}>or</div>

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
              placeholder="3-32 characters"
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
