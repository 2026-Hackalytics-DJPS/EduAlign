import { Link } from "react-router-dom";
import { EduAlignLogo } from "../components/EduAlignLogo";
import "../auth.css";

export function ForgotPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card-centered">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <EduAlignLogo height={48} />
        </div>
        <p className="auth-welcome">Reset your password</p>
        <p className="auth-footer-link" style={{ marginTop: "1rem" }}>
          Password reset is not yet implemented. Contact support or use another sign-in method.
        </p>
        <p className="auth-footer-link" style={{ marginTop: "0.5rem" }}>
          <Link to="/login">Back to Sign in</Link>
        </p>
      </div>
    </div>
  );
}
