const express = require('express');
const router = express.Router();
const { createVisit, getVisitById, updateVisit } = require('../controllers/visitController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { visitValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);
// FRONT_DESK is strictly blocked from clinical visit management
router.use(authorize(ROLES.DOCTOR, ROLES.ADMIN));

router.post('/', validate(visitValidators.create), createVisit);
router.get('/:id', getVisitById);
router.put('/:id', updateVisit);

module.exports = router;

