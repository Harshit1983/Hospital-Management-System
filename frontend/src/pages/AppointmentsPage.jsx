import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { appointmentAPI, patientAPI, doctorAPI, departmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  User,
  Stethoscope,
  Building2,
  RefreshCw
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const AppointmentsPage = () => {
  const { role, user, doctorProfile } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [page, setPage] = useState(1);

  // Catalogs for filters and booking wizard
  const [patientsList, setPatientsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);

  // Modals state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 9-Step Booking Wizard State
  const initialWizardState = {
    patientId: searchParams.get('bookFor') || '',
    departmentId: '',
    doctorId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    reason: 'Routine specialist consultation'
  };
  const [wizardData, setWizardData] = useState(initialWizardState);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [rescheduleSlotsList, setRescheduleSlotsList] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {
        date: dateFilter,
        status: statusFilter,
        page,
        limit: 10
      };

      if (doctorFilter) params.doctorId = doctorFilter;

      const res = await appointmentAPI.getAll(params);
      setAppointments(res.data);
      setPagination(res.pagination);
    } catch (err) {
      showToast('Error Loading Appointments', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const [pRes, dRes, docRes] = await Promise.all([
        patientAPI.getAll({ limit: 100, isActive: 'true' }),
        departmentAPI.getAll({ isActive: 'true' }),
        doctorAPI.getAll({ isAvailable: 'true' })
      ]);
      setPatientsList(pRes.data);
      setDepartmentsList(dRes.data);
      setDoctorsList(docRes.data);
    } catch (e) {
      console.error('Failed to load booking catalogs', e);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, dateFilter, statusFilter, doctorFilter]);

  useEffect(() => {
    fetchCatalogs();
    if (searchParams.get('bookFor')) {
      setShowBookingModal(true);
    }
  }, []);

  // Fetch slots whenever doctor and date are chosen in booking wizard
  useEffect(() => {
    if (wizardData.doctorId && wizardData.appointmentDate) {
      fetchSlotsForWizard(wizardData.doctorId, wizardData.appointmentDate);
    } else {
      setAvailableSlots([]);
    }
  }, [wizardData.doctorId, wizardData.appointmentDate]);

  const fetchSlotsForWizard = async (docId, date) => {
    setLoadingSlots(true);
    try {
      const res = await appointmentAPI.getSlots(docId, date);
      setAvailableSlots(res.data?.slots || []);
    } catch (err) {
      showToast('Doctor Schedule Notice', err.message, 'warning');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Fetch slots for reschedule modal
  const fetchRescheduleSlots = async (docId, date) => {
    setLoadingRescheduleSlots(true);
    try {
      const res = await appointmentAPI.getSlots(docId, date);
      setRescheduleSlotsList(res.data?.slots || []);
    } catch (err) {
      showToast('Schedule Notice', err.message, 'warning');
      setRescheduleSlotsList([]);
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!wizardData.patientId || !wizardData.doctorId || !wizardData.startTime) {
      showToast('Incomplete Booking', 'Please select patient, doctor, and an available slot', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await appointmentAPI.book(wizardData);
      showToast('Appointment Confirmed', `Booked for ${wizardData.appointmentDate} at ${wizardData.startTime}`, 'success');
      setShowBookingModal(false);
      setWizardData(initialWizardState);
      fetchAppointments();
    } catch (err) {
      showToast('Booking Conflict', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReschedule = (appt) => {
    setSelectedAppointment(appt);
    const initialDate = new Date(appt.appointmentDate).toISOString().split('T')[0];
    setRescheduleDate(initialDate);
    setRescheduleSlot(null);
    setShowRescheduleModal(true);
    fetchRescheduleSlots(appt.doctorId?._id, initialDate);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSlot) {
      showToast('Selection Required', 'Please choose a new available time slot', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await appointmentAPI.reschedule(selectedAppointment._id, {
        newDate: rescheduleDate,
        newStartTime: rescheduleSlot.startTime,
        newEndTime: rescheduleSlot.endTime,
        reason: 'Patient reschedule request'
      });
      showToast('Rescheduled', `Appointment moved to ${rescheduleDate} at ${rescheduleSlot.startTime}`, 'success');
      setShowRescheduleModal(false);
      fetchAppointments();
    } catch (err) {
      showToast('Conflict', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!selectedAppointment) return;
    setSubmitting(true);
    try {
      await appointmentAPI.cancel(selectedAppointment._id, {
        reason: cancelReason || 'Cancelled by staff/patient'
      });
      showToast('Cancelled', 'Appointment cancelled and time slot freed', 'info');
      setShowCancelModal(false);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      showToast('Cancellation Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await appointmentAPI.updateStatus(apptId, newStatus);
      showToast('Status Updated', `Appointment marked as ${newStatus}`, 'success');
      fetchAppointments();
    } catch (err) {
      showToast('Update Failed', err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Appointment Scheduling
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Atomic slot reservation, multi-specialty scheduling, and race-condition protected bookings
          </p>
        </div>

        {(role === 'ADMIN' || role === 'FRONT_DESK' || role === 'DOCTOR') && (
          <button className="btn btn-primary" onClick={() => setShowBookingModal(true)}>
            <Plus size={18} />
            <span>Book New Appointment</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="table-toolbar">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto' }}
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>

          {role !== 'DOCTOR' && (
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={doctorFilter}
              onChange={(e) => { setDoctorFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Physicians</option>
              {doctorsList.map((d) => (
                <option key={d._id} value={d._id}>Dr. {d.userId?.name} ({d.specialization})</option>
              ))}
            </select>
          )}

          {(dateFilter || statusFilter || doctorFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setDateFilter(''); setStatusFilter(''); setDoctorFilter(''); setPage(1); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Retrieving appointments from database...</p>
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="No scheduled clinical appointments match the selected date or status criteria."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setShowBookingModal(true)}>
                Book Appointment
              </button>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Physician & Specialty</th>
                <th>Encounter Date & Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt._id}>
                  <td>
                    <div className="table-user">
                      <div className="table-avatar-initials">
                        {appt.patientId?.name?.charAt(0) || 'P'}
                      </div>
                      <div className="table-user-details">
                        <div className="table-user-name">{appt.patientId?.name}</div>
                        <div className="table-user-sub">
                          {appt.patientId?.patientId} • {appt.patientId?.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{appt.doctorId?.userId?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--teal-700)' }}>
                      {appt.doctorId?.specialization}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                      {appt.departmentId?.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} color="var(--primary-500)" />
                      {new Date(appt.appointmentDate).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={13} color="var(--text-light)" />
                      {appt.startTime} - {appt.endTime}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', maxWidth: 220, lineHeight: 1.3 }}>
                      {appt.reason}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={appt.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      {/* Reschedule Button */}
                      {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (role === 'ADMIN' || role === 'FRONT_DESK') && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Reschedule Appointment"
                          onClick={() => handleOpenReschedule(appt)}
                        >
                          <RefreshCw size={13} />
                          <span>Reschedule</span>
                        </button>
                      )}

                      {/* Cancel Button */}
                      {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          title="Cancel Slot"
                          onClick={() => {
                            setSelectedAppointment(appt);
                            setShowCancelModal(true);
                          }}
                        >
                          <XCircle size={13} />
                          <span>Cancel</span>
                        </button>
                      )}

                      {/* Mark Completed shortcut for doctors/admin */}
                      {appt.status === 'CONFIRMED' && (role === 'DOCTOR' || role === 'ADMIN') && (
                        <button
                          className="btn btn-teal btn-sm"
                          title="Mark Encounter Completed"
                          onClick={() => handleStatusChange(appt._id, 'COMPLETED')}
                        >
                          <CheckCircle size={13} />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {/* 9-Step Booking Wizard Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="Interactive Appointment Booking Wizard"
        subtitle="Step-by-step real-time slot verification & anti-double-booking guarantee"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowBookingModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleBookingSubmit}
              disabled={submitting || !wizardData.startTime}
            >
              {submitting ? 'Verifying & Booking...' : 'Confirm & Save Booking'}
            </button>
          </>
        }
      >
        <form onSubmit={handleBookingSubmit}>
          {/* Step 1: Select Patient */}
          <div className="form-group">
            <label className="form-label">Step 1: Select Patient <span className="required">*</span></label>
            <select
              className="form-select"
              value={wizardData.patientId}
              onChange={(e) => setWizardData({ ...wizardData, patientId: e.target.value })}
              required
            >
              <option value="">-- Choose Registered Patient --</option>
              {patientsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.patientId}) - Phone: {p.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            {/* Step 2: Select Department */}
            <div className="form-group">
              <label className="form-label">Step 2: Department <span className="required">*</span></label>
              <select
                className="form-select"
                value={wizardData.departmentId}
                onChange={(e) => {
                  setWizardData({ ...wizardData, departmentId: e.target.value, doctorId: '' });
                }}
                required
              >
                <option value="">-- Select Specialty Wing --</option>
                {departmentsList.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} ({d.location})</option>
                ))}
              </select>
            </div>

            {/* Step 3: Select Doctor */}
            <div className="form-group">
              <label className="form-label">Step 3: Attending Physician <span className="required">*</span></label>
              <select
                className="form-select"
                value={wizardData.doctorId}
                onChange={(e) => {
                  const doc = doctorsList.find(d => d._id === e.target.value);
                  setWizardData({
                    ...wizardData,
                    doctorId: e.target.value,
                    departmentId: doc?.departmentId?._id || wizardData.departmentId
                  });
                }}
                required
              >
                <option value="">-- Choose Doctor --</option>
                {doctorsList
                  .filter((d) => !wizardData.departmentId || d.departmentId?._id === wizardData.departmentId)
                  .map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.userId?.name} ({d.specialization}) - ${d.consultationFee}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Step 4: Select Date */}
          <div className="form-group">
            <label className="form-label">Step 4: Appointment Date <span className="required">*</span></label>
            <input
              type="date"
              className="form-input"
              value={wizardData.appointmentDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setWizardData({ ...wizardData, appointmentDate: e.target.value, startTime: '', endTime: '' })}
              required
            />
          </div>

          {/* Step 5 & 6: Available Time Slots Chips */}
          <div className="form-group">
            <label className="form-label">
              Step 5 & 6: Select Available Time Slot <span className="required">*</span>
            </label>
            {loadingSlots ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating doctor schedule & checking conflicting slots...</p>
            ) : availableSlots.length === 0 ? (
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                No active slots scheduled for this doctor on this day. Please pick another date or doctor.
              </div>
            ) : (
              <div className="slots-grid">
                {availableSlots.map((slot, idx) => (
                  <button
                    type="button"
                    key={idx}
                    disabled={!slot.isAvailable}
                    className={`slot-chip ${wizardData.startTime === slot.startTime ? 'selected' : ''}`}
                    onClick={() => setWizardData({ ...wizardData, startTime: slot.startTime, endTime: slot.endTime })}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 7: Reason for Encounter */}
          <div className="form-group">
            <label className="form-label">Step 7: Reason for Visit <span className="required">*</span></label>
            <textarea
              rows="2"
              className="form-textarea"
              value={wizardData.reason}
              onChange={(e) => setWizardData({ ...wizardData, reason: e.target.value })}
              placeholder="Symptoms, referral notes, or follow-up reason..."
              required
            />
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Appointment"
        subtitle={`Patient: ${selectedAppointment?.patientId?.name} • Doctor: ${selectedAppointment?.doctorId?.userId?.name}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRescheduleSubmit}
              disabled={submitting || !rescheduleSlot}
            >
              {submitting ? 'Validating...' : 'Confirm New Slot'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Select New Date</label>
          <input
            type="date"
            className="form-input"
            value={rescheduleDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setRescheduleDate(e.target.value);
              setRescheduleSlot(null);
              fetchRescheduleSlots(selectedAppointment?.doctorId?._id, e.target.value);
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Select Available Slot</label>
          {loadingRescheduleSlots ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Checking slots...</p>
          ) : rescheduleSlotsList.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No slots available on this date.</p>
          ) : (
            <div className="slots-grid">
              {rescheduleSlotsList.map((slot, idx) => (
                <button
                  type="button"
                  key={idx}
                  disabled={!slot.isAvailable}
                  className={`slot-chip ${rescheduleSlot?.startTime === slot.startTime ? 'selected' : ''}`}
                  onClick={() => setRescheduleSlot(slot)}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
        subtitle="Cancelling will immediately release this time slot back to the clinic pool"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)} disabled={submitting}>
              Keep Appointment
            </button>
            <button className="btn btn-danger" onClick={handleCancelSubmit} disabled={submitting}>
              {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Cancellation Reason <span className="required">*</span></label>
          <textarea
            rows="3"
            className="form-textarea"
            placeholder="e.g. Patient travel delay, illness resolved, scheduling conflict..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentsPage;

