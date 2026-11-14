const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, getMe, changePassword, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validators/validationMiddleware');
const { authValidators } = require('../validators');

// Security: Rate limiting on authentication attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes',
    errors: ['Rate limit exceeded']
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', authLimiter, validate(authValidators.login), login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validate(authValidators.changePassword), changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;

