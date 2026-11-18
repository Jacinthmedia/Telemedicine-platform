
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/common/ProtectedRoute";
import Layout from "../components/layout/Layout";

// Public pages
import Landing from "../pages/Landing";
import Login from "../components/auth/Login";
import Register from "../components/auth/Register";
import ForgotPassword from "../components/auth/ForgotPassword";

// Dashboards
import PatientDashboard from "../components/dashboard/PatientDashboard";
import DoctorDashboard from "../components/dashboard/DoctorDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";

// Admin
import DoctorVerification from "../components/admin/DoctorVerification";
import UserManagement from "../components/admin/UserManagement";
import AppointmentManagement from "../components/admin/AppointmentManagement";
import AdminPayments from "../components/admin/AdminPayments";
import AdminSettings from "../components/admin/AdminSettings";
import SystemLogs from "../components/admin/SystemLogs";

// Patient
import FindDoctors from "../components/patient/FindDoctors";
import PatientProfile from "../components/patient/PatientProfile";
import PatientSettings from "../components/patient/PatientSettings";

// Doctor
import DoctorProfile from "../components/doctor/DoctorProfile";
import DoctorAvailability from "../components/doctor/DoctorAvailability";
import DoctorSettings from "../components/doctor/DoctorSettings";
import DoctorWallet from "../components/doctor/DoctorWallet";

// Appointments
import AppointmentBooking from "../components/appointments/AppointmentBooking";
import AppointmentList from "../components/appointments/AppointmentList";
import AppointmentCalendar from "../components/appointments/AppointmentCalendar";
import AppointmentDetails from "../components/appointments/AppointmentDetails";

// Medical
import Documents from "../components/medical/Documents";
import MedicalRecords from "../components/medical/MedicalRecords";
import Prescriptions from "../components/medical/Prescriptions";

// Payments
import PaymentHistory from "../components/payments/PaymentHistory";
import PaymentCheckout from "../components/payments/PaymentCheckout";
import PaymentSuccess from "../components/payments/PaymentSuccess";

// Chat and video
import ChatInterface from "../components/chat/ChatInterface";
import VideoConsultation from "../pages/VideoConsultation";

// Other pages
import NotificationsPage from "../pages/NotificationsPage";
import SearchResultsPage from "../pages/SearchResultsPage";
import CallHistory from "../pages/CallHistory";


function LoadingScreen() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      Loading MediCare...
    </div>
  );
}


// Normalize roles to avoid case and whitespace mismatches.
function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}


// Dashboard destinations for each role.
const ROLE_DASHBOARDS = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};


function getDashboardPath(role) {
  return ROLE_DASHBOARDS[normalizeRole(role)] || "/dashboard";
}


// Prevent authenticated users from returning to login/register.
function PublicOnlyRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={getDashboardPath(user?.role)}
        replace
      />
    );
  }

  return children;
}


// Redirect users to their appropriate dashboard.
function RoleRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={getDashboardPath(user?.role)}
      replace
    />
  );
}


