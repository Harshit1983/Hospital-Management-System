import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  switch (normalized) {
    // Appointment Statuses
    case 'BOOKED':
      return <span className="badge badge-info">Booked</span>;
    case 'CONFIRMED':
      return <span className="badge badge-success">Confirmed</span>;
    case 'COMPLETED':
      return <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d' }}>Completed</span>;
    case 'CANCELLED':
      return <span className="badge badge-danger">Cancelled</span>;
    case 'NO_SHOW':
      return <span className="badge badge-warning">No Show</span>;

    // Payment Statuses
    case 'PAID':
      return <span className="badge badge-success">Paid</span>;
    case 'PARTIALLY_PAID':
      return <span className="badge badge-warning">Partially Paid</span>;
    case 'PENDING':
      return <span className="badge badge-info">Pending</span>;
    case 'FAILED':
      return <span className="badge badge-danger">Failed</span>;
    case 'REFUNDED':
      return <span className="badge badge-neutral">Refunded</span>;

    // Roles
    case 'ADMIN':
      return <span className="badge" style={{ backgroundColor: 'var(--role-admin-bg)', color: 'var(--role-admin-text)' }}>Admin</span>;
    case 'DOCTOR':
      return <span className="badge" style={{ backgroundColor: 'var(--role-doctor-bg)', color: 'var(--role-doctor-text)' }}>Doctor</span>;
    case 'FRONT_DESK':
      return <span className="badge" style={{ backgroundColor: 'var(--role-frontdesk-bg)', color: 'var(--role-frontdesk-text)' }}>Front Desk</span>;

    // Generic Booleans
    case 'ACTIVE':
    case 'TRUE':
      return <span className="badge badge-success">Active</span>;
    case 'INACTIVE':
    case 'FALSE':
      return <span className="badge badge-neutral">Inactive</span>;

    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
};

export default StatusBadge;

