const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  toggleDoctorAvailability
} = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { doctorValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// View doctors (all authenticated roles)
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

// Admin doctor management
router.post('/', authorize(ROLES.ADMIN), validate(doctorValidators.create), createDoctor);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.DOCTOR), updateDoctor);
router.patch('/:id/availability', authorize(ROLES.ADMIN, ROLES.DOCTOR), toggleDoctorAvailability);

module.exports = router;

