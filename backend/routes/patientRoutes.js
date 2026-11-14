const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  togglePatientActive,
  getPatientAppointmentHistory,
  getPatientMedicalHistory
} = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { patientValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// View patients list (all authenticated roles)
router.get('/', getAllPatients);

// Patient registration (Admin & Front Desk)
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  validate(patientValidators.create),
  createPatient
);

// Patient details (Doctor authorized, Admin, Front Desk)
router.get('/:id', getPatientById);

// Edit patient details (Admin & Front Desk)
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  validate(patientValidators.update),
  updatePatient
);

// Safe deactivate / activate patient record (Admin only)
router.patch('/:id/status', authorize(ROLES.ADMIN), togglePatientActive);

// Appointment history (all authenticated roles)
router.get('/:id/appointments', getPatientAppointmentHistory);

// RESTRICTED Medical History (DOCTOR and ADMIN only, FRONT_DESK strictly blocked!)
router.get(
  '/:id/medical-records',
  authorize(ROLES.ADMIN, ROLES.DOCTOR),
  getPatientMedicalHistory
);

module.exports = router;

