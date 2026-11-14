const { Payment } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { processSimulatedPayment } = require('../services/billingService');

const recordPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionReference, notes } = req.body;

    const result = await processSimulatedPayment({
      invoiceId,
      amount,
      paymentMethod,
      transactionReference,
      notes,
      user: req.user,
      ipAddress: req.ip
    });

    return successResponse(res, 'Simulated payment recorded and invoice updated successfully', result, 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getPaymentsByInvoice = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const payments = await Payment.find({ invoiceId }).sort({ paidAt: -1 });
    return successResponse(res, 'Invoice payments retrieved', payments);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordPayment,
  getPaymentsByInvoice
};

