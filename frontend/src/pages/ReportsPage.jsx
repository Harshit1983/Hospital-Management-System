import React, { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import '../styles/tables.css';

const ReportsPage = () => {
  const { showToast } = useToast();

  const [activeReport, setActiveReport] = useState('appointments');
  const [groupBy, setGroupBy] = useState('daily');
  const [appointmentsReport, setAppointmentsReport] = useState([]);
  const [revenueReport, setRevenueReport] = useState(null);
  const [pendingReport, setPendingReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeReport === 'appointments') {
        const res = await reportAPI.getAppointments({ groupBy });
        setAppointmentsReport(res.data);
      } else if (activeReport === 'revenue') {
        const res = await reportAPI.getRevenue();
        setRevenueReport(res.data);
      } else if (activeReport === 'pending') {
        const res = await reportAPI.getPendingInvoices();
        setPendingReport(res.data);
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeReport, groupBy]);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Hospital Reports & Analytics
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Aggregated analytics, physician volume, financial revenue, and outstanding invoices
        </p>
      </div>

      {/* Report Sub-Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeReport === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveReport('appointments')}
        >
          <Calendar size={16} /> Appointment Statistics
        </button>
        <button
          className={`tab-btn ${activeReport === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveReport('revenue')}
        >
          <DollarSign size={16} /> Financial Revenue
        </button>
        <button
          className={`tab-btn ${activeReport === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveReport('pending')}
        >
          <AlertCircle size={16} /> Pending Invoices Ledger
        </button>
      </div>

      {/* APPOINTMENTS REPORT */}
      {activeReport === 'appointments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Appointment Aggregation Metrics</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="daily">Daily Encounters</option>
                <option value="doctor">Physician Breakdown</option>
                <option value="department">Department Breakdown</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>Running aggregation queries on MongoDB...</p>
            </div>
          ) : appointmentsReport.length === 0 ? (
            <EmptyState icon={BarChart3} title="No statistics available" description="No appointments match this grouping." />
          ) : (
            <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  {groupBy === 'daily' && (
                    <tr>
                      <th>Date</th>
                      <th>Total Booked</th>
                      <th>Completed Visits</th>
                      <th>Cancelled</th>
                    </tr>
                  )}
                  {groupBy === 'doctor' && (
                    <tr>
                      <th>Doctor Name</th>
                      <th>Doctor ID</th>
                      <th>Specialization</th>
                      <th>Total Appointments</th>
                      <th>Completed</th>
                    </tr>
                  )}
                  {groupBy === 'department' && (
                    <tr>
                      <th>Department Name</th>
                      <th>Location</th>
                      <th>Total Appointments</th>
                      <th>Completed</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {appointmentsReport.map((row, idx) => (
                    <tr key={idx}>
                      {groupBy === 'daily' && (
                        <>
                          <td><strong>{row._id}</strong></td>
                          <td>{row.total} encounters</td>
                          <td><span className="badge badge-success">{row.completed}</span></td>
                          <td><span className="badge badge-danger">{row.cancelled}</span></td>
                        </>
                      )}
                      {groupBy === 'doctor' && (
                        <>
                          <td><strong>{row.doctorName}</strong></td>
                          <td><code>{row.doctorId}</code></td>
                          <td>{row.specialization}</td>
                          <td><strong>{row.totalAppointments}</strong></td>
                          <td><span className="badge badge-success">{row.completedCount}</span></td>
                        </>
                      )}
                      {groupBy === 'department' && (
                        <>
                          <td><strong>{row.departmentName}</strong></td>
                          <td>{row.location}</td>
                          <td><strong>{row.totalAppointments}</strong></td>
                          <td><span className="badge badge-success">{row.completedCount}</span></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REVENUE REPORT */}
      {activeReport === 'revenue' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Revenue Collected</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success-text)', marginTop: '4px' }}>
                ${Number(revenueReport?.totalRevenue || 0).toLocaleString()}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Transactions</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {revenueReport?.totalTransactions || 0}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Monthly Breakdown */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Monthly Revenue Stream</h3>
              </div>
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Revenue</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revenueReport?.monthlyBreakdown || []).map((m, idx) => (
                      <tr key={idx}>
                        <td><strong>{m._id}</strong></td>
                        <td style={{ color: 'var(--success-text)', fontWeight: 700 }}>${m.revenue.toFixed(2)}</td>
                        <td>{m.transactionCount} payments</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Payment Method Share</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {(revenueReport?.paymentMethodBreakdown || []).map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-md)' }}>
                    <span><strong>{m._id}</strong></span>
                    <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                      ${m.totalAmount.toFixed(2)} ({m.count} txns)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PENDING INVOICES REPORT */}
      {activeReport === 'pending' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Unreconciled Outstanding Balances</h3>
              <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
                Total Outstanding: ${pendingReport?.totalOutstanding?.toFixed(2) || '0.00'} across {pendingReport?.count || 0} invoices
              </span>
            </div>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(pendingReport?.invoices || []).map((inv) => (
                  <tr key={inv._id}>
                    <td><code>{inv.invoiceNumber}</code></td>
                    <td>{inv.patientId?.name} ({inv.patientId?.phone})</td>
                    <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td>${inv.totalAmount?.toFixed(2)}</td>
                    <td>
                      <strong style={{ color: '#ef4444' }}>
                        ${(inv.totalAmount - (inv.paidAmount || 0)).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

