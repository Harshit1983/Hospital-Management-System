const { AuditLog } = require('../models');
const { successResponse } = require('../utils/apiResponse');

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, userId, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { entityType: { $regex: search, $options: 'i' } },
        { entityId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter)
    ]);

    return successResponse(res, 'Audit logs retrieved', logs, 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};

