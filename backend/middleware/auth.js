const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/apiResponse');
const { User, Doctor } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token is missing or malformed', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired, please log in again', 401);
      }
      return errorResponse(res, 'Invalid or untrusted authentication token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 'Authenticated user no longer exists', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'User account is deactivated. Contact administrator.', 403);
    }

    req.user = user;

    // If role is DOCTOR, also attach doctor profile if available
    if (user.role === 'DOCTOR') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      req.doctor = doctorProfile;
    }

    next();
  } catch (error) {
    return errorResponse(res, 'Authentication verification failed', 500, error.message);
  }
};

module.exports = {
  authenticate
};

