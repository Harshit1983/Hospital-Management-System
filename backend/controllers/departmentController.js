const { Department, Doctor } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');

const getAllDepartments = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(filter).sort({ name: 1 });

    // Aggregate doctor count per department
    const doctorCounts = await Doctor.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ]);
    const countsMap = doctorCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const enriched = departments.map(dept => ({
      ...dept.toJSON(),
      activeDoctorsCount: countsMap[dept._id.toString()] || 0
    }));

    return successResponse(res, 'Departments fetched successfully', enriched);
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);
    if (!department) {
      return errorResponse(res, 'Department not found', 404);
    }

    const doctors = await Doctor.find({ departmentId: id }).populate('userId', 'name email');

    return successResponse(res, 'Department details fetched successfully', {
      ...department.toJSON(),
      doctors
    });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, description, location } = req.body;

    const existing = await Department.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return errorResponse(res, 'Department with this name already exists', 409);
    }

    const department = await Department.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      location: location.trim()
    });

    await logAudit({
      user: req.user,
      action: 'DEPARTMENT_CREATE',
      entityType: 'Department',
      entityId: department._id,
      details: { name: department.name, location: department.location },
      ipAddress: req.ip
    });

    return successResponse(res, 'Department created successfully', department, 201);
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, location, isActive } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return errorResponse(res, 'Department not found', 404);
    }

    if (name) department.name = name.trim();
    if (description !== undefined) department.description = description.trim();
    if (location) department.location = location.trim();
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    await logAudit({
      user: req.user,
      action: 'DEPARTMENT_UPDATE',
      entityType: 'Department',
      entityId: department._id,
      details: { name: department.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Department updated successfully', department);
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctorCount = await Doctor.countDocuments({ departmentId: id });
    if (doctorCount > 0) {
      return errorResponse(
        res,
        `Cannot delete department: ${doctorCount} doctor(s) are currently assigned to it. Please reassign them first.`,
        400
      );
    }

    const department = await Department.findByIdAndDelete(id);
    if (!department) {
      return errorResponse(res, 'Department not found', 404);
    }

    await logAudit({
      user: req.user,
      action: 'DEPARTMENT_DELETE',
      entityType: 'Department',
      entityId: id,
      details: { name: department.name },
      ipAddress: req.ip
    });

    return successResponse(res, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};