// Common protected page wrapper.
function ProtectedPage({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}


// Role-specific route wrappers.
function PatientPage({ children }) {
  return (
    <ProtectedPage allowedRoles={["patient"]}>
      {children}
    </ProtectedPage>
  );
}


function DoctorPage({ children }) {
  return (
    <ProtectedPage allowedRoles={["doctor"]}>
      {children}
    </ProtectedPage>
  );
}


function AdminPage({ children }) {
  return (
    <ProtectedPage allowedRoles={["admin"]}>
      {children}
    </ProtectedPage>
  );
}


// Pages accessible to patients and doctors.
function ClinicalPage({ children }) {
  return (
    <ProtectedPage allowedRoles={["patient", "doctor"]}>
      {children}
    </ProtectedPage>
  );
}


// Pages accessible to any authenticated user.
function AuthenticatedPage({ children }) {
  return (
    <ProtectedPage>
      {children}
    </ProtectedPage>
  );
}


export default function AppRoutes() {
  return (
    <Routes>

      {/* =====================================
          PUBLIC ROUTES
      ====================================== */}

      <Route path="/" element={<Landing />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />


      {/* =====================================
          DASHBOARD REDIRECT
      ====================================== */}

      <Route
        path="/dashboard"
        element={<RoleRedirect />}
      />


      {/* =====================================
          PATIENT ROUTES
      ====================================== */}

      <Route
        path="/patient/dashboard"
        element={
          <PatientPage>
            <PatientDashboard />
          </PatientPage>
        }
      />

      <Route
        path="/patient/doctors"
        element={
          <PatientPage>
            <FindDoctors />
          </PatientPage>
        }
      />

      <Route
        path="/patient/profile"
        element={
          <PatientPage>
            <PatientProfile />
          </PatientPage>
        }
      />

      <Route
        path="/patient/settings"
        element={
          <PatientPage>
            <PatientSettings />
          </PatientPage>
        }
      />

      <Route
        path="/patient/appointments"
        element={
          <PatientPage>
            <AppointmentList />
          </PatientPage>
        }
      />

      <Route
        path="/patient/appointments/:id"
        element={
          <PatientPage>
            <AppointmentDetails />
          </PatientPage>
        }
      />

      <Route
        path="/patient/medical-records"
        element={
          <PatientPage>
            <MedicalRecords />
          </PatientPage>
        }
      />

      <Route
        path="/patient/prescriptions"
        element={
          <PatientPage>
            <Prescriptions />
          </PatientPage>
        }
      />

      <Route
        path="/patient/documents"
        element={
          <PatientPage>
            <Documents />
          </PatientPage>
        }
      />

      <Route
        path="/patient/payments"
        element={
          <PatientPage>
            <PaymentHistory />
          </PatientPage>
        }
      />


      {/* =====================================
          DOCTOR ROUTES
      ====================================== */}

      <Route
        path="/doctor/dashboard"
        element={
          <DoctorPage>
            <DoctorDashboard />
          </DoctorPage>
        }
      />

      <Route
        path="/doctor/profile"
        element={
          <DoctorPage>
            <DoctorProfile />
          </DoctorPage>
        }
      />

      <Route
        path="/doctor/availability"
        element={
          <DoctorPage>
            <DoctorAvailability />
          </DoctorPage>
        }
      />

      <Route
        path="/doctor/settings"
        element={
          <DoctorPage>
            <DoctorSettings />
          </DoctorPage>
        }
      />

      <Route
        path="/doctor/wallet"
        element={
          <DoctorPage>
            <DoctorWallet />
          </DoctorPage>
        }
      />

      <Route
        path="/doctor/appointments"
        element={
          <DoctorPage>
            <AppointmentList />
          </DoctorPage>
        }
      />


      {/* =====================================
          ADMIN ROUTES
      ====================================== */}

      <Route
        path="/admin/dashboard"
        element={
          <AdminPage>
            <AdminDashboard />
          </AdminPage>
        }
      />

      <Route
        path="/admin/doctor-verification"
        element={
          <AdminPage>
            <DoctorVerification />
          </AdminPage>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AdminPage>
            <UserManagement />
          </AdminPage>
        }
      />

      <Route
        path="/admin/appointments"
        element={
          <AdminPage>
            <AppointmentManagement />
          </AdminPage>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <AdminPage>
            <AdminPayments />
          </AdminPage>
        }
      />

      <Route
        path="/admin/logs"
        element={
          <AdminPage>
            <SystemLogs />
          </AdminPage>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <AdminPage>
            <AdminSettings />
          </AdminPage>
        }
      />


      {/* =====================================
          PAYMENT ROUTES
      ====================================== */}

      <Route
        path="/payments/appointment/:appointmentId"
        element={
          <PatientPage>
            <PaymentCheckout />
          </PatientPage>
        }
      />

      <Route
        path="/payment-success"
        element={
          <PatientPage>
            <PaymentSuccess />
          </PatientPage>
        }
      />


      {/* =====================================
          APPOINTMENT ROUTES
      ====================================== */}

      <Route
        path="/appointments/book"
        element={
          <PatientPage>
            <AppointmentBooking />
          </PatientPage>
        }
      />

      <Route
        path="/appointments/calendar"
        element={
          <ClinicalPage>
            <AppointmentCalendar />
          </ClinicalPage>
        }
      />

      <Route
        path="/appointments"
        element={
          <ClinicalPage>
            <AppointmentList />
          </ClinicalPage>
        }
      />


      {/* =====================================
          MEDICAL ROUTES
      ====================================== */}

      <Route
        path="/medical-records"
        element={
          <ClinicalPage>
            <MedicalRecords />
          </ClinicalPage>
        }
      />

      <Route
        path="/prescriptions"
        element={
          <ClinicalPage>
            <Prescriptions />
          </ClinicalPage>
        }
      />

      <Route
        path="/documents"
        element={
          <ClinicalPage>
            <Documents />
          </ClinicalPage>
        }
      />


      {/* =====================================
          CHAT AND VIDEO ROUTES
      ====================================== */}

      <Route
        path="/chat"
        element={
          <ClinicalPage>
            <ChatInterface />
          </ClinicalPage>
        }
      />

      <Route
        path="/video-consultation/:id"
        element={
          <ClinicalPage>
            <VideoConsultation />
          </ClinicalPage>
        }
      />

      <Route
        path="/call-history"
        element={
          <ClinicalPage>
            <CallHistory />
          </ClinicalPage>
        }
      />


      {/* =====================================
          OTHER AUTHENTICATED ROUTES
      ====================================== */}

      <Route
        path="/notifications"
        element={
          <AuthenticatedPage>
            <NotificationsPage />
          </AuthenticatedPage>
        }
      />

      <Route
        path="/search"
        element={
          <ClinicalPage>
            <SearchResultsPage />
          </ClinicalPage>
        }
      />


      {/* =====================================
          CATCH-ALL
      ====================================== */}

      <Route
        path="*"
        element={<RoleRedirect />}
      />

    </Routes>
  );
}
