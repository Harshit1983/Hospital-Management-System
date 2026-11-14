const { Patient, Appointment, Visit, Prescription, DiagnosticReport, Doctor } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS, ROLES } = require('../config/constants');

/**
 * Generate sequential patient ID: PAT-YYYY-XXXX
 */
const generatePatientId = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Patient.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  return `PAT-${currentYear}-${sequence}`;
};

const getAllPatients = async (req, res, next) => {
  try {
    const { search, gender, isActive, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (gender) filter.gender = gender.toUpperCase();

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [patients, total] = await Promise.all([
      Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Patient.countDocuments(filter)
    ]);

    return successResponse(res, 'Patients retrieved successfully', patients, 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) {
      return errorResponse(res, 'Patient not found', 404);
    }

    // Role check: If DOCTOR, check whether doctor has an encounter/appointment with this patient
    if (req.user.role === ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return errorResponse(res, 'Doctor profile not found', 403);
      }

      const hasAppointment = await Appointment.exists({
        patientId: patient._id,
        doctorId: doctor._id
      });

      if (!hasAppointment) {
        return errorResponse(
          res,
          'Access restricted: You may only access patients who have an appointment scheduled or completed with you',
          403
        );
      }
    }

    // Log record access audit
    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.PATIENT_RECORD_ACCESS,
      entityType: 'Patient',
      entityId: patient._id,
      details: { patientId: patient.patientId, name: patient.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Patient details retrieved', patient);
  } catch (error) {
    next(error);
  }
};

const createPatient = async (req, res, next) => {
  try {
    const {
      name,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      emergencyContact,
      bloodGroup,
      allergies
    } = req.body;

    const patientId = await generatePatientId();

    const patient = await Patient.create({
      patientId,
      name: name.trim(),
      dateOfBirth,
      gender: gender.toUpperCase(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : '',
      address: address || {},
      emergencyContact: emergencyContact || {},
      bloodGroup: bloodGroup || 'UNKNOWN',
      allergies: allergies || [],
      isActive: true
    });

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.PATIENT_CREATE,
      entityType: 'Patient',
      entityId: patient._id,
      details: { patientId: patient.patientId, name: patient.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Patient registered successfully', patient, 201);
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      emergencyContact,
      bloodGroup,
      allergies
    } = req.body;

    const patient = await Patient.findById(id);
    if (!patient) {
      return errorResponse(res, 'Patient not found', 404);
    }

    if (name) patient.name = name.trim();
    if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
    if (gender) patient.gender = gender.toUpperCase();
    if (phone) patient.phone = phone.trim();
    if (email !== undefined) patient.email = email.toLowerCase().trim();
    if (address) patient.address = { ...patient.address, ...address };
    if (emergencyContact) patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (allergies) patient.allergies = allergies;

    await patient.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.PATIENT_UPDATE,
      entityType: 'Patient',
      entityId: patient._id,
      details: { patientId: patient.patientId, updatedFields: req.body },
      ipAddress: req.ip
    });

    return successResponse(res, 'Patient details updated successfully', patient);
  } catch (error) {
    next(error);
  }
};

const togglePatientActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) {
      return errorResponse(res, 'Patient not found', 404);
    }

    patient.isActive = !patient.isActive;
    await patient.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.PATIENT_DEACTIVATE,
      entityType: 'Patient',
      entityId: patient._id,
      details: { patientId: patient.patientId, isActive: patient.isActive },
      ipAddress: req.ip
    });

    return successResponse(
      res,
      `Patient record ${patient.isActive ? 'activated' : 'deactivated'} safely`,
      patient
    );
  } catch (error) {
    next(error);
  }
};

const getPatientAppointmentHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointments = await Appointment.find({ patientId: id })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('departmentId', 'name location')
      .sort({ appointmentDate: -1, startTime: -1 });

    return successResponse(res, 'Patient appointment history retrieved', appointments);
  } catch (error) {
    next(error);
  }
};

/**
 * Access restricted medical records (DOCTOR or ADMIN only, NOT FRONT_DESK)
 */
const getPatientMedicalHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Strict Role Enforcement
    if (req.user.role === ROLES.FRONT_DESK) {
      return errorResponse(
        res,
        'Access denied: FRONT_DESK is strictly forbidden from accessing restricted clinical medical records',
        403
      );
    }

    // If DOCTOR, verify encounter link
    if (req.user.role === ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return errorResponse(res, 'Doctor profile not found', 403);
      }

      const hasAppointment = await Appointment.exists({
        patientId: id,
        doctorId: doctor._id
      });

      if (!hasAppointment) {
        return errorResponse(
          res,
          'Access forbidden: You are not authorized to view clinical records for an unassigned patient',
          403
        );
      }
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return errorResponse(res, 'Patient not found', 404);
    }

    const [visits, prescriptions, reports] = await Promise.all([
      Visit.find({ patientId: id })
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' }
        })
        .sort({ visitDate: -1 }),
      Prescription.find({ patientId: id })
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' }
        })
        .sort({ createdAt: -1 }),
      DiagnosticReport.find({ patientId: id }).sort({ reportDate: -1 })
    ]);

    await logAudit({
      user: req.user,
      action: 'PATIENT_CLINICAL_RECORDS_ACCESS',
      entityType: 'Patient',
      entityId: patient._id,
      details: { patientId: patient.patientId, visitsCount: visits.length },
      ipAddress: req.ip
    });

    return successResponse(res, 'Clinical medical records retrieved', {
      patient,
      visits,
      prescriptions,
      reports
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  togglePatientActive,
  getPatientAppointmentHistory,
  getPatientMedicalHistory
};

