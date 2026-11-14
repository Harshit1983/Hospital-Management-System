import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Users,
  UserCheck,
  Calendar,
  FileText,
  CreditCard,
  BarChart3,
  ShieldCheck,
  UserCog,
  LogOut,
  Stethoscope,
  Building2
} from 'lucide-react';
import '../styles/layout.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-icon">
            <Activity size={24} />
          </div>
          <div>
            <div className="brand-title">MedPulse</div>
            <div className="brand-subtitle">Health Intelligence</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Overview</div>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </NavLink>

          <div className="nav-section-title">Clinical & Operations</div>
          <NavLink
            to="/patients"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Users size={18} />
            <span>Patients</span>
          </NavLink>

          <NavLink
            to="/appointments"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Calendar size={18} />
            <span>Appointments</span>
          </NavLink>

          {/* Doctors & Departments (Admin & Staff) */}
          {(role === 'ADMIN' || role === 'FRONT_DESK') && (
            <NavLink
              to="/doctors"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <UserCheck size={18} />
              <span>Doctors & Staff</span>
            </NavLink>
          )}

          {role === 'ADMIN' && (
            <NavLink
              to="/departments"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Building2 size={18} />
              <span>Departments</span>
            </NavLink>
          )}

          {/* Clinical Workspace for Doctors */}
          {role === 'DOCTOR' && (
            <NavLink
              to="/clinical-workspace"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Stethoscope size={18} />
              <span>Clinical Visits</span>
            </NavLink>
          )}

          {/* Billing & Finance */}
          {(role === 'ADMIN' || role === 'FRONT_DESK') && (
            <>
              <div className="nav-section-title">Financial Services</div>
              <NavLink
                to="/billing"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <CreditCard size={18} />
                <span>Invoices & Billing</span>
              </NavLink>
            </>
          )}

          {/* Administrative Analytics & Security */}
          {role === 'ADMIN' && (
            <>
              <div className="nav-section-title">Administration</div>
              <NavLink
                to="/users"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <UserCog size={18} />
                <span>User Management</span>
              </NavLink>

              <NavLink
                to="/reports"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <BarChart3 size={18} />
                <span>Reports & Analytics</span>
              </NavLink>

              <NavLink
                to="/audit-logs"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <ShieldCheck size={18} />
                <span>Audit Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {user?.name?.split(' ')[0]}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{role}</div>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={logout}
            title="Sign out of system"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

