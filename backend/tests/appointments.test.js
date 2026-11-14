const request = require('supertest');
const app = require('../app');
const { createTestUser, createTestDoctor } = require('./helpers');
require('./setup');

describe('Appointment Booking & Anti-Double Booking Engine (/api/appointments)', () => {
  let frontDeskToken;
  let doctorObj;
  let departmentObj;
  let patientObj;

  beforeEach(async () => {
    const fd = await createTestUser({ email: 'fd.appt@hospital.demo', role: 'FRONT_DESK' });
    frontDeskToken = fd.token;

    const docSetup = await createTestDoctor({ email: 'doctor.appt@hospital.demo' });
    doctorObj = docSetup.doctor;
    departmentObj = docSetup.department;

    // Create a patient
    const patientRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        name: 'Penelope Clearwater',
        dateOfBirth: '1990-05-15',
        gender: 'FEMALE',
        phone: '+1-555-8888'
      });

    patientObj = patientRes.body.data;
  });

  it('should generate doctor working slots correctly for a given weekday', async () => {
    // Pick next Monday
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/appointments/slots?doctorId=${doctorObj._id}&date=${dateStr}`)
      .set('Authorization', `Bearer ${frontDeskToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    expect(res.body.data.slots[0].startTime).toBe('09:00');
    expect(res.body.data.slots[0].isAvailable).toBe(true);
  });

  it('should successfully book an appointment in an available slot', async () => {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const bookingPayload = {
      patientId: patientObj._id,
      doctorId: doctorObj._id,
      departmentId: departmentObj._id,
      appointmentDate: dateStr,
      startTime: '09:00',
      endTime: '09:30',
      reason: 'General cardiology health check'
    };

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send(bookingPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('BOOKED');
    expect(res.body.data.startTime).toBe('09:00');
  });

  it('CRITICAL: should prevent double booking for the same doctor and same slot (409 Conflict)', async () => {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const bookingPayload = {
      patientId: patientObj._id,
      doctorId: doctorObj._id,
      departmentId: departmentObj._id,
      appointmentDate: dateStr,
      startTime: '10:00',
      endTime: '10:30',
      reason: 'First booking request'
    };

    // First booking must succeed
    const firstRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send(bookingPayload);

    expect(firstRes.status).toBe(201);

    // Second booking attempt for the exact same doctor and slot MUST be rejected!
    const secondRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        ...bookingPayload,
        reason: 'Conflicting second booking attempt'
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.message).toMatch(/Double booking prevented|conflict|already booked/i);
  });

  it('CRITICAL: should handle simultaneous concurrent booking requests safely', async () => {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const bookingPayload = {
      patientId: patientObj._id,
      doctorId: doctorObj._id,
      departmentId: departmentObj._id,
      appointmentDate: dateStr,
      startTime: '11:00',
      endTime: '11:30',
      reason: 'Concurrent race condition test'
    };

    // Dispatch two requests concurrently
    const [req1, req2] = await Promise.all([
      request(app).post('/api/appointments').set('Authorization', `Bearer ${frontDeskToken}`).send(bookingPayload),
      request(app).post('/api/appointments').set('Authorization', `Bearer ${frontDeskToken}`).send(bookingPayload)
    ]);

    const statuses = [req1.status, req2.status].sort();
    // Exactly one should succeed (201) and one should be rejected with conflict (409)
    expect(statuses).toEqual([201, 409]);
  });

  it('CRITICAL: cancelled slot becomes available again for another patient', async () => {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const bookingPayload = {
      patientId: patientObj._id,
      doctorId: doctorObj._id,
      departmentId: departmentObj._id,
      appointmentDate: dateStr,
      startTime: '14:00',
      endTime: '14:30',
      reason: 'Initial booking to be cancelled'
    };

    // 1. Book slot
    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send(bookingPayload);

    expect(bookRes.status).toBe(201);
    const apptId = bookRes.body.data._id;

    // 2. Cancel appointment
    const cancelRes = await request(app)
      .patch(`/api/appointments/${apptId}/cancel`)
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ reason: 'Patient requested cancellation' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // 3. Re-book the same slot for another patient - MUST SUCCEED now!
    const rebookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        ...bookingPayload,
        reason: 'New patient booking freed slot'
      });

    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.data.status).toBe('BOOKED');
  });

  it('should reject invalid rescheduling to an occupied slot', async () => {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    // Slot A (09:00)
    const apptA = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        patientId: patientObj._id,
        doctorId: doctorObj._id,
        departmentId: departmentObj._id,
        appointmentDate: dateStr,
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Slot A'
      });

    // Slot B (09:30)
    const apptB = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        patientId: patientObj._id,
        doctorId: doctorObj._id,
        departmentId: departmentObj._id,
        appointmentDate: dateStr,
        startTime: '09:30',
        endTime: '10:00',
        reason: 'Slot B'
      });

    // Try to reschedule Appt A into Slot B (which is already booked!)
    const rescheduleRes = await request(app)
      .put(`/api/appointments/${apptA.body.data._id}/reschedule`)
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        newDate: dateStr,
        newStartTime: '09:30',
        newEndTime: '10:00',
        reason: 'Reschedule attempt to taken slot'
      });

    expect(rescheduleRes.status).toBe(409);
    expect(rescheduleRes.body.success).toBe(false);
  });
});

