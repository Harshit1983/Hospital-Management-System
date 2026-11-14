const express = require('express');
const router = express.Router();
const {
  getAvailableSlots,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  getAllAppointments,
  getAppointmentById
} = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { appointmentValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Public to all authenticated users: Slot generation & queries
router.get('/slots', getAvailableSlots);
router.get('/', getAllAppointments);
router.get('/:id', getAppointmentById);

// Appointment booking (Admin, Front Desk, Doctor)
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.DOCTOR),
  validate(appointmentValidators.book),
  bookAppointment
);

// Reschedule appointment
router.put(
  '/:id/reschedule',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  validate(appointmentValidators.reschedule),
  rescheduleAppointment
);

// Cancel appointment
router.patch(
  '/:id/cancel',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.DOCTOR),
  validate(appointmentValidators.cancel),
  cancelAppointment
);

// Update status (e.g. COMPLETED, NO_SHOW, CONFIRMED)
router.patch('/:id/status', updateAppointmentStatus);

module.exports = router;

