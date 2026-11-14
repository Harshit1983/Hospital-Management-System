import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Activity,
  ArrowRight,
  Stethoscope,
  Building2,
  FileText
} from 'lucide-react';
import '../styles/dashboard.css';
import '../styles/tables.css';

const DashboardPage = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        if (role === 'DOCTOR') {
          const res = await dashboardAPI.getDoctorStats();
          setDoctorData(res.data);
        } else {
          // ADMIN and FRONT_DESK see high-level hospital metrics
          const res = await dashboardAPI.getAdminStats();
          setAdminData(res.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [role]);

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Clinical Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fetching live database metrics...</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card skeleton" style={{ height: 100 }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
        <h4 style={{ color: '#b91c1c', fontWeight: 700 }}>Unable to load dashboard</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{error}</p>
      </div>
    );
  }

  // --- DOCTOR DASHBOARD VIEW ---
  if (role === 'DOCTOR') {
    const { todayAppointments = [], upcomingAppointments = [], metrics = {} } = doctorData || {};

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Physician Workspace
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Welcome back, <strong>{user?.name}</strong>. Here are your clinical appointments for today.
            </p>
          </div>
          <button className="btn btn-teal" onClick={() => navigate('/appointments')}>
            <Calendar size={16} />
            <span>View Full Schedule</span>
          </button>
        </div>

        {/* Doctor Metrics */}
        <div className="stats-grid">
          <StatsCard
            title="Today's Appointments"
            value={metrics.todayCount || 0}
            icon={Clock}
            theme="blue"
            subtitle="Scheduled today"
          />
          <StatsCard
            title="Upcoming Bookings"
            value={metrics.upcomingCount || 0}
            icon={Calendar}
            theme="teal"
            subtitle="Next 7 days"
          />
          <StatsCard
            title="Completed Visits"
            value={metrics.completedVisits || 0}
            icon={Stethoscope}
            theme="green"
            subtitle="Clinical encounters"
          />
          <StatsCard
            title="Patients Treated"
            value={metrics.uniquePatientsServed || 0}
            icon={Users}
            theme="purple"
            subtitle="Unique medical files"
          />
        </div>

        {/* Today's Encounter Queue */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Today's Patient Encounters</h3>
            <span className="badge badge-info">{todayAppointments.length} Today</span>
          </div>

          {todayAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments scheduled today"
              description="You have no patient consultations scheduled for today's clinic hours."
            />
          ) : (
            <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Patient</th>
                    <th>Gender / Age</th>
                    <th>Reason for Visit</th>
                    <th>Status</th>
                    <th>Clinical Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((appt) => (
                    <tr key={appt._id}>
                      <td>
                        <strong>{appt.startTime} - {appt.endTime}</strong>
                      </td>
                      <td>
                        <div className="table-user">
                          <div className="table-avatar-initials">
                            {appt.patientId?.name?.charAt(0)}
                          </div>
                          <div className="table-user-details">
                            <div className="table-user-name">{appt.patientId?.name}</div>
                            <div className="table-user-sub">{appt.patientId?.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {appt.patientId?.gender} (Blood: {appt.patientId?.bloodGroup || 'N/A'})
                      </td>
                      <td>{appt.reason}</td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td>
                        <button
                          className="btn btn-teal btn-sm"
                          onClick={() => navigate(`/clinical-workspace?appointmentId=${appt._id}&patientId=${appt.patientId?._id}`)}
                        >
                          <Stethoscope size={14} />
                          <span>{appt.status === 'COMPLETED' ? 'View Encounter' : 'Open Encounter'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- ADMIN / FRONT DESK DASHBOARD VIEW ---
  const { stats = {}, charts = {}, recentAppointments = [], recentPatients = [], recentActivities = [] } = adminData || {};

  // Find max monthly appointments for responsive bar chart scaling
  const maxAppointments = Math.max(...(charts.monthlyAppointments?.map(m => m.appointments) || [1]), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Hospital Operations Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Real-time telemetry and database persistence overview
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/patients')}>
            <Users size={16} />
            <span>Manage Patients</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/appointments')}>
            <Calendar size={16} />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* 6 Real Database KPI Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Total Registered Patients"
          value={stats.totalPatients || 0}
          icon={Users}
          theme="blue"
          onClick={() => navigate('/patients')}
        />
        <StatsCard
          title="Active Doctors"
          value={stats.totalDoctors || 0}
          icon={UserCheck}
          theme="teal"
          onClick={() => navigate('/doctors')}
        />
        <StatsCard
          title="Total Appointments"
          value={stats.totalAppointments || 0}
          icon={Calendar}
          theme="purple"
          onClick={() => navigate('/appointments')}
        />
        <StatsCard
          title="Today's Appointments"
          value={stats.todayAppointments || 0}
          icon={Clock}
          theme="green"
          subtitle="Clinical schedule"
        />
        <StatsCard
          title="Total Revenue Received"
          value={`$${Number(stats.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          theme="green"
          subtitle="Simulated payments"
        />
        <StatsCard
          title="Pending Invoices Balance"
          value={`$${Number(stats.pendingAmount || 0).toLocaleString()}`}
          icon={AlertCircle}
          theme="amber"
          subtitle={`${stats.pendingInvoicesCount || 0} open invoices`}
          onClick={() => navigate('/billing')}
        />
      </div>

      {/* Charts Grid: Monthly Appointments Trend & Status Distribution */}
      <div className="dashboard-grid">
        {/* Trend Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Appointment Volume</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Aggregated</span>
          </div>

          <div className="chart-container">
            {charts.monthlyAppointments && charts.monthlyAppointments.length > 0 ? (
              <div className="bar-chart">
                {charts.monthlyAppointments.map((item, idx) => {
                  const heightPercent = Math.max((item.appointments / maxAppointments) * 100, 12);
                  return (
                    <div key={idx} className="bar-col">
                      <div className="bar-fill" style={{ height: `${heightPercent}%` }}>
                        <span className="bar-tooltip">{item.appointments} encounters</span>
                      </div>
                      <span className="bar-label">{item.month.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No historical volume" description="Volume will automatically appear as appointments are recorded." />
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Encounter Status Breakdown</h3>
          </div>

          <div className="distribution-list">
            {(charts.statusDistribution || []).map((s) => {
              const total = stats.totalAppointments || 1;
              const percent = Math.round((s.count / total) * 100);
              const colorClass = s.status?.toLowerCase() || 'booked';

              return (
                <div key={s.status} className="distribution-item">
                  <div className="distribution-header">
                    <span>{s.status}</span>
                    <span>
                      {s.count} ({percent}%)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill ${colorClass}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Tables: Recent Appointments & Activity Logs */}
      <div className="dashboard-grid">
        {/* Recent Appointments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Appointments</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/appointments')}>
              View All
            </button>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date / Slot</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.slice(0, 5).map((appt) => (
                  <tr key={appt._id}>
                    <td>
                      <div className="table-user-name">{appt.patientId?.name}</div>
                      <div className="table-user-sub">{appt.patientId?.patientId}</div>
                    </td>
                    <td>
                      <div>{appt.doctorId?.userId?.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--teal-600)' }}>
                        {appt.departmentId?.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(appt.appointmentDate).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.startTime}</div>
                    </td>
                    <td>
                      <StatusBadge status={appt.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities & Audit Trail */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Audit Trail</h3>
            {role === 'ADMIN' && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/audit-logs')}>
                Full Audit
              </button>
            )}
          </div>

          <div className="activity-list">
            {recentActivities.slice(0, 6).map((log) => (
              <div key={log._id} className="activity-item">
                <div className="activity-icon">
                  <Activity size={16} />
                </div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>{log.userName}</strong> ({log.userRole}): performed <code>{log.action}</code> on {log.entityType}
                  </div>
                  <div className="activity-time">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

