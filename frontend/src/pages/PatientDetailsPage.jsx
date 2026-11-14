import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientAPI, invoiceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import {
  User,
  Calendar,
  FileText,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Stethoscope,
  Pill,
  ArrowLeft,
  Clock,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import '../styles/patient.css';
import '../styles/tables.css';

const PatientDetailsPage = () => {
  const { id } = useParams();
  const { role, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('appointments');
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicalRecordError, setMedicalRecordError] = useState('');

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch patient profile
        const pRes = await patientAPI.getById(id);
        setPatient(pRes.data);

        // 2. Fetch appointment history
        const apptRes = await patientAPI.getAppointments(id);
        setAppointments(apptRes.data);

        // 3. If DOCTOR or ADMIN, attempt fetching restricted medical records
        if (role === 'ADMIN' || role === 'DOCTOR') {
          try {
            const medRes = await patientAPI.getMedicalRecords(id);
            setMedicalRecords(medRes.data);
          } catch (mErr) {
            setMedicalRecordError(mErr.message);
          }
        }

        // 4. If ADMIN or FRONT_DESK, fetch invoices
        if (role === 'ADMIN' || role === 'FRONT_DESK') {
          const invRes = await invoiceAPI.getByPatient(id);
          setInvoices(invRes.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id, role]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Retrieving patient medical chart...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
        <h3 style={{ color: '#b91c1c', fontWeight: 800 }}>Patient Chart Error</h3>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>{error || 'Patient record could not be loaded'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/patients')}>
          <ArrowLeft size={16} /> Return to Patients
        </button>
      </div>
    );
  }

  const birthYear = patient.dateOfBirth ? new Date(patient.dateOfBirth).getFullYear() : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : 'N/A';

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/patients')}>
          <ArrowLeft size={14} /> Back to Patients List
        </button>
      </div>

      {/* Patient Profile Header Card */}
      <div className="patient-profile-header">
        <div className="patient-header-left">
          <div className="patient-big-avatar">{patient.name.charAt(0)}</div>
          <div className="patient-header-meta">
            <h2>{patient.name}</h2>
            <div className="patient-meta-tags">
              <span className="patient-tag">{patient.patientId}</span>
              <span className="patient-tag">{patient.gender} • {age} Years</span>
              <span className="patient-tag">Blood: {patient.bloodGroup || 'UNKNOWN'}</span>
              <span className="patient-tag" style={{ backgroundColor: patient.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
                {patient.isActive ? 'Active Patient' : 'Deactivated'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(role === 'ADMIN' || role === 'FRONT_DESK') && (
            <button
              className="btn btn-teal btn-sm"
              onClick={() => navigate(`/appointments?bookFor=${patient._id}&patientName=${encodeURIComponent(patient.name)}`)}
            >
              <Calendar size={14} /> Schedule Appointment
            </button>
          )}
        </div>
      </div>

      {/* Quick Demographic Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Contact</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>{patient.phone}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>{patient.email || 'None on file'}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency Contact</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>
            {patient.emergencyContact?.name ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship})` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient.emergencyContact?.phone}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: patient.allergies?.length > 0 ? '4px solid #ef4444' : '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Drug Allergies</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px', color: '#b91c1c' }}>
            {patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'No known drug allergies'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Calendar size={16} /> Appointment History ({appointments.length})
        </button>

        {/* Clinical Records Tab (Doctor & Admin only) */}
        {(role === 'DOCTOR' || role === 'ADMIN') && (
          <button
            className={`tab-btn ${activeTab === 'clinical' ? 'active' : ''}`}
            onClick={() => setActiveTab('clinical')}
          >
            <Stethoscope size={16} /> Clinical Encounters & Prescriptions
          </button>
        )}

        {/* Invoices Tab */}
        {(role === 'ADMIN' || role === 'FRONT_DESK') && (
          <button
            className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <CreditCard size={16} /> Invoices & Billing ({invoices.length})
          </button>
        )}
      </div>

      {/* TAB 1: Appointment History */}
      {activeTab === 'appointments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Encounter History</h3>
          </div>

          {appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointment history"
              description="This patient has not yet had any appointments scheduled."
            />
          ) : (
            <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Attending Doctor</th>
                    <th>Department</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {new Date(appt.appointmentDate).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {appt.startTime} - {appt.endTime}
                        </div>
                      </td>
                      <td>
                        <div>{appt.doctorId?.userId?.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {appt.doctorId?.qualification}
                        </div>
                      </td>
                      <td>{appt.departmentId?.name}</td>
                      <td>{appt.reason}</td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Clinical Encounters & Prescriptions (Protected) */}
      {activeTab === 'clinical' && (
        <div>
          {medicalRecordError ? (
            <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#b91c1c', fontWeight: 700 }}>Clinical Privacy Restriction</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {medicalRecordError}
              </p>
            </div>
          ) : (
            <>
              {/* Prescriptions Section */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 className="card-title">Active & Past Prescriptions</h3>
                  <span className="badge badge-info">{medicalRecords?.prescriptions?.length || 0} Issued</span>
                </div>

                {!medicalRecords?.prescriptions || medicalRecords.prescriptions.length === 0 ? (
                  <EmptyState icon={Pill} title="No prescriptions on file" description="No medicinal prescriptions have been generated for this patient." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {medicalRecords.prescriptions.map((rx) => (
                      <div key={rx._id} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: 'var(--bg-surface-alt)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Prescribed by {rx.doctorId?.userId?.name || 'Physician'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rx.createdAt).toLocaleDateString()}</span>
                        </div>
                        {rx.medicines?.map((med, mIdx) => (
                          <div key={mIdx} className="med-item">
                            <div>
                              <div className="med-name">{med.name}</div>
                              <div className="med-dosage">{med.dosage} • {med.duration}</div>
                              {med.instructions && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{med.instructions}</div>}
                            </div>
                            <div className="med-schedule">{med.frequency}</div>
                          </div>
                        ))}
                        {rx.generalInstructions && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                            <strong>Instructions:</strong> {rx.generalInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Visits Notes */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 className="card-title">Doctor Consultation Visits</h3>
                  <span className="badge badge-success">{medicalRecords?.visits?.length || 0} Visits</span>
                </div>

                {!medicalRecords?.visits || medicalRecords.visits.length === 0 ? (
                  <EmptyState icon={Stethoscope} title="No consultation notes" description="No doctor consultation encounters have been logged yet." />
                ) : (
                  <div>
                    {medicalRecords.visits.map((v) => (
                      <div key={v._id} className="encounter-card">
                        <div className="encounter-header">
                          <div>
                            <div className="encounter-doctor">Attending: {v.doctorId?.userId?.name || 'Doctor'}</div>
                            <div className="encounter-date">Visit Date: {new Date(v.visitDate).toLocaleDateString()}</div>
                          </div>
                          {v.followUpDate && (
                            <span className="badge badge-info">
                              Follow-up: {new Date(v.followUpDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Symptoms */}
                        {v.symptoms?.length > 0 && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reported Symptoms</div>
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              {v.symptoms.map((s, sIdx) => (
                                <span key={sIdx} className="badge badge-neutral">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Vitals */}
                        <div className="vitals-grid">
                          <div className="vital-box">
                            <div className="vital-title">Blood Pressure</div>
                            <div className="vital-val">{v.clinicalObservations?.bloodPressure || '--/--'}</div>
                          </div>
                          <div className="vital-box">
                            <div className="vital-title">Pulse Rate</div>
                            <div className="vital-val">{v.clinicalObservations?.pulseRate ? `${v.clinicalObservations.pulseRate} bpm` : '--'}</div>
                          </div>
                          <div className="vital-box">
                            <div className="vital-title">Temperature</div>
                            <div className="vital-val">{v.clinicalObservations?.temperatureF ? `${v.clinicalObservations.temperatureF}°F` : '--'}</div>
                          </div>
                          <div className="vital-box">
                            <div className="vital-title">Weight</div>
                            <div className="vital-val">{v.clinicalObservations?.weightKg ? `${v.clinicalObservations.weightKg} kg` : '--'}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinical Assessment Notes</div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.25rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                            {v.consultationNotes}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnostic Reports Metadata */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Diagnostic Test Reports</h3>
                </div>

                {!medicalRecords?.reports || medicalRecords.reports.length === 0 ? (
                  <EmptyState icon={FileText} title="No diagnostic reports" description="No lab or diagnostic test reports are on file for this patient." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {medicalRecords.reports.map((rep) => (
                      <div key={rep._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rep.reportType}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Date: {new Date(rep.reportDate).toLocaleDateString()} • {rep.fileMetadata?.fileName || 'Electronic Report Document'}
                          </div>
                          {rep.resultsSummary && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              <strong>Findings:</strong> {rep.resultsSummary}
                            </div>
                          )}
                        </div>
                        <span className="badge badge-success">{rep.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: Invoices & Billing */}
      {activeTab === 'billing' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Invoices & Payment Status</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/billing')}>
              <CreditCard size={14} /> Open Invoices Manager
            </button>
          </div>

          {invoices.length === 0 ? (
            <EmptyState icon={CreditCard} title="No invoices issued" description="There are no billing invoices generated for this patient yet." />
          ) : (
            <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Subtotal</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td>${inv.subtotal?.toFixed(2)}</td>
                      <td>${inv.tax?.toFixed(2)}</td>
                      <td><strong>${inv.totalAmount?.toFixed(2)}</strong></td>
                      <td>${(inv.paidAmount || 0).toFixed(2)}</td>
                      <td>
                        <StatusBadge status={inv.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientDetailsPage;

