const { Invoice, Payment, Patient, Appointment } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { generateInvoiceNumber, calculateInvoiceTotals } = require('../services/billingService');
const { logAudit } = require('../services/auditService');
const { AUDIT_ACTIONS, PAYMENT_STATUS } = require('../config/constants');

const createInvoice = async (req, res, next) => {
  try {
    const { patientId, appointmentId, items, tax = 0, discount = 0, dueDate, notes } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return errorResponse(res, 'Patient not found', 404);
    }

    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return errorResponse(res, 'Associated appointment not found', 404);
      }
    }

    // Backend-enforced calculations
    const calculated = calculateInvoiceTotals(items, tax, discount);
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      appointmentId: appointmentId || null,
      items: calculated.items,
      subtotal: calculated.subtotal,
      tax: calculated.tax,
      discount: calculated.discount,
      totalAmount: calculated.totalAmount,
      paidAmount: 0,
      paymentStatus: PAYMENT_STATUS.PENDING,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: notes ? notes.trim() : ''
    });

    await logAudit({
      user: req.user,
      action: AUDIT_ACTIONS.INVOICE_CREATE,
      entityType: 'Invoice',
      entityId: invoice._id,
      details: {
        invoiceNumber,
        patientId,
        totalAmount: calculated.totalAmount
      },
      ipAddress: req.ip
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('patientId', 'name patientId phone email address')
      .populate('appointmentId');

    return successResponse(res, 'Invoice generated successfully', populated, 201);
  } catch (error) {
    next(error);
  }
};

const getAllInvoices = async (req, res, next) => {
  try {
    const { paymentStatus, patientId, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (patientId) filter.patientId = patientId;

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('patientId', 'name patientId phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(filter)
    ]);

    return successResponse(res, 'Invoices retrieved successfully', invoices, 200, {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id)
      .populate('patientId', 'name patientId phone email address emergencyContact')
      .populate('appointmentId');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    const payments = await Payment.find({ invoiceId: id }).sort({ paidAt: -1 });

    return successResponse(res, 'Invoice details retrieved', {
      invoice,
      payments
    });
  } catch (error) {
    next(error);
  }
};

const getInvoicesByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const invoices = await Invoice.find({ patientId }).sort({ createdAt: -1 });
    return successResponse(res, 'Patient invoices retrieved', invoices);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getInvoicesByPatient
};

