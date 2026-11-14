const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { User, Doctor, Department } = require('../models');
const { createTestUser } = require('./helpers');
require('./setup');

describe('User Management API (/api/users)', () => {
  let adminToken;
  let adminUser;
  let doctorToken;
  let frontDeskToken;
  let testDept;

  beforeEach(async () => {
    // 1. Create primary Admin
    const adminRes = await createTestUser({
      name: 'Super Admin',
      email: 'admin.users@hospital.demo',
      role: 'ADMIN'
    });
    adminUser = adminRes.user;
    adminToken = adminRes.token;

    // 2. Create Doctor & Front Desk for RBAC checks
    const docRes = await createTestUser({
      name: 'Dr. Observer',
      email: 'dr.observer@hospital.demo',
      role: 'DOCTOR'
    });
    doctorToken = docRes.token;

    const fdRes = await createTestUser({
      name: 'Front Desk Operator',
      email: 'fd.operator@hospital.demo',
      role: 'FRONT_DESK'
    });
    frontDeskToken = fdRes.token;

    // 3. Create Department for Doctor linking tests
    testDept = await Department.create({
      name: `Cardiology-${Date.now()}`,
      location: 'Block C, 3rd Floor'
    });
  });

  describe('RBAC & Security Enforcements', () => {
    it('1. Unauthenticated request to create a user must return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'Password@123',
          role: 'ADMIN'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. Non-admin user (DOCTOR or FRONT_DESK) attempting to create a user must return 403 Forbidden', async () => {
      const res1 = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          name: 'Unauthorized Doctor Creation',
          email: 'unauth1@example.com',
          password: 'Password@123',
          role: 'FRONT_DESK'
        });

      expect(res1.status).toBe(403);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          name: 'Unauthorized Front Desk Creation',
          email: 'unauth2@example.com',
          password: 'Password@123',
          role: 'ADMIN'
        });

      expect(res2.status).toBe(403);
      expect(res2.body.success).toBe(false);
    });

    it('3. Non-admin user attempting to list users must return 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${frontDeskToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User Creation & Field Sanitization', () => {
    it('4. Admin can successfully create a new user with valid fields', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sarah Receptionist',
          email: 'sarah.reception@hospital.demo',
          password: 'Password@123',
          role: 'FRONT_DESK',
          isActive: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Sarah Receptionist');
      expect(res.body.data.email).toBe('sarah.reception@hospital.demo');
      expect(res.body.data.role).toBe('FRONT_DESK');
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data._id).toBeDefined();
    });

    it('5. Password hash MUST NEVER appear in API responses (POST, GET, PUT)', async () => {
      // Create user
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Privacy Test User',
          email: 'privacy@hospital.demo',
          password: 'SecretPassword#999',
          role: 'FRONT_DESK'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.passwordHash).toBeUndefined();
      expect(createRes.body.data.password).toBeUndefined();

      const createdUserId = createRes.body.data._id;

      // GET by ID
      const getRes = await request(app)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.passwordHash).toBeUndefined();
      expect(getRes.body.data.password).toBeUndefined();

      // GET all
      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const fetched = listRes.body.data.find(u => u._id === createdUserId);
      expect(fetched).toBeDefined();
      expect(fetched.passwordHash).toBeUndefined();

      // PUT update
      const updateRes = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Privacy Test User Updated'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.passwordHash).toBeUndefined();
    });

    it('6. Passwords must be properly hashed with bcrypt in the database', async () => {
      const rawPassword = 'SecurePassword@2026';
      const email = 'bepassword@hospital.demo';

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bcrypt Verification',
          email,
          password: rawPassword,
          role: 'FRONT_DESK'
        });

      expect(res.status).toBe(201);

      // Verify in DB directly
      const dbUser = await User.findOne({ email }).select('+passwordHash');
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).not.toBe(rawPassword);
      expect(dbUser.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // standard bcrypt salt prefix

      // Compare password with bcrypt
      const isMatch = await bcrypt.compare(rawPassword, dbUser.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('7. Duplicate email must be rejected with 409 Conflict', async () => {
      const email = 'duplicate.test@hospital.demo';

      // First creation
      const res1 = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'First User',
          email,
          password: 'Password@123',
          role: 'FRONT_DESK'
        });
      expect(res1.status).toBe(201);

      // Attempt second creation with same email (case-insensitive)
      const res2 = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate User',
          email: email.toUpperCase(),
          password: 'Password@456',
          role: 'ADMIN'
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toMatch(/registered|already exists/i);
    });
  });

  describe('Doctor Account Linking', () => {
    let unlinkedDoctor;

    beforeEach(async () => {
      // Create an unlinked doctor record
      unlinkedDoctor = await Doctor.create({
        doctorId: `DOC-UNLINKED-${Date.now().toString().slice(-4)}`,
        specialization: 'Neurology',
        departmentId: testDept._id,
        qualification: 'MD Neurology',
        consultationFee: 250,
        workingSchedule: [
          { day: 'Monday', startTime: '09:00', endTime: '15:00', slotDurationMinutes: 30, isActive: true }
        ],
        isAvailable: true
      });
    });

    it('8. Creating a DOCTOR user can successfully link to an existing unlinked Doctor profile', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dr. Gregory House',
          email: 'greg.house@hospital.demo',
          password: 'Password@123',
          role: 'DOCTOR',
          doctorProfileId: unlinkedDoctor._id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('DOCTOR');

      // Verify the doctor model was updated with this user's _id
      const updatedDoc = await Doctor.findById(unlinkedDoctor._id);
      expect(updatedDoc.userId.toString()).toBe(res.body.data._id);

      // Verify login with this doctor returns DOCTOR role
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'greg.house@hospital.demo',
          password: 'Password@123'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe('DOCTOR');
      expect(loginRes.body.data.token).toBeDefined();
    });

    it('9. Linking an already linked doctor profile to another user must be rejected with 409 Conflict', async () => {
      // Link doctor to first user
      const res1 = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dr. Original',
          email: 'original.doc@hospital.demo',
          password: 'Password@123',
          role: 'DOCTOR',
          doctorProfileId: unlinkedDoctor._id
        });
      expect(res1.status).toBe(201);

      // Try linking to second user
      const res2 = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dr. Imposter',
          email: 'imposter.doc@hospital.demo',
          password: 'Password@123',
          role: 'DOCTOR',
          doctorProfileId: unlinkedDoctor._id
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toMatch(/already linked/i);
    });
  });

  describe('User Status Management & Last Active Admin Protection', () => {
    it('10. Admin can toggle user active status (deactivation and reactivation)', async () => {
      // Create active user
      const userRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Deactivatable Staff',
          email: 'deact.staff@hospital.demo',
          password: 'Password@123',
          role: 'FRONT_DESK',
          isActive: true
        });

      const targetId = userRes.body.data._id;

      // Deactivate user
      const deactRes = await request(app)
        .patch(`/api/users/${targetId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);

      // Verify deactivated user cannot log in
      const loginAttempt = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'deact.staff@hospital.demo',
          password: 'Password@123'
        });

      expect(loginAttempt.status).toBe(403);
      expect(loginAttempt.body.message).toMatch(/deactivated/i);

      // Reactivate user
      const reactRes = await request(app)
        .patch(`/api/users/${targetId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.data.isActive).toBe(true);

      // Verify reactivated user can now log in
      const reLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'deact.staff@hospital.demo',
          password: 'Password@123'
        });

      expect(reLogin.status).toBe(200);
      expect(reLogin.body.data.token).toBeDefined();
    });

    it('11. Attempting to deactivate the last remaining active administrator must be rejected with 400 Bad Request', async () => {
      // Currently only adminUser is an active ADMIN in this test
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/sole active administrator|active administrator/i);

      // Verify admin remains active in DB
      const checkAdmin = await User.findById(adminUser._id);
      expect(checkAdmin.isActive).toBe(true);
    });

    it('12. Attempting to demote the last remaining active administrator to DOCTOR/FRONT_DESK must be rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Super Admin',
          role: 'FRONT_DESK'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/sole active administrator|active administrator/i);

      // Verify admin role remains unchanged
      const checkAdmin = await User.findById(adminUser._id);
      expect(checkAdmin.role).toBe('ADMIN');
    });

    it('13. Deactivating an admin is permitted when another active administrator exists', async () => {
      // Create a second active admin
      const secondAdminRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Second Admin',
          email: 'second.admin@hospital.demo',
          password: 'Password@123',
          role: 'ADMIN',
          isActive: true
        });

      const secondAdminId = secondAdminRes.body.data._id;

      // Now deactivating the second admin should succeed because adminUser is still active
      const res = await request(app)
        .patch(`/api/users/${secondAdminId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('User Listing, Filtering & Statistics', () => {
    it('14. Admin can list users with aggregated statistics and search filters', async () => {
      const res = await request(app)
        .get('/api/users?search=Super&role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalUsers).toBeGreaterThanOrEqual(3);
      expect(res.body.stats.activeUsers).toBeGreaterThanOrEqual(1);
      expect(res.body.stats.adminCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].email).toBe('admin.users@hospital.demo');
    });
  });
});
