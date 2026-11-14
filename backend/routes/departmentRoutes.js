const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { departmentValidators } = require('../validators');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// All authenticated roles can view departments
router.get('/', getAllDepartments);
router.get('/:id', getDepartmentById);

// Admin-only operations
router.post('/', authorize(ROLES.ADMIN), validate(departmentValidators.create), createDepartment);
router.put('/:id', authorize(ROLES.ADMIN), updateDepartment);
router.delete('/:id', authorize(ROLES.ADMIN), deleteDepartment);

module.exports = router;

