import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Bell,
  Search,
  KeyRound,
  LogOut,
  ChevronDown
} from 'lucide-react';
import Modal from '../components/Modal';
import '../styles/layout.css';

const Topbar = ({ onToggleSidebar }) => {
  const { user, role, logout, changePassword } = useAuth();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Compute breadcrumb from pathname
  const getBreadcrumbs = () => {
    const path = location.pathname.split('/').filter(Boolean);
    if (path.length === 0) return ['Hospital', 'Dashboard'];
    return ['Hospital', ...path.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' '))];
  };

  const breadcrumbs = getBreadcrumbs();

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    setPasswordError('');
    setSubmittingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="btn-icon mobile-menu-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Drawer"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumbs">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb}>
                {idx > 0 && <span style={{ color: 'var(--text-light)' }}>/</span>}
                <span className={idx === breadcrumbs.length - 1 ? 'current' : ''}>{crumb}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="topbar-right">
          {/* Quick Search */}
          <div className="search-bar">
            <Search size={16} color="var(--text-light)" />
            <input type="text" placeholder="Quick search..." />
          </div>

          {/* Notifications Popover */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative' }}
              title="Notifications"
            >
              <Bell size={20} />
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  backgroundColor: '#ef4444',
                  borderRadius: '50%'
                }}
              />
            </button>

            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: 300,
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-light)',
                  padding: 'var(--spacing-md)',
                  zIndex: 60
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Hospital Alerts</h5>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-600)', cursor: 'pointer' }}>Mark all read</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-50)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-700)' }}>Cardiology Telemetry</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lab reports for Eleanor Vance ready for clinical review</div>
                  </div>
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Slot Schedule</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>2 appointments scheduled for today afternoon</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="user-menu-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User profile options"
            >
              <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
              <div className="user-info-text">
                <div className="user-name">{user?.name}</div>
                <div className="user-role-label">{role}</div>
              </div>
              <ChevronDown size={14} color="var(--text-light)" />
            </button>

            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: 220,
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-light)',
                  padding: '0.4rem',
                  zIndex: 60
                }}
              >
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '0.25rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{user?.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>

                <button
                  className="nav-item"
                  style={{ width: '100%', border: 'none', background: 'none' }}
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowPasswordModal(true);
                  }}
                >
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>

                <button
                  className="nav-item"
                  style={{ width: '100%', border: 'none', background: 'none', color: 'var(--danger-text)' }}
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Security Password"
        subtitle="Ensure your new password contains at least 6 characters"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handlePasswordSubmit} disabled={submittingPassword}>
              {submittingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </>
        }
      >
        <form onSubmit={handlePasswordSubmit}>
          {passwordError && (
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {passwordError}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Topbar;

