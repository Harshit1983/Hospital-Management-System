const request = require('supertest');
const app = require('../app');
const { createTestUser } = require('./helpers');
require('./setup');

describe('Patient Management API (/api/patients)', () => {
  let frontDeskToken;
  let adminToken;

  beforeEach(async () => {
    const fd = await createTestUser({ email: 'fd.patient@hospital.demo', role: 'FRONT_DESK' });
    frontDeskToken = fd.token;

    const adm = await createTestUser({ email: 'admin.patient@hospital.demo', role: 'ADMIN' });
    adminToken = adm.token;
  });

  it('should register a new patient successfully with generated patientId', async () => {
    const newPatient = {
      name: 'Clara Oswald',
      dateOfBirth: '1992-11-23',
      gender: 'FEMALE',
      phone: '+1-555-4321',
      email: 'clara@example.demo',
      address: { street: '12 Coal Hill Rd', city: 'London', state: 'UK', postalCode: 'E1' }
    };

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send(newPatient);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.patientId).toMatch(/^PAT-\d{4}-\d{4}$/);
    expect(res.body.data.name).toBe('Clara Oswald');
    expect(res.body.data.isActive).toBe(true);
  });

  it('should reject patient registration with invalid data', async () => {
    const invalidPatient = {
      name: '', // Empty name
      dateOfBirth: 'not-a-date',
      gender: 'INVALID_GENDER',
      phone: ''
    };

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send(invalidPatient);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('should search patients by name or phone with pagination', async () => {
    // Create 2 patients
    await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'Alexander Hamilton', dateOfBirth: '1980-01-11', gender: 'MALE', phone: '+1-555-1111' });

    await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'Thomas Jefferson', dateOfBirth: '1982-04-13', gender: 'MALE', phone: '+1-555-2222' });

    const searchRes = await request(app)
      .get('/api/patients?search=Hamilton')
      .set('Authorization', `Bearer ${frontDeskToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].name).toBe('Alexander Hamilton');
  });

  it('should allow admin to safely deactivate a patient record', async () => {
    const createRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'James Potter', dateOfBirth: '1978-03-27', gender: 'MALE', phone: '+1-555-9988' });

    const patientId = createRes.body.data._id;

    const deactivateRes = await request(app)
      .patch(`/api/patients/${patientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.data.isActive).toBe(false);
  });
});

