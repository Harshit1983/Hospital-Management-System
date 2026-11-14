import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { appointmentAPI, visitAPI, prescriptionAPI, diagnosticAPI, patientAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import {
  Stethoscope,
  Pill,
  FilePlus,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  HeartPulse,
  Save,
  AlertCircle
} from 'lucide-react';
import '../styles/patient.css';
import '../styles/forms.css';

const ClinicalWorkspacePage = () => {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);

  // Clinical encounter form state
  const [consultationNotes, setConsultationNotes] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    pulseRate: '',
    temperatureF: '',
    weightKg: ''
  });
  const [followUpDate, setFollowUpDate] = useState('');

  // Prescription medicines table state
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: 'Once daily after food', duration: '7 days', instructions: '' }
  ]);
  const [generalRxInstructions, setGeneralRxInstructions] = useState('');

  // Diagnostic Report Metadata state
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticReportType, setDiagnosticReportType] = useState('Comprehensive Metabolic Panel (CMP)');
  const [diagnosticSummary, setDiagnosticSummary] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Fetch doctor's assigned appointments
  const fetchDoctorQueue = async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.getAll({ limit: 50 });
      setAppointments(res.data);

      const targetId = searchParams.get('appointmentId');
      if (targetId) {
        const found = res.data.find((a) => a._id === targetId);
        if (found) {
          handleSelectAppointment(found);
        }
      } else if (res.data.length > 0) {
        handleSelectAppointment(res.data[0]);
      }
    } catch (err) {
      showToast('Error Loading Queue', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue();
  }, []);

  const handleSelectAppointment = async (appt) => {
    setSelectedAppt(appt);
    setConsultationNotes('');
    setSymptomsInput(appt.reason || '');
    try {
      const pRes = await patientAPI.getById(appt.patientId?._id);
      setPatientDetails(pRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' }
    ]);
  };

  const handleRemoveMedicineRow = (index) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleCompleteEncounter = async (e) => {
    e.preventDefault();
    if (!consultationNotes.trim()) {
      showToast('Validation Error', 'Clinical consultation notes are required before completing the encounter', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Visit record (which atomically sets appointment to COMPLETED)
      const visitRes = await visitAPI.create({
        appointmentId: selectedAppt._id,
        patientId: selectedAppt.patientId?._id,
        doctorId: selectedAppt.doctorId?._id,
        consultationNotes: consultationNotes.trim(),
        symptoms: symptomsInput ? symptomsInput.split(',').map(s => s.trim()).filter(Boolean) : [],
        clinicalObservations: {
          bloodPressure: vitals.bloodPressure,
          pulseRate: vitals.pulseRate ? Number(vitals.pulseRate) : null,
          temperatureF: vitals.temperatureF ? Number(vitals.temperatureF) : null,
          weightKg: vitals.weightKg ? Number(vitals.weightKg) : null
        },
        followUpDate: followUpDate || null
      });

      const visitId = visitRes.data._id;

      // 2. If medicines were added, generate prescription
      const validMeds = medicines.filter(m => m.name.trim() && m.dosage.trim());
      if (validMeds.length > 0) {
        await prescriptionAPI.create({
          visitId,
          patientId: selectedAppt.patientId?._id,
          doctorId: selectedAppt.doctorId?._id,
          medicines: validMeds,
          generalInstructions: generalRxInstructions.trim()
        });
      }

      showToast('Encounter Finalized', 'Clinical visit documented and appointment marked completed', 'success');
      fetchDoctorQueue();
    } catch (err) {
      showToast('Encounter Recording Failed', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDiagnosticReport = async (e) => {
    e.preventDefault();
    try {
      await diagnosticAPI.create({
        patientId: selectedAppt.patientId?._id,
        doctorId: selectedAppt.doctorId?._id,
        reportType: diagnosticReportType,
        resultsSummary: diagnosticSummary,
        status: 'REQUESTED'
      });
      showToast('Diagnostic Ordered', `Ordered ${diagnosticReportType}`, 'success');
      setShowDiagnosticModal(false);
      setDiagnosticSummary('');
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Clinical Physician Workspace
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Document patient encounters, vital signs, clinical observations, and itemized prescriptions
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Left Column: Encounter Queue */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <h3 className="card-title">Encounter Queue</h3>
            <span className="badge badge-info">{appointments.length} Total</span>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading patient queue...</p>
          ) : appointments.length === 0 ? (
            <EmptyState icon={Stethoscope} title="No pending encounters" description="No appointments are assigned to your roster." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 600, overflowY: 'auto' }}>
              {appointments.map((appt) => {
                const isSelected = selectedAppt?._id === appt._id;
                return (
                  <div
                    key={appt._id}
                    onClick={() => handleSelectAppointment(appt)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--border-light)',
                      backgroundColor: isSelected ? 'var(--primary-50)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{appt.patientId?.name}</span>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(appt.appointmentDate).toLocaleDateString()} • {appt.startTime} - {appt.endTime}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic' }}>
                      {appt.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Clinical Encounter */}
        <div>
          {selectedAppt ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    Clinical Charting: {selectedAppt.patientId?.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Patient ID: <strong>{selectedAppt.patientId?.patientId}</strong> • Appointment: {selectedAppt.startTime} on {new Date(selectedAppt.appointmentDate).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDiagnosticModal(true)}
                >
                  <FilePlus size={14} /> Order Lab / Diagnostic
                </button>
              </div>

              {/* Patient Allergies Banner */}
              {patientDetails?.allergies?.length > 0 && (
                <div style={{ padding: '0.6rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
                    Patient Allergies: {patientDetails.allergies.join(', ')}
                  </span>
                </div>
              )}

              <form onSubmit={handleCompleteEncounter}>
                {/* Symptoms */}
                <div className="form-group">
                  <label className="form-label">Reported Symptoms (Comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    placeholder="e.g. Chronic headache, photophobia, mild nausea"
                  />
                </div>

                {/* Vitals Grid */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Blood Pressure (mmHg)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="120/80"
                      value={vitals.bloodPressure}
                      onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="72"
                      value={vitals.pulseRate}
                      onChange={(e) => setVitals({ ...vitals, pulseRate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Body Temperature (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="98.6"
                      value={vitals.temperatureF}
                      onChange={(e) => setVitals({ ...vitals, temperatureF: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="70"
                      value={vitals.weightKg}
                      onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
                    />
                  </div>
                </div>

                {/* Doctor Clinical Notes */}
                <div className="form-group">
                  <label className="form-label">
                    Consultation & Examination Notes <span className="required">*</span>
                  </label>
                  <textarea
                    rows="4"
                    className="form-textarea"
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                    placeholder="Document clinical observations, physical exam, diagnosis assessment, and patient instructions..."
                    required
                  />
                </div>

                {/* Follow-up Date */}
                <div className="form-group" style={{ maxWidth: 280 }}>
                  <label className="form-label">Recommended Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={followUpDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>

                {/* Itemized Prescription Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Pill size={16} color="var(--primary-600)" />
                      <span>Itemized Medical Prescription</span>
                    </h4>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddMedicineRow}>
                      <Plus size={14} /> Add Medicine
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {medicines.map((med, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1.5fr 1fr 36px',
                          gap: '0.5rem',
                          alignItems: 'center',
                          backgroundColor: 'var(--bg-surface-alt)',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.4rem' }}
                          placeholder="Medicine (e.g. Amoxicillin)"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.4rem' }}
                          placeholder="Dosage (500mg)"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.4rem' }}
                          placeholder="Frequency (e.g. Twice daily)"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.4rem' }}
                          placeholder="Duration (5 days)"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleRemoveMedicineRow(idx)}
                          disabled={medicines.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">General Pharmacy Instructions</label>
                    <input
                      type="text"
                      className="form-input"
                      value={generalRxInstructions}
                      onChange={(e) => setGeneralRxInstructions(e.target.value)}
                      placeholder="e.g. Take after meals with warm water, complete full course."
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    className="btn btn-teal btn-lg"
                    disabled={submitting || selectedAppt.status === 'COMPLETED'}
                  >
                    <Save size={18} />
                    <span>{submitting ? 'Finalizing Chart...' : 'Sign & Complete Encounter'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Select an appointment from the queue to start consultation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Diagnostic Modal */}
      <Modal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        title="Order Diagnostic Laboratory Test"
        subtitle={`Patient: ${selectedAppt?.patientId?.name}`}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDiagnosticModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddDiagnosticReport}>
              Order Test
            </button>
          </>
        }
      >
        <form onSubmit={handleAddDiagnosticReport}>
          <div className="form-group">
            <label className="form-label">Test / Procedure Type</label>
            <select
              className="form-select"
              value={diagnosticReportType}
              onChange={(e) => setDiagnosticReportType(e.target.value)}
            >
              <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
              <option value="Comprehensive Metabolic Panel (CMP)">Comprehensive Metabolic Panel (CMP)</option>
              <option value="12-Lead Resting Electrocardiogram (ECG)">12-Lead Resting Electrocardiogram (ECG)</option>
              <option value="Chest Radiograph (X-Ray)">Chest Radiograph (X-Ray)</option>
              <option value="Fasting Lipid Profile">Fasting Lipid Profile</option>
              <option value="HbA1c Glycated Hemoglobin">HbA1c Glycated Hemoglobin</option>
              <option value="Urinalysis & Culture">Urinalysis & Culture</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Clinical Indication / Summary</label>
            <textarea
              rows="3"
              className="form-textarea"
              placeholder="Indication for test, special parameters..."
              value={diagnosticSummary}
              onChange={(e) => setDiagnosticSummary(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClinicalWorkspacePage;

