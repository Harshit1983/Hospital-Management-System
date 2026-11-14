import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts & Guard
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailsPage from './pages/PatientDetailsPage';
import DoctorsPage from './pages/DoctorsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ClinicalWorkspacePage from './pages/ClinicalWorkspacePage';
import BillingPage from './pages/BillingPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersPage from './pages/UsersPage';

// Global Styles
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Application Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                {/* Common Protected Routes */}
                <Route index element={<DashboardPage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id" element={<PatientDetailsPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />

                {/* Role-Specific Workspaces */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'FRONT_DESK']} />}>
                  <Route path="doctors" element={<DoctorsPage />} />
                  <Route path="billing" element={<BillingPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="users" element={<UsersPage />} />
                  <Route path="departments" element={<DepartmentsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} />}>
                  <Route path="clinical-workspace" element={<ClinicalWorkspacePage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;

