const { DiagnosticReport } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS, ROLES } = require('../config/constants');

const createDiagnosticReport = async (req, res, next) => {
  try {
    const { visitId, patientId, doctorId, reportType, fileMetadata, resultsSummary, status } = req.body;

    const report = await DiagnosticReport.create({
      visitId: visitId || null,
      patientId,
      doctorId: doctorId || null,
      reportType: reportType.trim(),
      fileMetadata: fileMetadata || {},
      resultsSummary: resultsSummary ? resultsSummary.trim() : '',
      status: status || 'PENDING'
    });

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.DIAGNOSTIC_REPORT_CREATE,
      entityType: 'DiagnosticReport',
      entityId: report._id,
      details: { patientId, reportType },
      ipAddress: req.ip
    });

    return successResponse(res, 'Diagnostic report metadata added successfully', report, 201);
  } catch (error) {
    next(error);
  }
};

const getReportsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === ROLES.FRONT_DESK) {
      return errorResponse(res, 'Access denied: FRONT_DESK cannot view diagnostic lab reports', 403);
    }

    const reports = await DiagnosticReport.find({ patientId })
      .populate('doctorId', 'qualification specialization')
      .sort({ reportDate: -1 });

    return successResponse(res, 'Patient diagnostic reports retrieved', reports);
  } catch (error) {
    next(error);
  }
};

const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resultsSummary, fileMetadata } = req.body;

    const report = await DiagnosticReport.findById(id);
    if (!report) {
      return errorResponse(res, 'Diagnostic report not found', 404);
    }

    if (status) report.status = status;
    if (resultsSummary !== undefined) report.resultsSummary = resultsSummary;
    if (fileMetadata) report.fileMetadata = { ...report.fileMetadata, ...fileMetadata };

    await report.save();

    await logAudit({
      user: req.user,
      action: 'DIAGNOSTIC_REPORT_UPDATE',
      entityType: 'DiagnosticReport',
      entityId: report._id,
      details: { newStatus: status },
      ipAddress: req.ip
    });

    return successResponse(res, 'Diagnostic report updated', report);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDiagnosticReport,
  getReportsByPatient,
  updateReportStatus
};

