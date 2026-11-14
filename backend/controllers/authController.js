const { User, Doctor } = require('../models');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return errorResponse(res, 'Invalid email or password credentials', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated. Please contact an administrator.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password credentials', 401);
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    let doctorInfo = null;
    if (user.role === 'DOCTOR') {
      doctorInfo = await Doctor.findOne({ userId: user._id }).populate('departmentId', 'name location');
    }

    // Record login audit
    await logAudit({
      user,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entityType: 'User',
      entityId: user._id,
      details: { email: user.email, role: user.role },
      ipAddress: req.ip
    });

    const userObj = user.toJSON();
    return successResponse(res, 'Logged in successfully', {
      token,
      user: {
        ...userObj,
        doctorProfile: doctorInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let doctorProfile = null;
    if (user.role === 'DOCTOR') {
      doctorProfile = await Doctor.findOne({ userId: user._id }).populate('departmentId', 'name location');
    }

    return successResponse(res, 'User profile fetched successfully', {
      user: {
        ...user.toJSON(),
        doctorProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 'Current password does not match', 400);
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: 'User',
      entityId: user._id,
      details: { change: 'Password changed successfully' },
      ipAddress: req.ip
    });

    return successResponse(res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        user: req.user,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: req.user._id,
        details: { email: req.user.email },
        ipAddress: req.ip
      });
    }
    return successResponse(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
  logout
};

