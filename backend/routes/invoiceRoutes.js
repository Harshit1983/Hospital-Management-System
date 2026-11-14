const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getInvoicesByPatient
} = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { invoiceValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Generate invoice (Admin & Front Desk)
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.FRONT_DESK),
  validate(invoiceValidators.create),
  createInvoice
);

router.get('/', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), getAllInvoices);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), getInvoiceById);
router.get('/patient/:patientId', authorize(ROLES.ADMIN, ROLES.FRONT_DESK), getInvoicesByPatient);

module.exports = router;

