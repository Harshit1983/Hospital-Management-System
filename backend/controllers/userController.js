const { User, Doctor } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS, ROLES } = require('../config/constants');

/**
 * GET /api/users
 * Returns list of users with search, role and status filtering, pagination,
 * populated doctor profiles for doctor roles, and global user statistics.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total, statsAggregation] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
            inactiveUsers: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
            adminCount: { $sum: { $cond: [{ $eq: ['$role', 'ADMIN'] }, 1, 0] } },
            doctorCount: { $sum: { $cond: [{ $eq: ['$role', 'DOCTOR'] }, 1, 0] } },
            frontDeskCount: { $sum: { $cond: [{ $eq: ['$role', 'FRONT_DESK'] }, 1, 0] } }
          }
        }
      ])
    ]);

    // Find linked Doctor profiles for users with role DOCTOR
    const doctorUserIds = users.filter(u => u.role === 'DOCTOR').map(u => u._id);
    let doctorProfilesMap = {};
    if (doctorUserIds.length > 0) {
      const doctors = await Doctor.find({ userId: { $in: doctorUserIds } })
        .populate('departmentId', 'name location');
      doctorProfilesMap = doctors.reduce((acc, doc) => {
        if (doc.userId) {
          acc[doc.userId.toString()] = doc;
        }
        return acc;
      }, {});
    }

    const enrichedUsers = users.map(user => {
      const userObj = user.toJSON();
      if (user.role === 'DOCTOR') {
        userObj.doctorProfile = doctorProfilesMap[user._id.toString()] || null;
      }
      return userObj;
    });

    const defaultStats = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      adminCount: 0,
      doctorCount: 0,
      frontDeskCount: 0
    };
    const stats = statsAggregation.length > 0 ? { ...defaultStats, ...statsAggregation[0] } : defaultStats;
    delete stats._id;

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: enrichedUsers,
      stats,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Retrieve details for a single user (and doctor profile if DOCTOR)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const userObj = user.toJSON();
    if (user.role === 'DOCTOR') {
      const doctorProfile = await Doctor.findOne({ userId: user._id })
        .populate('departmentId', 'name location');
      userObj.doctorProfile = doctorProfile;
    }

    return successResponse(res, 'User details retrieved successfully', userObj);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Admin creates a new user with bcrypt password hashing,
 * role validation, and optional Doctor profile linking.
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, isActive, doctorProfileId } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email, and password are required', 400);
    }

    const targetRole = role || 'FRONT_DESK';
    if (!['ADMIN', 'DOCTOR', 'FRONT_DESK'].includes(targetRole)) {
      return errorResponse(res, `Invalid role '${targetRole}'. Must be ADMIN, DOCTOR, or FRONT_DESK`, 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return errorResponse(res, 'Email is already registered in the system', 409);
    }

    // Doctor Account Linking Verification
    let doctorDoc = null;
    if (targetRole === 'DOCTOR' && doctorProfileId) {
      doctorDoc = await Doctor.findById(doctorProfileId);
      if (!doctorDoc) {
        return errorResponse(res, 'Selected doctor profile does not exist', 404);
      }

      if (doctorDoc.userId) {
        const linkedUser = await User.findById(doctorDoc.userId);
        if (linkedUser) {
          return errorResponse(
            res,
            `This doctor profile is already linked to user account '${linkedUser.name}' (${linkedUser.email})`,
            409
          );
        }
      }
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: targetRole,
      isActive: isActive !== undefined ? (isActive === true || isActive === 'true') : true
    });

    // Link doctor profile if provided
    if (doctorDoc) {
      doctorDoc.userId = user._id;
      await doctorDoc.save();
    }

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.USER_CREATE,
      entityType: 'User',
      entityId: user._id,
      details: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        linkedDoctorId: doctorDoc ? doctorDoc._id : null
      },
      ipAddress: req.ip
    });

    const userObj = user.toJSON();
    if (doctorDoc) {
      userObj.doctorProfile = doctorDoc;
    }

    return successResponse(res, 'User created successfully', userObj, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Admin updates user details (name, email, role, active status, password, doctor linking).
 * Implements Last Active Admin Protection.
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, password, doctorProfileId } = req.body;

    const user = await User.findById(id).select('+passwordHash');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check email uniqueness if email is changed
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingUser = await User.findOne({
        _id: { $ne: id },
        email: email.toLowerCase().trim()
      });
      if (existingUser) {
        return errorResponse(res, 'Email is already taken by another account', 409);
      }
      user.email = email.toLowerCase().trim();
    }

    // Last Active Admin Protection
    const isDemotingOrDeactivatingAdmin =
      user.role === 'ADMIN' &&
      user.isActive &&
      ((role && role !== 'ADMIN') || (isActive !== undefined && (isActive === false || isActive === 'false')));

    if (isDemotingOrDeactivatingAdmin) {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminCount <= 1) {
        return errorResponse(
          res,
          'Cannot modify role or deactivate the sole active administrator. The system must retain at least one active administrator.',
          400
        );
      }
    }

    if (name) user.name = name.trim();
    if (role) {
      if (!['ADMIN', 'DOCTOR', 'FRONT_DESK'].includes(role)) {
        return errorResponse(res, `Invalid role '${role}'`, 400);
      }
      user.role = role;
    }
    if (isActive !== undefined) {
      user.isActive = isActive === true || isActive === 'true';
    }

    // Update password if provided
    if (password && password.trim().length >= 6) {
      user.passwordHash = await User.hashPassword(password.trim());
    }

    // Doctor profile linking if role is DOCTOR
    let linkedDoctor = null;
    if (user.role === 'DOCTOR' && doctorProfileId) {
      linkedDoctor = await Doctor.findById(doctorProfileId);
      if (!linkedDoctor) {
        return errorResponse(res, 'Selected doctor profile does not exist', 404);
      }
      if (linkedDoctor.userId && linkedDoctor.userId.toString() !== user._id.toString()) {
        const currentOwner = await User.findById(linkedDoctor.userId);
        if (currentOwner) {
          return errorResponse(
            res,
            `Doctor profile is already linked to user '${currentOwner.name}' (${currentOwner.email})`,
            409
          );
        }
      }
      linkedDoctor.userId = user._id;
      await linkedDoctor.save();
    }

    await user.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: 'User',
      entityId: user._id,
      details: {
        change: 'user_updated',
        updatedFields: { name: user.name, email: user.email, role: user.role, isActive: user.isActive },
        linkedDoctorId: linkedDoctor ? linkedDoctor._id : null
      },
      ipAddress: req.ip
    });

    const userObj = user.toJSON();
    if (user.role === 'DOCTOR') {
      userObj.doctorProfile = linkedDoctor || await Doctor.findOne({ userId: user._id });
    }

    return successResponse(res, 'User updated successfully', userObj);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/role
 * Backward-compatible role update
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Last Active Admin Protection
    if (user.role === 'ADMIN' && role !== 'ADMIN' && user.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminCount <= 1) {
        return errorResponse(
          res,
          'Cannot change role of the sole active administrator. System requires at least one active administrator.',
          400
        );
      }
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: 'User',
      entityId: user._id,
      details: { change: 'role_updated', oldRole, newRole: role },
      ipAddress: req.ip
    });

    return successResponse(res, 'User role updated successfully', user.toJSON());
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/status
 * Toggle or explicitly set user active status.
 * Prevents deactivating the currently logged in admin if they are the sole active admin,
 * and prevents deactivating the last active administrator in the system.
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const willBeActive = req.body.isActive !== undefined ? (req.body.isActive === true || req.body.isActive === 'true') : !user.isActive;

    // Last Active Admin Protection
    if (user.role === 'ADMIN' && user.isActive && !willBeActive) {
      const activeAdminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminCount <= 1) {
        return errorResponse(
          res,
          'Cannot deactivate the sole active administrator. At least one active administrator is required to maintain system access.',
          400
        );
      }
    }

    user.isActive = willBeActive;
    await user.save();

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: 'User',
      entityId: user._id,
      details: { change: 'status_updated', isActive: user.isActive },
      ipAddress: req.ip
    });

    return successResponse(
      res,
      `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user.toJSON()
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserStatus
};
