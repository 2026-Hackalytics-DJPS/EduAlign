import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProfileGate } from "./components/ProfileGate";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ProfilePage } from "./pages/ProfilePage";
import { HomePage } from "./pages/HomePage";
import { FindYourMatch } from "./pages/FindYourMatch";
import { FinancialPlanner } from "./pages/FinancialPlanner";
import { CompareColleges } from "./pages/CompareColleges";
import { CollegeReviewPage } from "./pages/CollegeReviewPage";
import { WriteReview } from "./pages/WriteReview";
import { MyColleges } from "./pages/MyColleges";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProfileGate>
                <Layout />
              </ProfileGate>
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
          <Route path="my-colleges" element={<MyColleges />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
