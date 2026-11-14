const request = require('supertest');
const app = require('../app');
const { createTestUser, createTestDoctor } = require('./helpers');
const { AuditLog } = require('../models');
require('./setup');

describe('Compliance Audit Trail API (/api/audit-logs)', () => {
  let adminToken;
  let frontDeskToken;
  let doctorObj;
  let departmentObj;

  beforeEach(async () => {
    const adm = await createTestUser({ email: 'admin.audit@hospital.demo', role: 'ADMIN' });
    adminToken = adm.token;

    const fd = await createTestUser({ email: 'fd.audit@hospital.demo', role: 'FRONT_DESK' });
    frontDeskToken = fd.token;

    const docSetup = await createTestDoctor({ email: 'doctor.audit@hospital.demo' });
    doctorObj = docSetup.doctor;
    departmentObj = docSetup.department;
  });

  it('should generate an audit entry when a patient is created and accessed', async () => {
    // 1. Create Patient
    const pRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'Audit Test Patient', dateOfBirth: '1991-03-12', gender: 'FEMALE', phone: '+1-555-3333' });

    expect(pRes.status).toBe(201);
    const patientId = pRes.body.data._id;

    // Check that PATIENT_CREATE audit log was generated
    const createLog = await AuditLog.findOne({
      action: 'PATIENT_CREATE',
      entityId: String(patientId)
    });
    expect(createLog).not.toBeNull();
    expect(createLog.userRole).toBe('FRONT_DESK');

    // 2. Access Patient details
    await request(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${frontDeskToken}`);

    // Check that PATIENT_RECORD_ACCESS audit log was generated
    const accessLog = await AuditLog.findOne({
      action: 'PATIENT_RECORD_ACCESS',
      entityId: String(patientId)
    });
    expect(accessLog).not.toBeNull();
  });

  it('should allow admin to filter and retrieve audit trails', async () => {
    // Perform an audited action
    await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'Trail Patient', dateOfBirth: '1989-09-09', gender: 'MALE', phone: '+1-555-2222' });

    const auditRes = await request(app)
      .get('/api/audit-logs?action=PATIENT_CREATE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
    expect(auditRes.body.data[0].action).toBe('PATIENT_CREATE');
  });
});

