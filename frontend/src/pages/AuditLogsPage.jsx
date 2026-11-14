import React, { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Activity,
  User,
  Clock
} from 'lucide-react';
import '../styles/tables.css';
import '../styles/forms.css';

const AuditLogsPage = () => {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditAPI.getLogs({
        action: actionFilter,
        entityType: entityFilter,
        search,
        page,
        limit: 15
      });
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      showToast('Error Loading Audit Trails', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Security & Compliance Audit Logs
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Immutable traceability log for clinical access, appointment scheduling, and patient record alterations
        </p>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <div className="input-addon-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="input-addon-icon" />
            <input
              type="text"
              className="form-input input-with-icon"
              placeholder="Search by user name, action, or entity ID..."
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
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Audited Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="PATIENT_CREATE">PATIENT_CREATE</option>
            <option value="PATIENT_UPDATE">PATIENT_UPDATE</option>
            <option value="PATIENT_RECORD_ACCESS">PATIENT_RECORD_ACCESS</option>
            <option value="APPOINTMENT_BOOK">APPOINTMENT_BOOK</option>
            <option value="APPOINTMENT_RESCHEDULE">APPOINTMENT_RESCHEDULE</option>
            <option value="APPOINTMENT_CANCEL">APPOINTMENT_CANCEL</option>
            <option value="VISIT_CREATE">VISIT_CREATE</option>
            <option value="PRESCRIPTION_CREATE">PRESCRIPTION_CREATE</option>
            <option value="INVOICE_CREATE">INVOICE_CREATE</option>
            <option value="PAYMENT_RECORD">PAYMENT_RECORD</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Entity Types</option>
            <option value="Patient">Patient</option>
            <option value="Appointment">Appointment</option>
            <option value="Visit">Visit</option>
            <option value="Prescription">Prescription</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="User">User</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Retrieving audit ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No audit entries found"
            description="No compliance audit records match the current filter."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity Target</th>
                <th>Client IP</th>
                <th style={{ textAlign: 'right' }}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <strong>{log.userName}</strong>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {log.userRole}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontWeight: 700, color: 'var(--primary-700)', backgroundColor: 'var(--primary-50)', padding: '2px 6px', borderRadius: '4px' }}>
                      {log.action}
                    </code>
                  </td>
                  <td>
                    <div>{log.entityType}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>
                      ID: {log.entityId}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Audit Log Metadata Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Audit Trail Details & Metadata"
        subtitle={`Action: ${selectedLog?.action} • Target: ${selectedLog?.entityType}`}
        size="md"
        footer={
          <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </button>
        }
      >
        {selectedLog && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</span>
                <div style={{ fontWeight: 600 }}>{new Date(selectedLog.timestamp).toISOString()}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operator</span>
                <div style={{ fontWeight: 600 }}>{selectedLog.userName} ({selectedLog.userRole})</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entity Type & ID</span>
                <div style={{ fontWeight: 600 }}>{selectedLog.entityType} ({selectedLog.entityId})</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client IP Address</span>
                <div style={{ fontWeight: 600 }}>{selectedLog.ipAddress || '127.0.0.1'}</div>
              </div>
            </div>

            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Recorded Context Details</h5>
            <pre
              style={{
                backgroundColor: 'var(--bg-surface-alt)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                overflowX: 'auto',
                border: '1px solid var(--border-light)'
              }}
            >
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogsPage;

