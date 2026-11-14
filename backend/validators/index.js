const { body, param, query } = require('express-validator');

const authValidators = {
  login: [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ]
};

const patientValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Patient name is required'),
    body('dateOfBirth').isISO8601().toDate().withMessage('Valid date of birth (YYYY-MM-DD) is required'),
    body('gender').isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email required').normalizeEmail()
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid patient ID'),
    body('name').optional().trim().notEmpty().withMessage('Patient name cannot be empty'),
    body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty'),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER')
  ]
};

const departmentValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('location').trim().notEmpty().withMessage('Department location is required')
  ]
};

const doctorValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Doctor name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('specialization').trim().notEmpty().withMessage('Specialization is required'),
    body('departmentId').isMongoId().withMessage('Valid department ID required'),
    body('qualification').trim().notEmpty().withMessage('Qualification is required'),
    body('consultationFee').isFloat({ min: 0 }).withMessage('Consultation fee must be non-negative')
  ]
};

const appointmentValidators = {
  book: [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
    body('appointmentDate').isISO8601().toDate().withMessage('Valid appointment date is required'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:mm 24-hr format'),
    body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:mm 24-hr format'),
    body('reason').trim().notEmpty().withMessage('Reason for appointment is required')
  ],
  reschedule: [
    param('id').isMongoId().withMessage('Valid appointment ID is required'),
    body('newDate').isISO8601().toDate().withMessage('Valid new appointment date is required'),
    body('newStartTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:mm 24-hr format'),
    body('newEndTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:mm 24-hr format'),
    body('reason').optional().trim()
  ],
  cancel: [
    param('id').isMongoId().withMessage('Valid appointment ID is required'),
    body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
  ]
};

const visitValidators = {
  create: [
    body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('consultationNotes').trim().notEmpty().withMessage('Consultation notes are required')
  ]
};

const prescriptionValidators = {
  create: [
    body('visitId').isMongoId().withMessage('Valid visit ID is required'),
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('medicines').isArray({ min: 1 }).withMessage('At least one medicine is required'),
    body('medicines.*.name').trim().notEmpty().withMessage('Medicine name is required'),
    body('medicines.*.dosage').trim().notEmpty().withMessage('Dosage is required'),
    body('medicines.*.frequency').trim().notEmpty().withMessage('Frequency is required'),
    body('medicines.*.duration').trim().notEmpty().withMessage('Duration is required')
  ]
};

const invoiceValidators = {
  create: [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one billing item is required'),
    body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
    body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be non-negative'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be non-negative')
  ]
};

const userValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('User full name is required'),
    body('email').isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['ADMIN', 'DOCTOR', 'FRONT_DESK']).withMessage('Role must be ADMIN, DOCTOR, or FRONT_DESK'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('name').optional().trim().notEmpty().withMessage('User full name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email address required').normalizeEmail(),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['ADMIN', 'DOCTOR', 'FRONT_DESK']).withMessage('Role must be ADMIN, DOCTOR, or FRONT_DESK'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ]
};

const paymentValidators = {
  record: [
    body('invoiceId').isMongoId().withMessage('Valid invoice ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than zero'),
    body('paymentMethod').isIn(['CASH', 'CARD_SIMULATED', 'UPI_SIMULATED']).withMessage('Payment method must be CASH, CARD_SIMULATED, or UPI_SIMULATED'),
    body('transactionReference').trim().notEmpty().withMessage('Transaction reference is required for idempotency')
  ]
};

module.exports = {
  authValidators,
  userValidators,
  patientValidators,
  departmentValidators,
  doctorValidators,
  appointmentValidators,
  visitValidators,
  prescriptionValidators,
  invoiceValidators,
  paymentValidators
};

