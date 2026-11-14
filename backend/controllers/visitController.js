const { Visit, Appointment, Doctor } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS, APPOINTMENT_STATUS, ROLES } = require('../config/constants');

const createVisit = async (req, res, next) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      consultationNotes,
      symptoms,
      clinicalObservations,
      followUpDate
    } = req.body;

    // Verify appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return errorResponse(res, 'Associated appointment not found', 404);
    }

    // Role check: If DOCTOR, verify doctor owns this appointment
    let effectiveDoctorId = doctorId;
    if (req.user.role === ROLES.DOCTOR) {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (!doctorProfile) {
        return errorResponse(res, 'Doctor profile not found', 403);
      }
      effectiveDoctorId = doctorProfile._id;

      if (appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        return errorResponse(res, 'Access denied: You cannot document visits for other doctors appointments', 403);
      }
    }

    // Check if visit already exists for this appointment
    const existingVisit = await Visit.findOne({ appointmentId });
    if (existingVisit) {
      return errorResponse(res, 'A clinical visit record has already been documented for this appointment', 409);
    }

    const visit = await Visit.create({
      appointmentId,
      patientId,
      doctorId: effectiveDoctorId,
      consultationNotes: consultationNotes.trim(),
      symptoms: symptoms || [],
      clinicalObservations: clinicalObservations || {},
      visitDate: new Date(),
      followUpDate: followUpDate ? new Date(followUpDate) : null
    });

    // Mark appointment as COMPLETED
    appointment.status = APPOINTMENT_STATUS.COMPLETED;
    await appointment.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.VISIT_CREATE,
      entityType: 'Visit',
      entityId: visit._id,
      details: { appointmentId, patientId, doctorId: effectiveDoctorId },
      ipAddress: req.ip
    });

    const populated = await Visit.findById(visit._id)
      .populate('patientId', 'name patientId phone dateOfBirth gender')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('appointmentId');

    return successResponse(res, 'Clinical visit recorded and appointment marked as completed', populated, 201);
  } catch (error) {
    next(error);
  }
};

const getVisitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await Visit.findById(id)
      .populate('patientId', 'name patientId phone email dateOfBirth gender bloodGroup allergies')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('appointmentId');

    if (!visit) {
      return errorResponse(res, 'Visit record not found', 404);
    }

    return successResponse(res, 'Visit details retrieved', visit);
  } catch (error) {
    next(error);
  }
};

const updateVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { consultationNotes, symptoms, clinicalObservations, followUpDate } = req.body;

    const visit = await Visit.findById(id);
    if (!visit) {
      return errorResponse(res, 'Visit record not found', 404);
    }

    if (consultationNotes) visit.consultationNotes = consultationNotes.trim();
    if (symptoms) visit.symptoms = symptoms;
    if (clinicalObservations) visit.clinicalObservations = { ...visit.clinicalObservations, ...clinicalObservations };
    if (followUpDate !== undefined) visit.followUpDate = followUpDate ? new Date(followUpDate) : null;

    await visit.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.VISIT_UPDATE,
      entityType: 'Visit',
      entityId: visit._id,
      details: { visitId: visit._id },
      ipAddress: req.ip
    });

    return successResponse(res, 'Visit record updated successfully', visit);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVisit,
  getVisitById,
  updateVisit
};

