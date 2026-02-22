import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user && !user.profile_complete) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}
