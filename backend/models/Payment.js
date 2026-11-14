const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required'],
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero']
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['CASH', 'CARD_SIMULATED', 'UPI_SIMULATED']
    },
    transactionReference: {
      type: String,
      required: [true, 'Transaction reference is required for idempotency'],
      unique: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'],
      default: 'SUCCESS',
      index: true
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ invoiceId: 1, createdAt: -1 });
paymentSchema.index({ paidAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

