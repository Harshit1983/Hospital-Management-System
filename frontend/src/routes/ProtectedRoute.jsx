import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-600)' }}>MedPulse</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="card" style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <ShieldAlert size={32} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Access Restricted
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Your account role (<strong>{role}</strong>) does not have sufficient authorization to view this clinical or administrative workspace.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
          Return to Safe Dashboard
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;

