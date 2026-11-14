const { Doctor, User, Department, Appointment } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');

const getAllDoctors = async (req, res, next) => {
  try {
    const { departmentId, specialization, isAvailable, unlinked, search } = req.query;
    const filter = {};

    if (departmentId) filter.departmentId = departmentId;
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (unlinked === 'true') filter.userId = { $in: [null, undefined] };

    let query = Doctor.find(filter)
      .populate('userId', 'name email isActive')
      .populate('departmentId', 'name location');

    let doctors = await query;

    // Filter by search term on doctor name if provided
    if (search) {
      const term = search.toLowerCase();
      doctors = doctors.filter(doc =>
        (doc.userId && doc.userId.name && doc.userId.name.toLowerCase().includes(term)) ||
        (doc.doctorId && doc.doctorId.toLowerCase().includes(term)) ||
        (doc.specialization && doc.specialization.toLowerCase().includes(term))
      );
    }

    return successResponse(res, 'Doctors retrieved successfully', doctors);
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id)
      .populate('userId', 'name email isActive')
      .populate('departmentId', 'name location description');

    if (!doctor) {
      return errorResponse(res, 'Doctor not found', 404);
    }

    // Fetch upcoming appointments count
    const now = new Date();
    const upcomingCount = await Appointment.countDocuments({
      doctorId: doctor._id,
      appointmentDate: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      status: { $in: ['BOOKED', 'CONFIRMED'] }
    });

    return successResponse(res, 'Doctor details fetched successfully', {
      ...doctor.toJSON(),
      upcomingAppointmentsCount: upcomingCount
    });
  } catch (error) {
    next(error);
  }
};

const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      specialization,
      departmentId,
      qualification,
      experienceYears,
      consultationFee,
      workingSchedule
    } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return errorResponse(res, 'Email is already registered in the system', 409);
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return errorResponse(res, 'Assigned department does not exist', 400);
    }

    // Generate doctor unique code
    const doctorCount = await Doctor.countDocuments();
    const doctorId = `DOC-${String(doctorCount + 101).padStart(4, '0')}`;

    // Default full-week schedule if not provided
    const defaultSchedule = [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Saturday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true }
    ];

    // Create User record
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'DOCTOR'
    });

    // Create Doctor record
    const doctor = await Doctor.create({
      userId: user._id,
      doctorId,
      specialization: specialization.trim(),
      departmentId,
      qualification: qualification.trim(),
      experienceYears: Number(experienceYears) || 1,
      consultationFee: Number(consultationFee) || 50,
      workingSchedule: workingSchedule && workingSchedule.length > 0 ? workingSchedule : defaultSchedule,
      isAvailable: true
    });

    await logAudit({
      user: req.user,
      action: 'DOCTOR_CREATE',
      entityType: 'Doctor',
      entityId: doctor._id,
      details: { doctorId, name: user.name, specialization },
      ipAddress: req.ip
    });

    const populated = await Doctor.findById(doctor._id)
      .populate('userId', 'name email')
      .populate('departmentId', 'name location');

    return successResponse(res, 'Doctor profile created successfully', populated, 201);
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      specialization,
      departmentId,
      qualification,
      experienceYears,
      consultationFee,
      workingSchedule,
      isAvailable
    } = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return errorResponse(res, 'Doctor not found', 404);
    }

    if (specialization) doctor.specialization = specialization.trim();
    if (qualification) doctor.qualification = qualification.trim();
    if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (workingSchedule) doctor.workingSchedule = workingSchedule;
    if (isAvailable !== undefined) doctor.isAvailable = isAvailable;

    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return errorResponse(res, 'Department not found', 400);
      }
      doctor.departmentId = departmentId;
    }

    await doctor.save();

    await logAudit({
      user: req.user,
      action: 'DOCTOR_UPDATE',
      entityType: 'Doctor',
      entityId: doctor._id,
      details: { doctorId: doctor.doctorId },
      ipAddress: req.ip
    });

    const updated = await Doctor.findById(doctor._id)
      .populate('userId', 'name email')
      .populate('departmentId', 'name location');

    return successResponse(res, 'Doctor profile updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

const toggleDoctorAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return errorResponse(res, 'Doctor not found', 404);
    }

    doctor.isAvailable = !doctor.isAvailable;
    await doctor.save();

    await logAudit({
      user: req.user,
      action: 'DOCTOR_UPDATE',
      entityType: 'Doctor',
      entityId: doctor._id,
      details: { change: 'availability_toggled', isAvailable: doctor.isAvailable },
      ipAddress: req.ip
    });

    return successResponse(
      res,
      `Doctor is now ${doctor.isAvailable ? 'available' : 'unavailable'} for bookings`,
      { isAvailable: doctor.isAvailable }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  toggleDoctorAvailability
};

