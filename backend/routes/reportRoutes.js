const express = require('express');
const router = express.Router();
const {
  getAppointmentsReport,
  getRevenueReport,
  getPendingInvoicesReport
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/appointments', getAppointmentsReport);
router.get('/revenue', getRevenueReport);
router.get('/pending-invoices', getPendingInvoicesReport);

module.exports = router;

