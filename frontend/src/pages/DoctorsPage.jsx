import React, { useState, useEffect } from 'react';
import { doctorAPI, departmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import {
  UserCheck,
  UserPlus,
  Search,
  Calendar,
  Clock,
  DollarSign,
  Award,
  CheckCircle,
  XCircle,
  Edit2
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const DoctorsPage = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Doctor Form state
  const initialDoctorState = {
    name: '',
    email: '',
    password: 'Hospital@123',
    specialization: '',
    departmentId: '',
    qualification: '',
    experienceYears: 5,
    consultationFee: 100
  };
  const [formData, setFormData] = useState(initialDoctorState);

  const fetchDoctorsAndDepts = async () => {
    setLoading(true);
    try {
      const [docRes, deptRes] = await Promise.all([
        doctorAPI.getAll({ search, departmentId: deptFilter }),
        departmentAPI.getAll({ isActive: 'true' })
      ]);
      setDoctors(docRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndDepts();
  }, [deptFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctorsAndDepts();
  };

  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await doctorAPI.create(formData);
      showToast('Doctor Added', `Dr. ${formData.name} added to staff.`, 'success');
      setShowAddModal(false);
      setFormData(initialDoctorState);
      fetchDoctorsAndDepts();
    } catch (err) {
      showToast('Registration Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (doctor) => {
    try {
      await doctorAPI.toggleAvailability(doctor._id);
      showToast('Availability Updated', `Dr. ${doctor.userId?.name} is now ${!doctor.isAvailable ? 'available' : 'unavailable'}`, 'info');
      fetchDoctorsAndDepts();
    } catch (err) {
      showToast('Action Failed', err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Medical Staff & Doctors
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Physician credentials, specializations, consulting fees, and weekly clinic schedules
          </p>
        </div>

        {role === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} />
            <span>Add New Physician</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="table-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <div className="input-addon-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-addon-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search by doctor name, ID, or specialization..."
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
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid / Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading doctor profiles...</p>
          </div>
        ) : doctors.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No physicians found"
            description="No doctors match the selected department or search filter."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor ID</th>
                <th>Physician Details</th>
                <th>Department</th>
                <th>Consultation Fee</th>
                <th>Experience</th>
                <th>Availability</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc._id}>
                  <td>
                    <code style={{ fontWeight: 700, color: 'var(--teal-700)', backgroundColor: 'var(--teal-50)', padding: '2px 6px', borderRadius: '4px' }}>
                      {doc.doctorId}
                    </code>
                  </td>
                  <td>
                    <div className="table-user">
                      <div className="table-avatar-initials" style={{ backgroundColor: 'var(--teal-100)', color: 'var(--teal-700)' }}>
                        {doc.userId?.name?.charAt(0) || 'D'}
                      </div>
                      <div className="table-user-details">
                        <div className="table-user-name">{doc.userId?.name}</div>
                        <div className="table-user-sub" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>
                          {doc.specialization}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                          {doc.qualification}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{doc.departmentId?.name}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {doc.departmentId?.location}
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--success-text)', fontSize: '0.95rem' }}>
                      ${doc.consultationFee}
                    </strong>
                  </td>
                  <td>{doc.experienceYears} Years</td>
                  <td>
                    <span
                      className={`badge ${doc.isAvailable ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => (role === 'ADMIN' || doc.userId?._id === doc.userId?._id) && handleToggleAvailability(doc)}
                      title="Click to toggle availability"
                    >
                      {doc.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setShowScheduleModal(true);
                        }}
                      >
                        <Clock size={13} />
                        <span>Schedule</span>
                      </button>

                      {role === 'ADMIN' && (
                        <button
                          className="btn-icon"
                          title="Toggle Doctor Availability"
                          onClick={() => handleToggleAvailability(doc)}
                        >
                          {doc.isAvailable ? <XCircle size={16} color="#ef4444" /> : <CheckCircle size={16} color="#10b981" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Working Schedule Inspection Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={`Weekly Clinic Hours - Dr. ${selectedDoctor?.userId?.name}`}
        subtitle={`Specialization: ${selectedDoctor?.specialization} • Department: ${selectedDoctor?.departmentId?.name}`}
        size="md"
        footer={
          <button className="btn btn-primary" onClick={() => setShowScheduleModal(false)}>
            Close Schedule
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {selectedDoctor?.workingSchedule?.map((sched, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: sched.isActive ? 'var(--bg-surface-alt)' : 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)'
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{sched.day}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} color="var(--text-light)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-700)' }}>
                  {sched.startTime} - {sched.endTime}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                  {sched.slotDurationMinutes || 30} min slots
                </span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Add Physician Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Physician to Medical Staff"
        subtitle="Generates user credentials and links doctor specialization catalog"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddDoctorSubmit} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Physician'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddDoctorSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. Alexander Flemming"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="doctor.name@hospital.demo"
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Specialization <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Pediatric Pulmonologist"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department <span className="required">*</span></label>
              <select
                className="form-select"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} ({d.location})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Qualification <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="MBBS, MD, FRCS"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Consultation Fee ($) <span className="required">*</span></label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Experience (Years)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Initial System Password</label>
            <input
              type="text"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DoctorsPage;

