const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserStatus
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../validators/validationMiddleware');
const { userValidators } = require('../validators');
const { ROLES } = require('../config/constants');

// All User Management endpoints are strictly ADMIN-only
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', validate(userValidators.create), createUser);
router.put('/:id', validate(userValidators.update), updateUser);
router.put('/:id/role', updateUserRole);
router.patch('/:id/status', toggleUserStatus);

module.exports = router;
