import { useState, useCallback, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EduAlignLogo } from "../components/EduAlignLogo";
import { useAuth } from "../contexts/AuthContext";
import { postLogin, postGoogleLogin } from "../api";
import "../auth.css";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? "";

export function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await postLogin(username.trim(), password);
      setAuth(res.access_token, res.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = useCallback(() => {
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
      <div className="auth-card">
        <div className="auth-split">
          <div className="auth-brand-column">
            <EduAlignLogo height={80} />
            <p className="auth-tagline">"Where Students Meet Their Perfect Fit."</p>
          </div>
          <div className="auth-form-column">
            <EduAlignLogo height={44} />
            <p className="auth-welcome">Welcome to EduAlign</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="login-username">Username/Email:</label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password:</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
                <Link to="/forgot-password" className="auth-forgot">
                  Forgot Password?
                </Link>
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button
                type="submit"
                className="auth-btn-primary"
                disabled={loading}
              >
                Sign In
              </button>
            </form>
            <div className="auth-divider">or</div>
            <div className="auth-social">
              <button
                type="button"
                className="auth-btn-social"
                onClick={googleSignIn}
              >
                <GoogleIcon />
                Sign in with Google
              </button>
              <button
                type="button"
                className="auth-btn-social"
                onClick={() => setError("Sign in with Apple: add Apple JS SDK and set APPLE_CLIENT_ID in the backend.")}
              >
                <AppleIcon />
                Sign in with Apple
              </button>
            </div>
            <p className="auth-footer-link">
              Are you new? <Link to="/signup">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
