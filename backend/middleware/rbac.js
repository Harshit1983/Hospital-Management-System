const { errorResponse } = require('../utils/apiResponse');

/**
 * Middleware to restrict endpoints based on user roles
 * @param {string|string[]} roles Allowed roles
 */
const authorize = (...roles) => {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    if (!allowed.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access forbidden: '${req.user.role}' does not have permission to perform this action`,
        403
      );
    }

    next();
  };
};

module.exports = {
  authorize
};

