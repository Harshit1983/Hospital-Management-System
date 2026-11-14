const express = require('express');
const router = express.Router();
const { recordPayment, getPaymentsByInvoice } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { paymentValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Record simulated payment
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  validate(paymentValidators.record),
  recordPayment
);

router.get('/invoice/:invoiceId', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), getPaymentsByInvoice);

module.exports = router;

