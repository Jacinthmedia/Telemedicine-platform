
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ROLE_DASHBOARDS = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function AccessDenied() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        textAlign: "center",
        background: "#f8fafc",
        color: "#1e293b",
      }}
    >
      <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>
        Access Denied
      </h1>

      <p style={{ color: "#64748b", marginBottom: "20px" }}>
        You do not have permission to access this page.
      </p>

      <a
        href="/dashboard"
        style={{
          padding: "12px 24px",
          background: "#08A879",
          color: "#ffffff",
          textDecoration: "none",
          borderRadius: "8px",
          fontWeight: "600",
        }}
      >
        Return to Dashboard
      </a>
    </div>
  );
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait until authentication initialization is complete.
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "16px",
          color: "#64748b",
        }}
      >
        Loading MediCare...
      </div>
    );
  }

  // Reject unauthenticated users.
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // If no role restriction was provided, allow any authenticated user.
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // Normalize the current user's role.
  const userRole = normalizeRole(user.role);

  // Normalize permitted roles.
  const permittedRoles = allowedRoles.map(normalizeRole);

  // Reject users whose roles are not permitted.
  if (!userRole || !permittedRoles.includes(userRole)) {
    const dashboard = ROLE_DASHBOARDS[userRole];

    if (dashboard) {
      return <Navigate to={dashboard} replace />;
    }

    return <AccessDenied />;
  }

  return children;
};

export default ProtectedRoute;
