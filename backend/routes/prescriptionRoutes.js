const express = require('express');
const router = express.Router();
const {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByPatient
} = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { prescriptionValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// FRONT_DESK is strictly blocked
router.use(authorize(ROLES.DOCTOR, ROLES.ADMIN));

router.post('/', validate(prescriptionValidators.create), createPrescription);
router.get('/:id', getPrescriptionById);
router.get('/patient/:patientId', getPrescriptionsByPatient);

module.exports = router;

