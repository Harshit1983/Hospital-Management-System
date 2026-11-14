import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  AlertCircle
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const PatientsPage = () => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [confirmToggleModal, setConfirmToggleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Patient Form State
  const initialFormState = {
    name: '',
    dateOfBirth: '',
    gender: 'MALE',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    bloodGroup: 'UNKNOWN',
    allergies: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await patientAPI.getAll({
        search,
        gender: genderFilter,
        isActive: statusFilter,
        page,
        limit: 10
      });
      setPatients(res.data);
      setPagination(res.pagination);
    } catch (err) {
      showToast('Error Loading Patients', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, genderFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEdit = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      gender: patient.gender || 'MALE',
      phone: patient.phone || '',
      email: patient.email || '',
      street: patient.address?.street || '',
      city: patient.address?.city || '',
      state: patient.address?.state || '',
      postalCode: patient.address?.postalCode || '',
      emergencyName: patient.emergencyContact?.name || '',
      emergencyRelation: patient.emergencyContact?.relationship || '',
      emergencyPhone: patient.emergencyContact?.phone || '',
      bloodGroup: patient.bloodGroup || 'UNKNOWN',
      allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Patient name is required';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        },
        emergencyContact: {
          name: formData.emergencyName,
          relationship: formData.emergencyRelation,
          phone: formData.emergencyPhone
        },
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies ? formData.allergies.split(',').map((s) => s.trim()).filter(Boolean) : []
      };

      await patientAPI.create(payload);
      showToast('Registration Successful', `Patient ${payload.name} registered.`, 'success');
      setShowAddModal(false);
      fetchPatients();
    } catch (err) {
      showToast('Registration Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        },
        emergencyContact: {
          name: formData.emergencyName,
          relationship: formData.emergencyRelation,
          phone: formData.emergencyPhone
        },
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies ? formData.allergies.split(',').map((s) => s.trim()).filter(Boolean) : []
      };

      await patientAPI.update(selectedPatient._id, payload);
      showToast('Updated Successfully', `Updated patient records for ${payload.name}`, 'success');
      setShowEditModal(false);
      fetchPatients();
    } catch (err) {
      showToast('Update Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      await patientAPI.toggleStatus(selectedPatient._id);
      showToast('Status Changed', `Patient ${selectedPatient.name} status updated`, 'success');
      setConfirmToggleModal(false);
      fetchPatients();
    } catch (err) {
      showToast('Action Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Patient Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Register, search, triage, and manage patient electronic medical records
          </p>
        </div>

        {(role === 'ADMIN' || role === 'FRONT_DESK') && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <UserPlus size={18} />
            <span>Register New Patient</span>
          </button>
        )}
      </div>

      {/* Toolbar & Filters */}
      <div className="table-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '260px' }}>
          <div className="input-addon-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-addon-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search by name, patient ID (PAT-...), phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div className="table-filters">
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Records</option>
            <option value="false">Deactivated Records</option>
          </select>
        </div>
      </div>

      {/* Patients Data Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading patient records...</p>
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients found"
            description="No patient records match the specified search query or active filter."
            action={
              (role === 'ADMIN' || role === 'FRONT_DESK') && (
                <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                  Register Patient
                </button>
              )
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Details</th>
                <th>Gender / Age</th>
                <th>Contact Info</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const birthYear = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear() : null;
                const age = birthYear ? new Date().getFullYear() - birthYear : 'N/A';

                return (
                  <tr key={p._id}>
                    <td>
                      <code style={{ fontWeight: 700, color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)', padding: '2px 6px', borderRadius: '4px' }}>
                        {p.patientId}
                      </code>
                    </td>
                    <td>
                      <div className="table-user">
                        <div className="table-avatar-initials">{p.name.charAt(0)}</div>
                        <div className="table-user-details">
                          <div className="table-user-name">{p.name}</div>
                          <div className="table-user-sub">
                            DOB: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{p.gender}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{age} yrs</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <Phone size={12} color="var(--text-light)" /> {p.phone}
                      </div>
                      {p.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Mail size={12} color="var(--text-light)" /> {p.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                        {p.bloodGroup || 'UNKNOWN'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon"
                          title="View Patient Profile & Medical History"
                          onClick={() => navigate(`/patients/${p._id}`)}
                        >
                          <Eye size={17} />
                        </button>

                        {(role === 'ADMIN' || role === 'FRONT_DESK') && (
                          <button
                            className="btn-icon"
                            title="Edit Patient Information"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}

                        {role === 'ADMIN' && (
                          <button
                            className="btn-icon"
                            style={{ color: p.isActive ? '#ef4444' : '#10b981' }}
                            title={p.isActive ? 'Deactivate Patient' : 'Reactivate Patient'}
                            onClick={() => {
                              setSelectedPatient(p);
                              setConfirmToggleModal(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination pagination={pagination} onPageChange={(newPage) => setPage(newPage)} />
      </div>

      {/* Add / Register Patient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Patient"
        subtitle="A unique medical ID (PAT-YYYY-XXXX) will be assigned automatically"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Patient'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input
                type="text"
                className={`form-input ${formErrors.name ? 'is-invalid' : ''}`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Eleanor Vance"
                required
              />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth <span className="required">*</span></label>
              <input
                type="date"
                className={`form-input ${formErrors.dateOfBirth ? 'is-invalid' : ''}`}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
              />
              {formErrors.dateOfBirth && <span className="form-error">{formErrors.dateOfBirth}</span>}
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Gender <span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number <span className="required">*</span></label>
              <input
                type="tel"
                className={`form-input ${formErrors.phone ? 'is-invalid' : ''}`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0144"
                required
              />
              {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                className="form-select"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="patient@example.com"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input
                type="text"
                className="form-input"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="742 Evergreen Terrace"
              />
            </div>
            <div className="form-group">
              <label className="form-label">City & State</label>
              <input
                type="text"
                className="form-input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Metro City, IL"
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.emergencyName}
                onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                placeholder="Name of contact"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship</label>
              <input
                type="text"
                className="form-input"
                value={formData.emergencyRelation}
                onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                placeholder="Spouse / Parent"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Phone</label>
              <input
                type="tel"
                className="form-input"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                placeholder="+1-555-0145"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Known Drug Allergies (Comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="e.g. Penicillin, Sulfa, Aspirin"
            />
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Patient Information"
        subtitle={`Updating records for ${formData.name}`}
        size="lg"
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
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                className="form-select"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Known Allergies</label>
            <input
              type="text"
              className="form-input"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={confirmToggleModal}
        onClose={() => setConfirmToggleModal(false)}
        onConfirm={handleToggleStatus}
        title={selectedPatient?.isActive ? 'Deactivate Patient Record' : 'Reactivate Patient Record'}
        message={
          selectedPatient?.isActive
            ? `Are you sure you want to deactivate patient record '${selectedPatient?.name}'? They will no longer be available for new bookings.`
            : `Reactivate patient record '${selectedPatient?.name}'?`
        }
        confirmText={selectedPatient?.isActive ? 'Deactivate' : 'Reactivate'}
        danger={selectedPatient?.isActive}
        loading={submitting}
      />
    </div>
  );
};

export default PatientsPage;

