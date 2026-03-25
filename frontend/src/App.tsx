import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScreeningGate } from "./components/ScreeningGate";
import { ProfileGate } from "./components/ProfileGate";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ProfilePage } from "./pages/ProfilePage";
import { ScreeningPage } from "./pages/ScreeningPage";
import { HomePage } from "./pages/HomePage";
import { FindYourMatch } from "./pages/FindYourMatch";
import { FinancialPlanner } from "./pages/FinancialPlanner";
import { CompareColleges } from "./pages/CompareColleges";
import { CollegeReviewPage } from "./pages/CollegeReviewPage";
import { WriteReview } from "./pages/WriteReview";
import { MyColleges } from "./pages/MyColleges";
import { AdminPage } from "./pages/AdminPage";

const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));

function ProfilePageWrapper() {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: "#4a5080",
        fontSize: "1.75rem",
        marginBottom: "0.25rem",
      }}>My Profile</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Update your information to keep your matches and recommendations relevant.
      </p>
      <div className="page-card">
        <ProfilePage embedded />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/screening"
          element={
            <ProtectedRoute>
              <ScreeningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ScreeningGate>
                <ProfileGate>
                  <Layout />
                </ProfileGate>
              </ScreeningGate>
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="match" element={<FindYourMatch />} />
          <Route path="financial" element={<FinancialPlanner />} />
          <Route path="compare" element={<CompareColleges />} />
          <Route path="reviews" element={<CollegeReviewPage />} />
          <Route path="reviews/:unitid" element={<CollegeReviewPage />} />
          <Route path="reviews/:unitid/write" element={<WriteReview />} />
          <Route path="map" element={<Suspense fallback={<div className="page-loading">Loading map…</div>}><MapPage /></Suspense>} />
          <Route path="my-colleges" element={<MyColleges />} />
          <Route path="profile" element={<ProfilePageWrapper />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
