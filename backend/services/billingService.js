const { Invoice, Payment } = require('../models');
const { PAYMENT_STATUS, AUDIT_ACTIONS } = require('../config/constants');
const { logAudit } = require('./auditService');

/**
 * Generate sequential invoice number: INV-YYYY-XXXX
 */
const generateInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  const sequence = String(count + 1).padStart(5, '0');
  return `INV-${currentYear}-${sequence}`;
};

/**
 * Calculate invoice totals strictly on backend
 */
const calculateInvoiceTotals = (items, taxPercent = 0, discountAmount = 0) => {
  const processedItems = items.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const itemTotal = Number((qty * price).toFixed(2));
    return {
      description: item.description,
      quantity: qty,
      unitPrice: price,
      total: itemTotal
    };
  });

  const subtotal = processedItems.reduce((acc, curr) => acc + curr.total, 0);
  const calculatedTax = Number(((subtotal * (Number(taxPercent) || 0)) / 100).toFixed(2));
  const validDiscount = Math.min(Number(discountAmount) || 0, subtotal + calculatedTax);
  const totalAmount = Number((subtotal + calculatedTax - validDiscount).toFixed(2));

  return {
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    tax: calculatedTax,
    discount: Number(validDiscount.toFixed(2)),
    totalAmount
  };
};

/**
 * Record a simulated payment with idempotency & reconciliation
 */
const processSimulatedPayment = async ({
  invoiceId,
  amount,
  paymentMethod,
  transactionReference,
  notes = '',
  user,
  ipAddress
}) => {
  // 1. Idempotency check: prevent duplicate transactions
  const existingPayment = await Payment.findOne({ transactionReference });
  if (existingPayment) {
    const dupError = new Error(`Payment with transaction reference '${transactionReference}' has already been processed.`);
    dupError.statusCode = 409;
    throw dupError;
  }

  // 2. Fetch target invoice
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const notFound = new Error('Invoice not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  if (invoice.paymentStatus === PAYMENT_STATUS.PAID) {
    const err = new Error('Invoice is already fully paid');
    err.statusCode = 400;
    throw err;
  }

  const payAmount = Number(Number(amount).toFixed(2));
  const remainingDue = Number((invoice.totalAmount - (invoice.paidAmount || 0)).toFixed(2));

  if (payAmount > remainingDue) {
    const err = new Error(`Payment amount ($${payAmount}) exceeds the remaining balance ($${remainingDue})`);
    err.statusCode = 400;
    throw err;
  }

  // 3. Create payment record
  const payment = await Payment.create({
    invoiceId: invoice._id,
    patientId: invoice.patientId,
    amount: payAmount,
    paymentMethod,
    transactionReference,
    status: 'SUCCESS',
    paidAt: new Date(),
    notes
  });

  // 4. Update Invoice state & reconcile
  invoice.paidAmount = Number(((invoice.paidAmount || 0) + payAmount).toFixed(2));
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.paymentStatus = PAYMENT_STATUS.PAID;
  } else if (invoice.paidAmount > 0) {
    invoice.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
  }
  await invoice.save();

  // 5. Audit Log
  await logAudit({
    user,
    action: AUDIT_ACTIONS.PAYMENT_RECORD,
    entityType: 'Payment',
    entityId: payment._id,
    details: {
      invoiceId: invoice._id,
      amount: payAmount,
      paymentMethod,
      transactionReference,
      newPaymentStatus: invoice.paymentStatus
    },
    ipAddress
  });

  return {
    payment,
    invoice
  };
};

module.exports = {
  generateInvoiceNumber,
  calculateInvoiceTotals,
  processSimulatedPayment
};

