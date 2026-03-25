import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ScreeningGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user && !user.screening_complete) {
    return <Navigate to="/screening" replace />;
  }

  return <>{children}</>;
}
