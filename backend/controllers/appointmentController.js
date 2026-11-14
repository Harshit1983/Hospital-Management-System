const { Appointment, Doctor } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const appointmentService = require('../services/appointmentService');
const { logAudit } = require('../services/auditService');
const { ROLES, AUDIT_ACTIONS } = require('../config/constants');

const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return errorResponse(res, 'Both doctorId and date parameters are required', 400);
    }

    const slotInfo = await appointmentService.getAvailableSlots(doctorId, date);
    return successResponse(res, 'Doctor slots retrieved successfully', slotInfo);
  } catch (error) {
    next(error);
  }
};

const bookAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, departmentId, appointmentDate, startTime, endTime, reason } = req.body;

    const appointment = await appointmentService.bookAppointment({
      patientId,
      doctorId,
      departmentId,
      appointmentDate,
      startTime,
      endTime,
      reason,
      user: req.user,
      ipAddress: req.ip
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('patientId', 'name patientId phone email')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('departmentId', 'name location');

    return successResponse(res, 'Appointment booked successfully', populated, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newDate, newStartTime, newEndTime, reason } = req.body;

    const updated = await appointmentService.rescheduleAppointment(
      id,
      newDate,
      newStartTime,
      newEndTime,
      reason,
      req.user,
      req.ip
    );

    const populated = await Appointment.findById(updated._id)
      .populate('patientId', 'name patientId phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate('departmentId', 'name location');

    return successResponse(res, 'Appointment rescheduled successfully', populated);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cancelled = await appointmentService.cancelAppointment(id, reason, req.user, req.ip);
    return successResponse(res, 'Appointment cancelled successfully', cancelled);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return errorResponse(res, 'Appointment not found', 404);
    }

    const oldStatus = appointment.status;
    appointment.status = status;
    await appointment.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.APPOINTMENT_STATUS_UPDATE,
      entityType: 'Appointment',
      entityId: appointment._id,
      details: { oldStatus, newStatus: status },
      ipAddress: req.ip
    });

    return successResponse(res, 'Appointment status updated successfully', appointment);
  } catch (error) {
    next(error);
  }
};

const getAllAppointments = async (req, res, next) => {
  try {
    const {
      patientId,
      doctorId,
      departmentId,
      status,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (patientId) filter.patientId = patientId;
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;

    // Role-based scoping: Doctors can only see their own appointments unless Admin
    if (req.user.role === ROLES.DOCTOR) {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (doctorProfile) {
        filter.doctorId = doctorProfile._id;
      }
    } else if (doctorId) {
      filter.doctorId = doctorId;
    }

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      filter.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = new Date(startDate);
      if (endDate) filter.appointmentDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patientId', 'name patientId phone email gender')
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name email' }
        })
        .populate('departmentId', 'name location')
        .sort({ appointmentDate: -1, startTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Appointment.countDocuments(filter)
    ]);

    return successResponse(res, 'Appointments retrieved successfully', appointments, 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name patientId phone email dateOfBirth gender bloodGroup')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('departmentId', 'name location');

    if (!appointment) {
      return errorResponse(res, 'Appointment not found', 404);
    }

    // Role check for Doctor
    if (req.user.role === ROLES.DOCTOR) {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (doctorProfile && appointment.doctorId._id.toString() !== doctorProfile._id.toString()) {
        return errorResponse(res, 'Access denied: You are not assigned to this appointment', 403);
      }
    }

    return successResponse(res, 'Appointment details fetched', appointment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableSlots,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  getAllAppointments,
  getAppointmentById
};

