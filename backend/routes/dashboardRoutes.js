const express = require('express');
const router = express.Router();
const { getAdminDashboardStats, getDoctorDashboardStats } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Admin dashboard statistics
router.get('/stats', authorize(ROLES.ADMIN), getAdminDashboardStats);

// Doctor specific dashboard
router.get('/doctor', authorize(ROLES.DOCTOR), getDoctorDashboardStats);

module.exports = router;

