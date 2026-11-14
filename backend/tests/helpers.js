const { User, Doctor, Department } = require('../models');
const { generateToken } = require('../utils/jwt');

const createTestUser = async ({
  name = 'Test User',
  email = 'test@example.com',
  password = 'Password@123',
  role = 'FRONT_DESK'
} = {}) => {
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role
  });

  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  return { user, token };
};

const createTestDoctor = async ({
  name = 'Dr. Test Specialist',
  email = 'doctor.test@example.com',
  password = 'Password@123'
} = {}) => {
  const department = await Department.create({
    name: `Dept-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    location: 'Building A, 1st Floor'
  });

  const { user, token } = await createTestUser({ name, email, password, role: 'DOCTOR' });

  const doctor = await Doctor.create({
    userId: user._id,
    doctorId: `DOC-${Date.now().toString().slice(-4)}`,
    specialization: 'Internal Medicine',
    departmentId: department._id,
    qualification: 'MD, MBBS',
    consultationFee: 100,
    workingSchedule: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Saturday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true },
      { day: 'Sunday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, isActive: true }
    ],
    isAvailable: true
  });

  return { user, token, doctor, department };
};

module.exports = {
  createTestUser,
  createTestDoctor
};

