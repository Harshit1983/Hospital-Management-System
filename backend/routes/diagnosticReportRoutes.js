const express = require('express');
const router = express.Router();
const {
  createDiagnosticReport,
  getReportsByPatient,
  updateReportStatus
} = require('../controllers/diagnosticReportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Add diagnostic report metadata (Doctor, Admin)
router.post('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), createDiagnosticReport);
router.get('/patient/:patientId', authorize(ROLES.DOCTOR, ROLES.ADMIN), getReportsByPatient);
router.patch('/:id/status', authorize(ROLES.DOCTOR, ROLES.ADMIN), updateReportStatus);

module.exports = router;

