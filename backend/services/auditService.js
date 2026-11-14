const { AuditLog } = require('../models');

/**
 * Creates an audit log entry asynchronously
 * @param {Object} params
 * @param {string|Object} [params.user] User object or ID
 * @param {string} params.action Audit action name
 * @param {string} params.entityType Entity name (e.g. 'Patient', 'Appointment')
 * @param {string} params.entityId Unique ID or MongoDB ID of affected entity
 * @param {Object} [params.details] Context details or metadata
 * @param {string} [params.ipAddress] Client IP address
 */
const logAudit = async ({
  user = null,
  action,
  entityType,
  entityId,
  details = {},
  ipAddress = ''
}) => {
  try {
    let userId = null;
    let userName = 'System';
    let userRole = 'SYSTEM';

    if (user) {
      userId = user._id || user.id || null;
      userName = user.name || 'Unknown User';
      userRole = user.role || 'UNKNOWN';
    }

    const entry = await AuditLog.create({
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId: String(entityId),
      timestamp: new Date(),
      details,
      ipAddress: ipAddress || '127.0.0.1'
    });

    return entry;
  } catch (error) {
    // Fail-safe: Audit failure should not crash core application transactions
    console.error(`[AuditLog Failure] Action: ${action}, Error: ${error.message}`);
    return null;
  }
};

module.exports = {
  logAudit
};

