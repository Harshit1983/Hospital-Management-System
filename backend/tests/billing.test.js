const request = require('supertest');
const app = require('../app');
const { createTestUser } = require('./helpers');
require('./setup');

describe('Billing, Invoice Calculation & Payment Idempotency (/api/invoices, /api/payments)', () => {
  let frontDeskToken;
  let patientObj;

  beforeEach(async () => {
    const fd = await createTestUser({ email: 'fd.billing@hospital.demo', role: 'FRONT_DESK' });
    frontDeskToken = fd.token;

    const pRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ name: 'Billing Patient', dateOfBirth: '1995-10-10', gender: 'MALE', phone: '+1-555-6666' });
    patientObj = pRes.body.data;
  });

  it('CRITICAL: must correctly calculate item totals, subtotal, tax, discount and final totalAmount on backend', async () => {
    const invoicePayload = {
      patientId: patientObj._id,
      items: [
        { description: 'Specialist Consultation', quantity: 1, unitPrice: 150 },
        { description: 'CBC Diagnostic Panel', quantity: 2, unitPrice: 30 }
      ],
      tax: 10, // 10%
      discount: 10 // $10 discount
    };

    // Subtotal: (1 * 150) + (2 * 30) = 210
    // Tax: 10% of 210 = 21.00
    // Discount: 10
    // TotalAmount: 210 + 21 - 10 = 221.00

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send(invoicePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subtotal).toBe(210);
    expect(res.body.data.tax).toBe(21);
    expect(res.body.data.discount).toBe(10);
    expect(res.body.data.totalAmount).toBe(221);
    expect(res.body.data.paymentStatus).toBe('PENDING');
  });

  it('CRITICAL: should record simulated payment, update invoice paidAmount, and update status to PARTIALLY_PAID then PAID', async () => {
    // 1. Create $100 invoice
    const invRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        patientId: patientObj._id,
        items: [{ description: 'General Checkup', quantity: 1, unitPrice: 100 }],
        tax: 0,
        discount: 0
      });

    const invoiceId = invRes.body.data._id;

    // 2. Pay $40 partial payment
    const partialPayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        invoiceId,
        amount: 40,
        paymentMethod: 'CASH',
        transactionReference: 'TXN-PARTIAL-001'
      });

    expect(partialPayRes.status).toBe(201);
    expect(partialPayRes.body.data.invoice.paidAmount).toBe(40);
    expect(partialPayRes.body.data.invoice.paymentStatus).toBe('PARTIALLY_PAID');

    // 3. Pay remaining $60
    const finalPayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        invoiceId,
        amount: 60,
        paymentMethod: 'CARD_SIMULATED',
        transactionReference: 'TXN-FINAL-002'
      });

    expect(finalPayRes.status).toBe(201);
    expect(finalPayRes.body.data.invoice.paidAmount).toBe(100);
    expect(finalPayRes.body.data.invoice.paymentStatus).toBe('PAID');
  });

  it('CRITICAL: should prevent duplicate payment processing via idempotency key (transactionReference)', async () => {
    const invRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        patientId: patientObj._id,
        items: [{ description: 'Test Procedure', quantity: 1, unitPrice: 100 }],
        tax: 0,
        discount: 0
      });

    const invoiceId = invRes.body.data._id;
    const sameRef = 'IDEMPOTENT-REF-UNIQUE-999';

    // First attempt succeeds
    const firstPay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        invoiceId,
        amount: 50,
        paymentMethod: 'UPI_SIMULATED',
        transactionReference: sameRef
      });

    expect(firstPay.status).toBe(201);

    // Duplicate attempt with the exact same transactionReference MUST be rejected (409 Conflict)!
    const duplicatePay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({
        invoiceId,
        amount: 50,
        paymentMethod: 'UPI_SIMULATED',
        transactionReference: sameRef
      });

    expect(duplicatePay.status).toBe(409);
    expect(duplicatePay.body.success).toBe(false);
    expect(duplicatePay.body.message).toMatch(/already been processed/i);
  });
});

