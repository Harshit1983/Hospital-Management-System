const { Prescription, Doctor, Visit } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS, ROLES } = require('../config/constants');

const createPrescription = async (req, res, next) => {
  try {
    const { visitId, patientId, doctorId, medicines, generalInstructions } = req.body;

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return errorResponse(res, 'Associated clinical visit not found', 404);
    }

    let effectiveDoctorId = doctorId;
    if (req.user.role === ROLES.DOCTOR) {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (!doctorProfile) {
        return errorResponse(res, 'Doctor profile not found', 403);
      }
      effectiveDoctorId = doctorProfile._id;
    }

    const prescription = await Prescription.create({
      visitId,
      patientId,
      doctorId: effectiveDoctorId,
      medicines,
      generalInstructions: generalInstructions || ''
    });

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.PRESCRIPTION_CREATE,
      entityType: 'Prescription',
      entityId: prescription._id,
      details: { visitId, patientId, medicineCount: medicines.length },
      ipAddress: req.ip
    });

    const populated = await Prescription.findById(prescription._id)
      .populate('patientId', 'name patientId phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('visitId');

    return successResponse(res, 'Prescription generated successfully', populated, 201);
  } catch (error) {
    next(error);
  }
};

const getPrescriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id)
      .populate('patientId', 'name patientId phone email gender dateOfBirth')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('visitId');

    if (!prescription) {
      return errorResponse(res, 'Prescription not found', 404);
    }

    return successResponse(res, 'Prescription details retrieved', prescription);
  } catch (error) {
    next(error);
  }
};

const getPrescriptionsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // FRONT_DESK is not allowed to read clinical prescriptions!
    if (req.user.role === ROLES.FRONT_DESK) {
      return errorResponse(res, 'Access denied: FRONT_DESK cannot view clinical prescriptions', 403);
    }

    const prescriptions = await Prescription.find({ patientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ createdAt: -1 });

    return successResponse(res, 'Patient prescriptions retrieved', prescriptions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByPatient
};

