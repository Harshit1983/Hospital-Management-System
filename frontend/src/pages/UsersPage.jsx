import React, { useState, useEffect } from 'react';
import { userAPI, doctorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Users,
  UserPlus,
  Search,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Building2,
  Lock,
  Mail,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  KeyRound,
  Link as LinkIcon
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminCount: 0,
    doctorCount: 0,
    frontDeskCount: 0
  });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Doctor profiles available for linking
  const [availableDoctors, setAvailableDoctors] = useState([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const initialCreateForm = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'FRONT_DESK',
    isActive: true,
    doctorProfileId: ''
  };
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createErrors, setCreateErrors] = useState({});

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'FRONT_DESK',
    isActive: true,
    password: '',
    confirmPassword: '',
    doctorProfileId: ''
  });
  const [editErrors, setEditErrors] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAll({
        search,
        role: roleFilter,
        isActive: statusFilter,
        page,
        limit: 10
      });
      setUsers(res.data);
      if (res.stats) {
        setStats(res.stats);
      }
      setPagination(res.pagination);
    } catch (err) {
      showToast('Error Loading Users', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await doctorAPI.getAll();
      setAvailableDoctors(res.data || []);
    } catch (err) {
      console.error('Failed to load doctor profiles:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Form Validation for Create
  const validateCreateForm = () => {
    const errors = {};
    if (!createForm.name.trim()) errors.name = 'Full name is required';
    if (!createForm.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(createForm.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
    if (!createForm.password) {
      errors.password = 'Password is required';
    } else if (createForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (createForm.password !== createForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Validation for Edit
  const validateEditForm = () => {
    const errors = {};
    if (!editForm.name.trim()) errors.name = 'Full name is required';
    if (!editForm.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(editForm.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
    if (editForm.password) {
      if (editForm.password.length < 6) {
        errors.password = 'New password must be at least 6 characters';
      }
      if (editForm.password !== editForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        isActive: createForm.isActive,
        doctorProfileId: createForm.role === 'DOCTOR' ? (createForm.doctorProfileId || undefined) : undefined
      };

      await userAPI.create(payload);
      showToast('User Created', `User account for ${payload.name} created successfully.`, 'success');
      setShowAddModal(false);
      setCreateForm(initialCreateForm);
      setCreateErrors({});
      fetchUsers();
      fetchDoctors();
    } catch (err) {
      showToast('Account Creation Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: '',
      confirmPassword: '',
      doctorProfileId: user.doctorProfile?._id || ''
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
        doctorProfileId: editForm.role === 'DOCTOR' ? (editForm.doctorProfileId || undefined) : undefined
      };

      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      await userAPI.update(selectedUser._id, payload);
      showToast('User Updated', `Account for ${payload.name} updated successfully.`, 'success');
      setShowEditModal(false);
      fetchUsers();
      fetchDoctors();
    } catch (err) {
      showToast('Update Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await userAPI.toggleStatus(selectedUser._id, { isActive: !selectedUser.isActive });
      showToast(
        'Status Updated',
        `User ${selectedUser.name} is now ${!selectedUser.isActive ? 'Active' : 'Inactive'}`,
        'success'
      );
      setShowToggleModal(false);
      fetchUsers();
    } catch (err) {
      showToast('Action Blocked', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            User Management & Access Control
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Provision, monitor, and configure role-based access for hospital administrators, doctors, and front-desk personnel
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => { setCreateForm(initialCreateForm); setCreateErrors({}); setShowAddModal(true); }}>
          <UserPlus size={18} />
          <span>Add New User</span>
        </button>
      </div>

      {/* 6 User Statistics Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <StatsCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={Users}
          theme="blue"
          subtitle="All registered staff"
        />
        <StatsCard
          title="Active Accounts"
          value={stats.activeUsers || 0}
          icon={UserCheck}
          theme="green"
          subtitle="Enabled login access"
        />
        <StatsCard
          title="Inactive Accounts"
          value={stats.inactiveUsers || 0}
          icon={ShieldAlert}
          theme="amber"
          subtitle="Deactivated access"
        />
        <StatsCard
          title="Administrators"
          value={stats.adminCount || 0}
          icon={ShieldCheck}
          theme="purple"
          subtitle="Full governance"
        />
        <StatsCard
          title="Physicians"
          value={stats.doctorCount || 0}
          icon={Stethoscope}
          theme="teal"
          subtitle="Clinical staff"
        />
        <StatsCard
          title="Front Desk"
          value={stats.frontDeskCount || 0}
          icon={Building2}
          theme="blue"
          subtitle="Triage & billing"
        />
      </div>

      {/* Filter and Search Toolbar */}
      <div className="table-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <div className="input-addon-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-addon-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search users by name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <div className="table-filters">
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="DOCTOR">Doctors</option>
            <option value="FRONT_DESK">Front Desk</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Account Statuses</option>
            <option value="true">Active Accounts</option>
            <option value="false">Inactive Accounts</option>
          </select>

          {(search || roleFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Retrieving user accounts from database...</p>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="No user accounts match the selected search query or active filter."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                Add User Account
              </button>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User Identity</th>
                <th>Role Tier</th>
                <th>Linked Doctor Profile</th>
                <th>Status</th>
                <th>Registered On</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCurrent = currentUser?._id === u._id;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="table-user">
                        <div
                          className="table-avatar-initials"
                          style={{
                            backgroundColor:
                              u.role === 'ADMIN'
                                ? 'var(--role-admin-bg)'
                                : u.role === 'DOCTOR'
                                ? 'var(--role-doctor-bg)'
                                : 'var(--role-frontdesk-bg)',
                            color:
                              u.role === 'ADMIN'
                                ? 'var(--role-admin-text)'
                                : u.role === 'DOCTOR'
                                ? 'var(--role-doctor-text)'
                                : 'var(--role-frontdesk-text)'
                          }}
                        >
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div className="table-user-details">
                          <div className="table-user-name">
                            {u.name} {isCurrent && <span style={{ fontSize: '0.7rem', color: 'var(--primary-600)', fontWeight: 700 }}>(You)</span>}
                          </div>
                          <div className="table-user-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={u.role} />
                    </td>
                    <td>
                      {u.role === 'DOCTOR' ? (
                        u.doctorProfile ? (
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--teal-700)' }}>
                              {u.doctorProfile.doctorId} • {u.doctorProfile.specialization}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {u.doctorProfile.departmentId?.name || 'Department Assigned'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                            Unlinked Profile
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon"
                          title="Edit User Details & Role"
                          onClick={() => handleOpenEdit(u)}
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          className="btn-icon"
                          style={{ color: u.isActive ? '#ef4444' : '#10b981' }}
                          title={u.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
                          onClick={() => {
                            setSelectedUser(u);
                            setShowToggleModal(true);
                          }}
                        >
                          {u.isActive ? <XCircle size={17} /> : <CheckCircle size={17} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New User Account"
        subtitle="Provision an enterprise account with role-based access control"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating User...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className={`form-input ${createErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Dr. Emily Thorne or Staff Member"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
            {createErrors.name && <span className="form-error">{createErrors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span className="required">*</span></label>
            <div className="input-addon-wrapper">
              <Mail size={16} className="input-addon-icon" />
              <input
                type="email"
                className={`form-input input-with-icon ${createErrors.email ? 'is-invalid' : ''}`}
                placeholder="staff.member@hospital.demo"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
            {createErrors.email && <span className="form-error">{createErrors.email}</span>}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div className="input-addon-wrapper">
                <Lock size={16} className="input-addon-icon" />
                <input
                  type="password"
                  className={`form-input input-with-icon ${createErrors.password ? 'is-invalid' : ''}`}
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </div>
              {createErrors.password && <span className="form-error">{createErrors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <div className="input-addon-wrapper">
                <KeyRound size={16} className="input-addon-icon" />
                <input
                  type="password"
                  className={`form-input input-with-icon ${createErrors.confirmPassword ? 'is-invalid' : ''}`}
                  placeholder="Repeat password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              {createErrors.confirmPassword && <span className="form-error">{createErrors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Assigned Role Tier <span className="required">*</span></label>
              <select
                className="form-select"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                <option value="FRONT_DESK">FRONT_DESK (Triage, Patient Records & Billing)</option>
                <option value="DOCTOR">DOCTOR (Physician Clinical Workspace)</option>
                <option value="ADMIN">ADMIN (Full Governance & Security)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Account Status</label>
              <select
                className="form-select"
                value={createForm.isActive ? 'true' : 'false'}
                onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Can log in immediately)</option>
                <option value="false">Inactive (Suspended)</option>
              </select>
            </div>
          </div>

          {/* DOCTOR ACCOUNT LINKING SECTION */}
          {createForm.role === 'DOCTOR' && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--teal-50)',
                border: '1px solid var(--teal-100)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Stethoscope size={18} color="var(--teal-700)" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--teal-700)' }}>
                  Doctor Profile Association
                </h4>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--teal-700)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                Link this user credentials account with an existing Doctor clinical profile to automatically route them to their clinical appointments and encounter charting dashboard.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: 'var(--teal-700)' }}>
                  Select Existing Doctor Profile to Link
                </label>
                <select
                  className="form-select"
                  value={createForm.doctorProfileId}
                  onChange={(e) => setCreateForm({ ...createForm, doctorProfileId: e.target.value })}
                >
                  <option value="">-- Do Not Link / Create As Unlinked Doctor --</option>
                  {availableDoctors.map((doc) => {
                    const isAlreadyLinked = !!doc.userId;
                    return (
                      <option key={doc._id} value={doc._id} disabled={isAlreadyLinked}>
                        {doc.doctorId} — {doc.userId?.name ? `${doc.userId.name} (Linked)` : doc.specialization} ({doc.departmentId?.name || 'Department'}) {isAlreadyLinked ? '• Already Linked' : '• Available'}
                      </option>
                    );
                  })}
                </select>
                <span className="form-hint" style={{ color: 'var(--teal-600)' }}>
                  Only unlinked doctor profiles can be associated to prevent duplicate doctor assignments.
                </span>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User Account"
        subtitle={`Modifying profile for ${selectedUser?.name}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            {editErrors.name && <span className="form-error">{editErrors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span className="required">*</span></label>
            <input
              type="email"
              className="form-input"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
            {editErrors.email && <span className="form-error">{editErrors.email}</span>}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Role Tier</label>
              <select
                className="form-select"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="FRONT_DESK">FRONT_DESK</option>
                <option value="DOCTOR">DOCTOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={editForm.isActive ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive (Suspended)</option>
              </select>
            </div>
          </div>

          {/* Optional Password Reset */}
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-alt)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Change Password (Leave blank to keep current)
            </span>
            <div className="form-grid-2" style={{ marginTop: '0.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="New password (min 6 chars)"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                {editErrors.password && <span className="form-error">{editErrors.password}</span>}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                />
                {editErrors.confirmPassword && <span className="form-error">{editErrors.confirmPassword}</span>}
              </div>
            </div>
          </div>

          {/* Doctor linking if role is DOCTOR */}
          {editForm.role === 'DOCTOR' && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Associated Doctor Profile</label>
              <select
                className="form-select"
                value={editForm.doctorProfileId}
                onChange={(e) => setEditForm({ ...editForm, doctorProfileId: e.target.value })}
              >
                <option value="">-- No Profile Linked --</option>
                {availableDoctors.map((doc) => {
                  const isCurrent = doc.userId?._id === selectedUser?._id;
                  const isTaken = doc.userId && !isCurrent;
                  return (
                    <option key={doc._id} value={doc._id} disabled={isTaken}>
                      {doc.doctorId} — {doc.specialization} ({doc.departmentId?.name}) {isCurrent ? '• (Currently Linked)' : isTaken ? '• (Linked to Other)' : '• (Available)'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* Confirmation Dialog for Status Change */}
      <ConfirmDialog
        isOpen={showToggleModal}
        onClose={() => setShowToggleModal(false)}
        onConfirm={handleToggleStatus}
        title={selectedUser?.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
        message={
          selectedUser?.isActive
            ? `Are you sure you want to deactivate ${selectedUser?.name} (${selectedUser?.email})? They will immediately be blocked from logging into the portal.`
            : `Reactivate login access for ${selectedUser?.name}?`
        }
        confirmText={selectedUser?.isActive ? 'Deactivate Account' : 'Activate Account'}
        danger={selectedUser?.isActive}
        loading={submitting}
      />
    </div>
  );
};

export default UsersPage;

