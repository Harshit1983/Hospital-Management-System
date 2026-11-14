const { Appointment, Doctor } = require('../models');
const { AUDIT_ACTIONS, APPOINTMENT_STATUS } = require('../config/constants');
const { logAudit } = require('./auditService');

/**
 * Helper to convert "HH:mm" to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Helper to convert minutes since midnight to "HH:mm"
 */
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Returns day of week name (e.g. 'Monday', 'Tuesday')
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
};

/**
 * Generate available time slots for a doctor on a specific date
 */
const getAvailableSlots = async (doctorId, dateStr) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  if (!doctor.isAvailable) {
    return {
      doctorId,
      date: dateStr,
      isAvailable: false,
      message: 'Doctor is currently marked as unavailable',
      slots: []
    };
  }

  const queryDate = new Date(dateStr);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  const dayName = getDayName(queryDate);
  const scheduleForDay = doctor.workingSchedule.find(s => s.day === dayName && s.isActive);

  if (!scheduleForDay) {
    return {
      doctorId,
      doctorName: doctor.doctorId,
      date: dateStr,
      dayName,
      message: `Doctor does not have scheduled hours on ${dayName}`,
      slots: []
    };
  }

  const slotDuration = scheduleForDay.slotDurationMinutes || 30;
  const startMins = timeToMinutes(scheduleForDay.startTime);
  const endMins = timeToMinutes(scheduleForDay.endTime);

  // Generate all possible slots
  const allSlots = [];
  for (let current = startMins; current + slotDuration <= endMins; current += slotDuration) {
    allSlots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + slotDuration)
    });
  }

  // Fetch all existing booked/confirmed appointments for this doctor on this day
  const bookedAppointments = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: [APPOINTMENT_STATUS.BOOKED, APPOINTMENT_STATUS.CONFIRMED] }
  }).select('startTime endTime status');

  const bookedStartTimes = new Set(bookedAppointments.map(a => a.startTime));

  const slotsWithStatus = allSlots.map(slot => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    isAvailable: !bookedStartTimes.has(slot.startTime)
  }));

  return {
    doctorId,
    date: dateStr,
    dayName,
    workingHours: `${scheduleForDay.startTime} - ${scheduleForDay.endTime}`,
    slotDuration,
    slots: slotsWithStatus
  };
};

/**
 * Book an appointment atomically with double-booking prevention
 */
const bookAppointment = async ({
  patientId,
  doctorId,
  departmentId,
  appointmentDate,
  startTime,
  endTime,
  reason,
  user,
  ipAddress
}) => {
  const parsedDate = new Date(appointmentDate);
  const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59, 999);

  // 1. Server-side schedule & availability verification
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }
  if (!doctor.isAvailable) {
    throw new Error('Doctor is currently unavailable for bookings');
  }

  const dayName = getDayName(parsedDate);
  const scheduleForDay = doctor.workingSchedule.find(s => s.day === dayName && s.isActive);
  if (!scheduleForDay) {
    throw new Error(`Doctor has no scheduled clinic hours on ${dayName}`);
  }

  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);
  const schedStart = timeToMinutes(scheduleForDay.startTime);
  const schedEnd = timeToMinutes(scheduleForDay.endTime);

  if (reqStart < schedStart || reqEnd > schedEnd) {
    throw new Error(`Requested time (${startTime}-${endTime}) is outside doctor working hours (${scheduleForDay.startTime}-${scheduleForDay.endTime})`);
  }

  // 2. Pre-check for overlapping active appointment
  const existingConflict = await Appointment.findOne({
    doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    startTime,
    status: { $in: [APPOINTMENT_STATUS.BOOKED, APPOINTMENT_STATUS.CONFIRMED] }
  });

  if (existingConflict) {
    const conflictErr = new Error(`Doctor is already booked for this slot (${startTime} on ${parsedDate.toDateString()}). Double booking prevented.`);
    conflictErr.statusCode = 409;
    throw conflictErr;
  }

  // 3. Atomically create appointment (backed by compound unique index)
  try {
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      departmentId,
      appointmentDate: startOfDay,
      startTime,
      endTime,
      reason,
      status: APPOINTMENT_STATUS.BOOKED,
      createdBy: user._id
    });

    // 4. Record audit log
    await logAudit({
      user,
      action: AUDIT_ACTIONS.APPOINTMENT_BOOK,
      entityType: 'Appointment',
      entityId: appointment._id,
      details: {
        patientId,
        doctorId,
        appointmentDate: startOfDay,
        startTime,
        endTime
      },
      ipAddress
    });

    return appointment;
  } catch (error) {
    if (error.code === 11000) {
      const raceErr = new Error('Slot conflict: another appointment was just booked for this exact slot. Please choose another slot.');
      raceErr.statusCode = 409;
      throw raceErr;
    }
    throw error;
  }
};

/**
 * Reschedule an existing appointment
 */
const rescheduleAppointment = async (appointmentId, newDateStr, newStartTime, newEndTime, reason, user, ipAddress) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const notFound = new Error('Appointment not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  if (appointment.status === APPOINTMENT_STATUS.CANCELLED || appointment.status === APPOINTMENT_STATUS.COMPLETED) {
    const err = new Error(`Cannot reschedule an appointment with status '${appointment.status}'`);
    err.statusCode = 400;
    throw err;
  }

  const newDate = new Date(newDateStr);
  const startOfDay = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
  const endOfDay = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 23, 59, 59, 999);

  // Check conflicts for the new slot
  const conflict = await Appointment.findOne({
    _id: { $ne: appointment._id },
    doctorId: appointment.doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    startTime: newStartTime,
    status: { $in: [APPOINTMENT_STATUS.BOOKED, APPOINTMENT_STATUS.CONFIRMED] }
  });

  if (conflict) {
    const err = new Error(`The requested new slot (${newStartTime} on ${newDate.toDateString()}) is already occupied.`);
    err.statusCode = 409;
    throw err;
  }

  const oldDate = appointment.appointmentDate;
  const oldStart = appointment.startTime;

  appointment.appointmentDate = startOfDay;
  appointment.startTime = newStartTime;
  appointment.endTime = newEndTime;
  appointment.status = APPOINTMENT_STATUS.BOOKED;
  if (reason) {
    appointment.reason = `${appointment.reason} | Rescheduled: ${reason}`;
  }

  await appointment.save();

  await logAudit({
    user,
    action: AUDIT_ACTIONS.APPOINTMENT_RESCHEDULE,
    entityType: 'Appointment',
    entityId: appointment._id,
    details: {
      oldDate,
      oldStart,
      newDate: startOfDay,
      newStart: newStartTime,
      reason
    },
    ipAddress
  });

  return appointment;
};

/**
 * Cancel an appointment
 */
const cancelAppointment = async (appointmentId, cancellationReason, user, ipAddress) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const notFound = new Error('Appointment not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
    const err = new Error('Appointment is already cancelled');
    err.statusCode = 400;
    throw err;
  }

  if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
    const err = new Error('Completed appointments cannot be cancelled');
    err.statusCode = 400;
    throw err;
  }

  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  appointment.cancellationReason = cancellationReason || 'Cancelled by user';
  await appointment.save();

  await logAudit({
    user,
    action: AUDIT_ACTIONS.APPOINTMENT_CANCEL,
    entityType: 'Appointment',
    entityId: appointment._id,
    details: { cancellationReason },
    ipAddress
  });

  return appointment;
};

module.exports = {
  getAvailableSlots,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  timeToMinutes,
  minutesToTime
};

