import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Edit2,
  Trash2
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const DepartmentsPage = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({ name: '', description: '', location: '' });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.getAll({ search });
      setDepartments(res.data);
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDepartments();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      showToast('Validation Error', 'Department name and location are required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await departmentAPI.create(formData);
      showToast('Department Added', `Department '${formData.name}' created`, 'success');
      setShowAddModal(false);
      setFormData({ name: '', description: '', location: '' });
      fetchDepartments();
    } catch (err) {
      showToast('Action Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await departmentAPI.update(selectedDept._id, formData);
      showToast('Department Updated', `Department '${formData.name}' updated`, 'success');
      setShowEditModal(false);
      fetchDepartments();
    } catch (err) {
      showToast('Update Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    setSubmitting(true);
    try {
      await departmentAPI.delete(selectedDept._id);
      showToast('Department Deleted', `Department '${selectedDept.name}' removed`, 'success');
      setShowDeleteModal(false);
      fetchDepartments();
    } catch (err) {
      showToast('Delete Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Hospital Departments
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage clinical wings, locations, and doctor assignment structures
          </p>
        </div>

        {role === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => { setFormData({ name: '', description: '', location: '' }); setShowAddModal(true); }}>
            <Plus size={18} />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: 450 }}>
          <div className="input-addon-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-addon-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search departments or wings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {/* Departments Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments found"
            description="Add clinical departments such as Cardiology, Neurology, or Pediatrics."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Physical Location</th>
                <th>Active Physicians</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept._id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{dept.name}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <MapPin size={14} color="var(--primary-500)" />
                      {dept.location}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">
                      <Users size={12} /> {dept.activeDoctorsCount || 0} Doctors
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 320 }}>
                      {dept.description || 'General hospital department'}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={dept.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      {role === 'ADMIN' && (
                        <>
                          <button
                            className="btn-icon"
                            title="Edit Department"
                            onClick={() => {
                              setSelectedDept(dept);
                              setFormData({
                                name: dept.name,
                                description: dept.description || '',
                                location: dept.location
                              });
                              setShowEditModal(true);
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            style={{ color: '#ef4444' }}
                            title="Delete Department"
                            onClick={() => {
                              setSelectedDept(dept);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Department"
        subtitle="Organize hospital clinical specialties and staff wings"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Department Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ophthalmology"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Location / Wing <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Wing B, Level 4"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows="3"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Clinical services and facilities description..."
            />
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Department"
        subtitle={`Updating ${selectedDept?.name}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Department Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows="3"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to remove '${selectedDept?.name}'? Note that departments with active doctors assigned cannot be deleted.`}
        confirmText="Delete Department"
        danger={true}
        loading={submitting}
      />
    </div>
  );
};

export default DepartmentsPage;

