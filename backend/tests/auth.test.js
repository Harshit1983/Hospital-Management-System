const request = require('supertest');
const app = require('../app');
const { createTestUser } = require('./helpers');
require('./setup');

describe('Authentication & Profile API (/api/auth)', () => {
  it('should authenticate user with valid credentials and return JWT token', async () => {
    await createTestUser({ email: 'admin.auth@hospital.demo', password: 'ValidPassword123', role: 'ADMIN' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.auth@hospital.demo', password: 'ValidPassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin.auth@hospital.demo');
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should reject login with incorrect password', async () => {
    await createTestUser({ email: 'user@hospital.demo', password: 'CorrectPassword123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@hospital.demo', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@hospital.demo', password: 'AnyPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject access to protected endpoint without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject access with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_bogus_token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should retrieve current user profile with valid Bearer token', async () => {
    const { token, user } = await createTestUser({ email: 'profile@hospital.demo' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('profile@hospital.demo');
  });

  it('should change password successfully when current password matches', async () => {
    const { token } = await createTestUser({ email: 'change@hospital.demo', password: 'OldPassword123' });

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPassword123', newPassword: 'NewSecretPassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'change@hospital.demo', password: 'NewSecretPassword123' });

    expect(loginRes.status).toBe(200);
  });
});

