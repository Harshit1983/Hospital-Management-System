const request = require('supertest');
const app = require('../app');
const { createTestUser, createTestDoctor } = require('./helpers');
require('./setup');

describe('Role-Based Authorization & Privacy Protections', () => {
  let adminToken;
  let frontDeskToken;
  let doctor1Token;
  let doctor2Token;
  let doctor1Obj;
  let patientObj;
  let appointmentObj;

  beforeEach(async () => {
    const adm = await createTestUser({ email: 'admin.rbac@hospital.demo', role: 'ADMIN' });
    adminToken = adm.token;

    const fd = await createTestUser({ email: 'fd.rbac@hospital.demo', role: 'FRONT_DESK' });
    frontDeskToken = fd.token;

    const doc1 = await createTestDoctor({ email: 'dr1@hospital.demo' });
    doctor1Token = doc1.token;
    doctor1Obj = doc1.doctor;

    const doc2 = await createTestDoctor({ email: 'dr2@hospital.demo' });
    doctor2Token = doc2.token;

    // Create a patient
    const pRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'Private Patient', dateOfBirth: '1985-08-20', gender: 'FEMALE', phone: '+1-555-7777' });
    patientObj = pRes.body.data;

    // Schedule appointment with Doctor 1 only
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        patientId: patientObj._id,
        doctorId: doctor1Obj._id,
        departmentId: doc1.department._id,
        appointmentDate: dateStr,
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Authorized encounter with Dr 1'
      });
    appointmentObj = apptRes.body.data;
  });

  it('CRITICAL: Doctor accessing an unrelated patient clinical record must be blocked (403 Forbidden)', async () => {
    // Dr. 2 attempts to access Private Patient's medical records (Dr. 2 has no appointment with this patient)
    const res = await request(app)
      .get(`/api/patients/${patientObj._id}/medical-records`)
      .set('Authorization', `Bearer ${doctor2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized|Access forbidden/i);
  });

  it('CRITICAL: Front Desk attempting to access restricted clinical medical records must receive 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientObj._id}/medical-records`)
      .set('Authorization', `Bearer ${frontDeskToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Access forbidden|permission/i);
  });

  it('CRITICAL: Front Desk attempting to create clinical visit notes must receive 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        appointmentId: appointmentObj._id,
        patientId: patientObj._id,
        consultationNotes: 'Illegitimate clinical note from front desk'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('CRITICAL: Front Desk attempting to access audit logs must receive 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${frontDeskToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Admin must be granted access to administrative reports and audit logs', async () => {
    const reportRes = await request(app)
      .get('/api/reports/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);

    const auditRes = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
  });
});
